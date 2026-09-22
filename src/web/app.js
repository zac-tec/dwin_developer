const $ = (id) => document.getElementById(id);
let project,
  pages = [],
  selected = 0,
  busy = false,
  renderedSize;
const status = (text, error = false) => {
  $("status").textContent = text;
  $("status").classList.toggle("error", error);
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
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Request failed");
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
async function render() {
  if (!project || busy) return;
  setBusy(true);
  status(
    `Rendering ${project.pages.length} pages at ${$("width").value} × ${$("height").value}…`,
  );
  try {
    const data = await (
      await request(
        `/api/projects/${project.id}/render`,
        json({
          width: Number($("width").value),
          height: Number($("height").value),
        }),
      )
    ).json();
    pages = data.pages.map((p) => ({ ...p, included: true }));
    renderedSize = { width: data.width, height: data.height };
    selected = pages[0].id;
    drawPages();
    status(
      `Rendered ${pages.length} pages. Review the preview and export order below.`,
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
      "Assets downloaded. Use DWIN’s ICL generator to create 32.icl from the numbered images.",
    );
  } catch (error) {
    status(error.message, true);
  } finally {
    setBusy(false);
  }
};
