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
  mime,
} from "../src/server/project.js";
import { detectDesignSize, aspectMismatch, rewritePrompt } from "../src/server/aspect.js";
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
test("exportImages packages ordered PNG/JPEG with manifest and no ICL", async () => {
  const png = await sharp({
    create: {
      width: 800,
      height: 480,
      channels: 4,
      background: { r: 20, g: 80, b: 60, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
  const root = await mkdtemp(path.join(os.tmpdir(), "dwin-test-"));
  try {
    const project = { root, files: ["index.html", "main.css"] };
    const size = { width: 800, height: 480 };
    project.rendered = [
      { id: 0, source: "first.html", png, title: "First", warnings: [] },
      { id: 1, source: "second.html", png, title: "Second", warnings: [] },
    ];
    const archive = unzipSync(
      await exportImages(project, [1, 0], size, 95),
    );
    const manifest = JSON.parse(strFromU8(archive["manifest.json"]));
    assert.deepEqual(
      manifest.pages.map((p) => p.source),
      ["second.html", "first.html"],
    );
    assert.equal(manifest.width, 800);
    assert.equal(manifest.height, 480);
    assert.equal(manifest.iclGenerated, false);
    assert(archive["images/000.png"]);
    assert(archive["images/001.jpg"]);
    assert.equal(
      Object.keys(archive).some((name) => name.endsWith(".icl")),
      false,
    );
    const jpg = await sharp(archive["images/001.jpg"]).metadata();
    assert.equal(jpg.width, 800);
    assert.equal(jpg.chromaSubsampling, "4:4:4");
    assert.equal(jpg.isProgressive, false);
    await assert.rejects(() => exportImages(project, [100], size, 95));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("aspect.js detects design size and mismatch warnings", () => {
  const fromMeta = detectDesignSize({
    html: '<meta name="dwin-design-size" content="480,272">',
    css: "",
  });
  assert.deepEqual(fromMeta, {
    width: 480,
    height: 272,
    source: "meta",
  });
  const fromCss = detectDesignSize({
    html: "<style>body{width:800px;height:480px}</style>",
    css: "",
  });
  assert.deepEqual(fromCss, {
    width: 800,
    height: 480,
    source: "css",
  });
  const none = detectDesignSize({ html: "<p>no size</p>", css: "" });
  assert.equal(none, null);
  const mismatch = aspectMismatch(
    { width: 480, height: 272 },
    { width: 800, height: 480 },
  );
  assert.equal(mismatch.matches, false);
  assert(mismatch.short.includes("Aspect ratio does not match"));
  const match = aspectMismatch(
    { width: 800, height: 480 },
    { width: 800, height: 480 },
  );
  assert.equal(match.matches, true);
  assert.equal(rewritePrompt({ width: 800, height: 480 }, { width: 480, height: 272 }).length > 0, true);
  assert(mime("photo.png"), "image/png");
  assert(mime("index.html"), "text/html");
});
test("exportImages rejects unrendered pages", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "dwin-test-"));
  try {
    const project = { root, files: ["index.html"], rendered: [] };
    await assert.rejects(() =>
      exportImages(project, [0], { width: 800, height: 480 }, 95),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
