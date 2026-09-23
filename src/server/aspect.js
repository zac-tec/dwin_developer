export function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}

export function ratioLabel(width, height) {
  const divisor = gcd(width, height);
  return `${width / divisor} : ${height / divisor}`;
}

function sameShape(a, b) {
  return Math.abs(a.width / a.height - b.width / b.height) < 0.01;
}

export function aspectMismatch(design, frame) {
  if (!design) {
    return {
      matches: null,
      short:
        "Design size is unknown. The frame will not rewrite this layout.",
      detail:
        "No design size was found in a dwin-design-size tag or a fixed page size. Add that tag, or keep the frame at the size the site was written for.",
    };
  }
  if (sameShape(design, frame)) return { matches: true };
  return {
    matches: false,
    short: `Aspect ratio does not match. This site is designed for ${design.width} × ${design.height} (${ratioLabel(design.width, design.height)}). You selected ${frame.width} × ${frame.height} (${ratioLabel(frame.width, frame.height)}). The layout will not change by itself.`,
    detail:
      "You will get empty bars, or a stretched or cropped picture, if this frame is forced to the new size. Switch back to the design size to view it as designed. To actually change the website, copy the rewrite prompt and give it to an AI together with your HTML and CSS.",
  };
}

function readMetaSize(html) {
  const tag = html.match(/<meta[^>]+name=["']dwin-design-size["'][^>]*>/i);
  if (!tag) return null;
  const content = tag[0].match(/content=["'](\d+)\s*,\s*(\d+)["']/i);
  if (!content) return null;
  const width = Number(content[1]);
  const height = Number(content[2]);
  if (width < 64 || height < 64 || width > 1920 || height > 1920) return null;
  return { width, height, source: "meta" };
}

function readCssBox(css) {
  const candidates = [];
  for (const block of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const width = block[2].match(/(?:^|;)\s*width\s*:\s*(\d{2,4})px/i);
    const height = block[2].match(/(?:^|;)\s*height\s*:\s*(\d{2,4})px/i);
    if (!width || !height) continue;
    const size = { width: Number(width[1]), height: Number(height[1]) };
    if (size.width < 64 || size.height < 64) continue;
    const name = block[1].toLowerCase();
    const score =
      (name.includes(".screen") ? 4 : 0) +
      (name.includes("body") ? 3 : 0) +
      (name.includes("html") ? 2 : 0);
    if (score) candidates.push({ ...size, score });
  }
  candidates.sort(
    (a, b) => b.score - a.score || b.width * b.height - a.width * a.height,
  );
  return candidates[0]
    ? {
        width: candidates[0].width,
        height: candidates[0].height,
        source: "css",
      }
    : null;
}

export function detectDesignSize({ html = "", css = "" } = {}) {
  return readMetaSize(html) || readCssBox(css) || readCssBox(html);
}

export function rewritePrompt(design, frame) {
  const current = design
    ? `${design.width} × ${design.height} pixels (aspect ${ratioLabel(design.width, design.height)})`
    : "unknown — detect it from the attached CSS before rewriting";
  const next = `${frame.width} × ${frame.height} pixels`;
  return `Rewrite this static multi-page website so it is designed for a new exact screen size.

Current design size: ${current}.
New design size: ${next}.

Rules:
- Change the real layout. Do not only scale, zoom, or wrap the old page in a frame.
- One HTML file remains one screen. Keep the same pages, text, colors, links, and reading order unless a control must move to fit.
- The visible screen must be exactly the new width and height. Use overflow: hidden. Nothing important may sit outside that box.
- The outer page must not add scrollbars, centering space, or a decorative border that makes the page larger than the new size. If you keep a bezel, it must be inside the target pixels.
- Update every hardcoded size, including .screen, title bar, nav bar, content height calculations, fonts, padding, and positions. Do not leave the old pixel sizes in layout math.
- Keep it static: relative local CSS only, no JavaScript, no CDN, no new fonts, no external images.
- Do not make it responsive to a desktop browser window. Lock it to the new pixel size.
- If the new shape is very different, especially portrait versus landscape, rearrange the title, content, and buttons so they still fit. Do not shrink text until it is unreadable.
- Add this exact tag in the head of every HTML page, with the new size:
  <meta name="dwin-design-size" content="${frame.width},${frame.height}">
- Return the complete updated files, not a diff. List any text or control that no longer fits.`;
}
