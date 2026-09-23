import express from "express";
import multer from "multer";
import path from "node:path";
import os from "node:os";
import {
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  readdir,
  readFile,
} from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { safePath, dimensions, pageFiles, mime } from "./project.js";
import { detectDesignSize, aspectMismatch } from "./aspect.js";
import { exportImages } from "./export.js";
const repo = fileURLToPath(new URL("../../", import.meta.url));
const app = express();
const projects = new Map();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 250,
    fileSize: 10 * 1024 * 1024,
    fields: 1,
    fieldSize: 100000,
  },
});
app.disable("x-powered-by");
app.use((req, res, next) => {
  const host = req.headers.host || "";
  if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host))
    return res.status(403).json({ error: "Local development access only." });
  if (req.headers.origin && req.headers.origin !== `http://${host}`)
    return res
      .status(403)
      .json({ error: "Cross-origin requests are not allowed." });
  res.set("X-Content-Type-Options", "nosniff");
  next();
});
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(repo, "src/web")));
app.use(
  "/vendor/html2canvas",
  express.static(path.join(repo, "node_modules/html2canvas/dist")),
);
async function createProject(entries) {
  if (
    !entries.length ||
    entries.reduce((n, e) => n + e.data.length, 0) > 50 * 1024 * 1024
  )
    throw new Error("Upload up to 50 MB of website files.");
  const files = entries.map((e) => safePath(e.name));
  if (new Set(files).size !== files.length)
    throw new Error("Duplicate file paths are not allowed.");
  const pages = pageFiles(files);
  if (!pages.length)
    throw new Error("No HTML pages found. Upload a static website folder.");
  if (pages.length > 30) throw new Error("Use up to 30 HTML pages per project.");
  const root = await mkdtemp(path.join(os.tmpdir(), "dwin-developer-"));
  try {
    for (const e of entries) {
      const dest = path.join(root, e.name);
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, e.data);
    }
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  const id = randomUUID();
  const project = {
    id,
    root,
    files,
    pages,
    rendered: [],
    created: Date.now(),
    busy: false,
  };
  projects.set(id, project);
  return { id, pages, fileCount: files.length };
}
app.post(
  "/api/projects",
  upload.array("files", 250),
  async (req, res, next) => {
    try {
      const names = JSON.parse(req.body.paths || "[]");
      if (!Array.isArray(names) || names.length !== req.files.length)
        throw new Error("File paths do not match uploaded files.");
      res.json(
        await createProject(
          req.files.map((f, i) => ({ name: names[i], data: f.buffer })),
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);
app.post("/api/demo", async (req, res, next) => {
  try {
    const base = path.join(repo, "examples/control-panel");
    const names = (
      await readdir(base, { recursive: true, withFileTypes: true })
    )
      .filter((e) => e.isFile())
      .map((e) => path.relative(base, path.join(e.parentPath, e.name)));
    res.json(
      await createProject(
        await Promise.all(
          names.map(async (name) => ({
            name,
            data: await readFile(path.join(base, name)),
          })),
        ),
      ),
    );
  } catch (error) {
    next(error);
  }
});
app.param("id", (req, res, next, id) => {
  req.project = projects.get(id);
  if (!req.project)
    return res
      .status(404)
      .json({ error: "Project expired. Upload your folder again." });
  next();
});

// Serve uploaded website files for in-browser preview via an iframe.
// CSP blocks scripts and external resources, matching the previous
// server-side security model.
const PREVIEW_CSP =
  "default-src 'self'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; frame-ancestors 'self';";
app.use("/preview", async (req, res, next) => {
  const parts = req.path.split("/").filter(Boolean);
  const id = parts[0];
  const rest = parts.slice(1).join("/");
  if (!id || !rest) return res.status(404).send("Project or file not found.");
  try {
    const project = projects.get(id);
    if (!project)
      return res.status(404).send("Project expired. Upload your folder again.");
    const asset = safePath(decodeURIComponent(rest));
    if (!project.files.includes(asset))
      return res.status(404).send("File not found in project.");
    const filePath = path.join(project.root, asset);
    res.set({
      "Content-Type": mime(asset),
      "Content-Security-Policy": PREVIEW_CSP,
      "Cache-Control": "no-store",
    });
    if (/\.html?$/i.test(asset)) {
      const html = await readFile(filePath, "utf-8");
      const baseTag = `<base href="/preview/${id}/">`;
      const animStyle =
        '<style id="dwin-capture-style">*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}</style>';
      const modified = html
        .replace(/(<head[^>]*>)/i, `$1${baseTag}${animStyle}`)
        .replace(/<body/i, '<body data-dwin-capture="1"');
      res.send(modified);
    } else {
      res.sendFile(filePath);
    }
  } catch (error) {
    next(error);
  }
});

// Receive browser-captured images. The frontend renders each page inside a
// same-origin iframe, captures it with html2canvas, and uploads the PNG here.
app.post("/api/projects/:id/capture", async (req, res, next) => {
  const project = req.project;
  if (project.busy)
    return res
      .status(409)
      .json({ error: "This project is already rendering." });
  project.busy = true;
  try {
    const size = dimensions(req.body.width, req.body.height);
    const captured = [];
    for (const entry of req.body.pages) {
      if (
        entry.id < 0 ||
        entry.id >= project.pages.length ||
        !project.pages.includes(entry.source)
      )
        throw new Error(`Invalid page id or source: ${entry.source}`);
      if (typeof entry.png !== "string" || !entry.png.startsWith("data:image"))
        throw new Error("Missing or invalid PNG data for page capture.");
      const png = Buffer.from(
        entry.png.replace(/^data:image\/png;base64,/, ""),
        "base64",
      );
      let warnings = [...(entry.warnings || [])];
      try {
        const htmlContent = await readFile(
          path.join(project.root, entry.source),
          "utf-8",
        );
        const cssFiles = project.files.filter((f) => /\.css$/i.test(f));
        const cssContents = await Promise.all(
          cssFiles.map((f) =>
            readFile(path.join(project.root, f), "utf-8").catch(() => ""),
          ),
        );
        const design = detectDesignSize({
          html: htmlContent,
          css: cssContents.join("\n"),
        });
        const mismatch = aspectMismatch(design, size);
        if (mismatch.matches === false && mismatch.short)
          warnings.push(mismatch.short);
      } catch {
        // Design-size detection is best-effort; skip on any read error.
      }
      captured.push({
        id: entry.id,
        source: entry.source,
        title: entry.title || "",
        png,
        warnings,
      });
    }
    project.rendered = captured;
    project.size = size;
    res.json({
      ...size,
      pages: captured.map(({ png, ...p }) => ({
        ...p,
        preview: `/api/projects/${project.id}/images/${p.id}?v=${Date.now()}`,
      })),
    });
  } catch (error) {
    next(error);
  } finally {
    project.busy = false;
  }
});
app.get("/api/projects/:id/images/:page", (req, res) => {
  const page = req.project.rendered.find(
    (p) => p.id === Number(req.params.page),
  );
  if (!page) return res.sendStatus(404);
  res.set("Cache-Control", "no-store").type("png").send(page.png);
});
app.post("/api/projects/:id/export", async (req, res, next) => {
  try {
    const { pages, quality } = req.body;
    if (req.project.busy) throw new Error("Wait for rendering to finish.");
    if (
      !req.project.size ||
      !Array.isArray(pages) ||
      !pages.length ||
      pages.length > 30 ||
      new Set(pages).size !== pages.length ||
      !pages.every(Number.isInteger)
    )
      throw new Error("Render and select at least one page first.");
    if (!Number.isInteger(quality) || quality < 50 || quality > 100)
      throw new Error("JPEG quality must be 50–100.");
    const zip = await exportImages(
      req.project,
      pages,
      req.project.size,
      quality,
    );
    res
      .attachment("dwin-background-assets.zip")
      .type("application/zip")
      .send(Buffer.from(zip));
  } catch (error) {
    next(error);
  }
});
app.use((error, req, res, next) => {
  const message = String(error.message || "Request failed.");
  res.status(400).json({ error: message.slice(0, 500) });
});
const expiry = setInterval(async () => {
  for (const [id, project] of projects)
    if (!project.busy && Date.now() - project.created > 3600000) {
      projects.delete(id);
      await rm(project.root, { recursive: true, force: true });
    }
}, 60000).unref();
const server = app.listen(Number(process.env.PORT || 3210), "127.0.0.1", () =>
  console.log(`DWIN Developer: http://localhost:${server.address().port}`),
);
async function shutdown() {
  clearInterval(expiry);
  server.close();
  for (const p of projects.values())
    await rm(p.root, { recursive: true, force: true });
  process.exit();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
