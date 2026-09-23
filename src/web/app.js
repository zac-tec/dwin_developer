import html2canvas from "/vendor/html2canvas/html2canvas.esm.js";
const $ = (id) => document.getElementById(id);
let project,
  pages = [],
  selected = 0,
  busy = false,
  renderedSize;
const status = (text, error = false) => {
  for (const id of ["status", "action-status"]) {
    $(id).textContent = text;
    $(id).classList.toggle("error", error);
  }
};
function setBusy(value) {
  busy = value;
  document.body.classList.toggle("busy", value);
  for (const id of [
    "folder",
    "demo",
    "demo-empty",
    "width",
    "height",
    "preset",
  ])
    $(id).disabled = value;
  $("render").disabled = value || !project;
  $("export").disabled =
    value || !pages.some((p) => p.included) || !renderedSize;
}
async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(180000),
    });
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      throw new Error(
        "The server did not respond within 3 minutes. Check its Terminal for errors. The server may still be processing this request.",
      );
    }
    throw new Error(
      "Cannot reach the app server. Keep npm start running in Terminal, then reload this page.",
    );
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error ||
        `Server request failed (${response.status}). Check Terminal for details.`,
    );
  }
  return response;
}

const json = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
function gcd(a, b) {
  return b ? gcd(b, a % b) : a;
}
function dimensionsChanged() {
  const width = Number($("width").value),
    height = Number($("height").value);
  const divisor = gcd(width, height);
  $("ratio").textContent = divisor
    ? `${width / divisor} : ${height / divisor}`
    : "—";
  $("size-chip").textContent = `${width} × ${height} px`;
  if (renderedSize) {
    renderedSize = null;
    pages = [];
    drawPages();
    status(
      "Dimensions changed. Render again to update the preview and export.",
    );
  }
  setBusy(busy);
}
$("preset").onchange = () => {
  if ($("preset").value !== "custom") {
    const [w, h] = $("preset").value.split(",");
    $("width").value = w;
    $("height").value = h;
    dimensionsChanged();
  }
};
for (const id of ["width", "height"])
  $(id).oninput = () => {
    $("preset").value = "custom";
    dimensionsChanged();
  };
$("quality").oninput = () =>
  ($("quality-value").textContent = `${$("quality").value}%`);
async function imported(response) {
  project = await response.json();
  pages = [];
  renderedSize = null;
  drawPages();
  $("source-info").textContent =
    `${project.fileCount} files imported · ${project.pages.length} HTML pages found`;
  status("Website imported. Choose your dimensions, then render pages.");
}
$("folder").onchange = async (event) => {
  const files = [...event.target.files];
  if (!files.length) return;
  setBusy(true);
  status("Importing website folder…");
  try {
    const form = new FormData();
    const names = files.map(
      (f) => f.webkitRelativePath.split("/").slice(1).join("/") || f.name,
    );
    form.append("paths", JSON.stringify(names));
    files.forEach((f) => form.append("files", f, f.name));
    await imported(
      await request("/api/projects", { method: "POST", body: form }),
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    setBusy(false);
    $("folder").value = "";
  }
};
async function demo() {
  setBusy(true);
  status("Loading sample project…");
  try {
    await imported(await request("/api/demo", { method: "POST" }));
    $("preset").value = "800,480";
    $("width").value = 800;
    $("height").value = 480;
    dimensionsChanged();
    setBusy(false);
    await render();
  } catch (error) {
    status(error.message, true);
  } finally {
    setBusy(false);
  }
}
$("demo").onclick = demo;
$("demo-empty").onclick = demo;
async function capturePage(source, width, height) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.src = `/preview/${project.id}/${source}`;
    iframe.width = width;
    iframe.height = height;
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.scrolling = "no";
    iframe.tabIndex = -1;
    iframe.sandbox = "allow-same-origin";
    let done = false;
    const fail = (msg) => {
      if (!done) {
        done = true;
        iframe.remove();
        reject(new Error(msg));
      }
    };
    const succeed = (data) => {
      if (!done) {
        done = true;
        iframe.remove();
        resolve(data);
      }
    };
    const timeout = setTimeout(
      () => fail("Rendering timed out. Reload the app and try again."),
      15000,
    );
    iframe.onload = async () => {
      try {
        const win = iframe.contentWindow;
        const doc = win.document;
        if (!doc)
          throw new Error(
            "Cannot access iframe content. Check that the preview CSP allows frame-ancestors 'self'.",
          );
        if (doc.fonts) {
          try {
            await Promise.race([
              doc.fonts.ready,
              new Promise((r) => setTimeout(r, 5000)),
            ]);
          } catch {
            // Fonts may not be ready; continue.
          }
        }
        const images = [...doc.images];
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise((r) => {
              img.onload = img.onerror = r;
              setTimeout(r, 5000);
            });
          }),
        );
        await new Promise((r) => setTimeout(r, 200));
        const canvas = await html2canvas(doc.documentElement, {
          width: width,
          height: height,
          scale: 1,
          useXHR: true,
          allowTainted: false,
          backgroundColor: null,
          logging: false,
          letterRendering: true,
        });
        const png = canvas.toDataURL("image/png");
        const title = doc.title || "";
        const overflowX =
          Math.max(
            doc.documentElement.scrollWidth,
            doc.body?.scrollWidth || 0,
          ) > width;
        const overflowY =
          Math.max(
            doc.documentElement.scrollHeight,
            doc.body?.scrollHeight || 0,
          ) > height;
        const warnings = [];
        if (overflowX || overflowY)
          warnings.push(
            `Content overflows ${[overflowX && "width", overflowY && "height"].filter(Boolean).join(" and ")}; export captures only the screen area.`,
          );
        const brokenImages = images.filter(
          (i) => !i.complete || !i.naturalWidth,
        ).length;
        if (brokenImages)
          warnings.push(`${brokenImages} image(s) did not load.`);
        clearTimeout(timeout);
        succeed({ title, warnings, png });
      } catch (error) {
        fail(error.message || "Page capture failed.");
      }
    };
    iframe.onerror = () => fail("Failed to load page for capture.");
    document.body.appendChild(iframe);
  });
}
async function render() {
  if (!project || busy) return;
  const width = Number($("width").value);
  const height = Number($("height").value);
  setBusy(true);
  status(
    `Rendering ${project.pages.length} pages at ${width} × ${height}…`,
  );
  try {
    const captured = [];
    for (const [index, source] of project.pages.entries()) {
      status(
        `Rendering page ${index + 1} of ${project.pages.length}: ${source}`,
      );
      captured.push({
        id: index,
        source,
        ...(await capturePage(source, width, height)),
      });
    }
    const data = await (
      await request(`/api/projects/${project.id}/capture`, json({ width, height, pages: captured }))
    ).json();
    pages = data.pages.map((p) => ({ ...p, included: true }));
    renderedSize = { width: data.width, height: data.height };
    selected = pages[0]?.id ?? 0;
    drawPages();
    status(
      `Rendered ${pages.length} pages. Review the preview and export below.`,
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    setBusy(false);
  }
}
$("render").onclick = render;
function drawPages() {
  $("pages").replaceChildren();
  $("page-count").textContent = pages.length;
  $("empty").hidden = !!pages.length;
  $("screen-wrap").hidden = !pages.length;
  $("warnings").replaceChildren();
  if (!pages.length) {
    const el = document.createElement("div");
    el.className = "pages-empty";
    el.textContent = "Your rendered pages will appear here.";
    $("pages").append(el);
    $("preview-name").textContent = "No page selected";
    return;
  }
  pages.forEach((page, index) => {
    const card = document.createElement("div");
    card.className = `page-card${page.id === selected ? " active" : ""}`;
    const button = document.createElement("button");
    button.className = "page-select";
    button.title = `Preview ${page.source}`;
    const img = document.createElement("img");
    img.src = page.preview;
    img.alt = page.title || page.source;
    const title = document.createElement("strong");
    title.textContent = `${String(index).padStart(2, "0")} · ${page.title || page.source}`;
    button.append(img, title);
    button.onclick = () => {
      selected = page.id;
      drawPages();
    };
    const controls = document.createElement("div");
    controls.className = "page-tools";
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = page.included;
    checkbox.onchange = () => {
      page.included = checkbox.checked;
      setBusy(busy);
    };
    label.append(checkbox, "Include");
    controls.append(label);
    for (const [delta, text] of [
      [-1, "←"],
      [1, "→"],
    ]) {
      const move = document.createElement("button");
      move.textContent = text;
      move.title = delta < 0 ? "Move earlier" : "Move later";
      move.setAttribute("aria-label", `${move.title}: ${page.source}`);
      move.disabled = index + delta < 0 || index + delta >= pages.length;
      move.onclick = () => {
        [pages[index], pages[index + delta]] = [
          pages[index + delta],
          pages[index],
        ];
        drawPages();
      };
      controls.append(move);
    }
    card.append(button, controls);
    $("pages").append(card);
  });
  const current = pages.find((p) => p.id === selected) || pages[0];
  $("screen").src = current.preview;
  $("screen").alt =
    `${current.source} at ${renderedSize.width} by ${renderedSize.height} pixels`;
  $("preview-name").textContent = current.source;
  for (const warning of current.warnings) {
    const p = document.createElement("p");
    p.textContent = warning;
    $("warnings").append(p);
  }
}
$("export").onclick = async () => {
  setBusy(true);
  status("Preparing PNGs, JPEGs and page manifest…");
  try {
    const response = await request(
      `/api/projects/${project.id}/export`,
      json({
        pages: pages.filter((p) => p.included).map((p) => p.id),
        quality: Number($("quality").value),
      }),
    );
    const url = URL.createObjectURL(await response.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "dwin-background-assets.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    status(
      "Assets downloaded. Use DWIN's ICL generator to create 32.icl from the numbered images.",
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    setBusy(false);
  }
};

status("Ready. Choose a website folder or load the sample project.");
