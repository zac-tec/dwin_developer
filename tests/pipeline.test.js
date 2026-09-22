import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { unzipSync, strFromU8 } from "fflate";
import {
  safePath,
  dimensions,
  pageFiles,
  relativeAsset,
} from "../src/server/project.js";
import { renderPage, closeBrowser } from "../src/server/render.js";
import { exportImages } from "../src/server/export.js";
test("rejects unsafe input paths and invalid dimensions", () => {
  for (const value of [
    "../secret",
    "/etc/passwd",
    "a/../b",
    "a\\b",
    "a//b",
    ".",
    "",
  ])
    assert.throws(() => safePath(value));
  assert.equal(safePath("assets/main.css"), "assets/main.css");
  assert.throws(() => dimensions(800.1, 480));
  assert.throws(() => dimensions(1920, 1920));
  assert.deepEqual(dimensions(800, 480), { width: 800, height: 480 });
  assert.equal(
    relativeAsset(
      "https://external.test/file",
      "https://uploaded-project.invalid",
    ),
    null,
  );
  assert.deepEqual(pageFiles(["2.html", "assets/main.css", "1.htm"]), [
    "1.htm",
    "2.html",
  ]);
});
test("real rendering preserves dimensions, warns on overflow, blocks external assets, and exports ordered images", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dwin-test-"));
  try {
    await writeFile(
      path.join(root, "index.html"),
      '<!doctype html><title>Test screen</title><link rel="stylesheet" href="main.css"><script>document.body.innerHTML="executed"</script><div>Hello display</div><img src="https://example.com/a.png"><img src="missing.png">',
    );
    await writeFile(
      path.join(root, "main.css"),
      "body{margin:0;background:rgb(20,80,60)}div{height:600px;width:900px}",
    );
    const project = { root, files: ["index.html", "main.css"] };
    const size = { width: 800, height: 480 };
    const result = await renderPage(project, "index.html", size);
    const metadata = await sharp(result.png).metadata();
    assert.equal(metadata.width, 800);
    assert.equal(metadata.height, 480);
    assert.equal(result.title, "Test screen");
    assert(
      result.warnings.some((w) => w.includes("overflows width and height")),
    );
    assert(
      result.warnings.some((w) => w.includes("External resource blocked")),
    );
    assert(result.warnings.some((w) => w.includes("Missing asset")));
    assert(result.warnings.some((w) => w.includes("JavaScript is disabled")));
    const pixel = await sharp(result.png)
      .extract({ left: 700, top: 400, width: 1, height: 1 })
      .raw()
      .toBuffer();
    assert.deepEqual([...pixel].slice(0, 3), [20, 80, 60]);
    project.rendered = [
      { id: 0, source: "first.html", ...result },
      { id: 1, source: "second.html", ...result },
    ];
    const archive = unzipSync(await exportImages(project, [1, 0], size, 95));
    const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
    assert.deepEqual(
      manifest.pages.map((p) => p.source),
      ["second.html", "first.html"],
    );
    assert.equal(manifest.iclGenerated, false);
    assert(archive["images/000.png"]);
    assert(archive["images/001.jpg"]);
    assert.equal(
      Object.keys(archive).some((name) => name.endsWith(".icl")),
      false,
    );
    const jpg = await sharp(archive["images/000.jpg"]).metadata();
    assert.equal(jpg.width, 800);
    assert.equal(jpg.chromaSubsampling, "4:4:4");
    assert.equal(jpg.isProgressive, false);
    await assert.rejects(() => exportImages(project, [100], size, 95));
  } finally {
    await closeBrowser();
    await rm(root, { recursive: true, force: true });
  }
});
