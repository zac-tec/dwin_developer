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
import { safePath, dimensions, pageFiles } from "./project.js";
import { renderPage, closeBrowser } from "./render.js";
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
app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(repo, "src/web")));
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
  if (pages.length > 30)
    throw new Error("Use up to 30 HTML pages per project.");
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
app.post("/api/projects/:id/render", async (req, res, next) => {
  const project = req.project;
  if (project.busy)
    return res
      .status(409)
      .json({ error: "This project is already rendering." });
  project.busy = true;
  try {
    const size = dimensions(req.body.width, req.body.height);
    const rendered = [];
    for (const [id, source] of project.pages.entries())
      rendered.push({
        id,
        source,
        ...(await renderPage(project, source, size)),
      });
    project.rendered = rendered;
    project.size = size;
    res.json({
      ...size,
      pages: rendered.map(({ png, ...p }) => ({
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
  if (message.includes("browserType.launch")) {
    console.error("Rendering browser failed to start:", message);
    return res.status(503).json({
      error: message.includes("Executable doesn't exist")
        ? "The rendering browser is missing. Run npm run setup:browser in Terminal, then restart the app."
        : "The rendering browser could not start. If running inside a restricted development session, start the app from your normal Terminal and try again. Your uploaded pages have not been rendered. See the server terminal for details.",
    });
  }
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
  await closeBrowser();
  for (const p of projects.values())
    await rm(p.root, { recursive: true, force: true });
  process.exit();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
