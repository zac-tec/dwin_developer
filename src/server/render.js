import { chromium } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { relativeAsset, mime } from "./project.js";
let browserPromise;
export async function closeBrowser() {
  if (browserPromise) await (await browserPromise).close();
  browserPromise = undefined;
}
export async function renderPage(project, file, size) {
  browserPromise ??= chromium
    .launch({
      chromiumSandbox: true,
      ...(process.env.DWIN_BROWSER_EXECUTABLE
        ? { executablePath: process.env.DWIN_BROWSER_EXECUTABLE }
        : {}),
    })
    .catch((error) => {
      browserPromise = undefined;
      throw error;
    });
  const browser = await browserPromise;
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: 1,
    javaScriptEnabled: false,
    serviceWorkers: "block",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const warnings = new Set();
  const origin = "https://uploaded-project.invalid";
  try {
    await context.route("**/*", async (route) => {
      const url = route.request().url();
      if (url.startsWith("data:")) return route.continue();
      const asset = relativeAsset(url, origin);
      if (!asset || !project.files.includes(asset)) {
        warnings.add(
          asset
            ? `Missing asset: ${asset}`
            : `External resource blocked: ${url.slice(0, 150)}`,
        );
        return route.abort();
      }
      try {
        await route.fulfill({
          body: await readFile(path.join(project.root, asset)),
          contentType: mime(asset),
        });
      } catch {
        warnings.add(`Could not load: ${asset}`);
        await route.abort();
      }
    });
    const page = await context.newPage();
    await page.goto(
      `${origin}/${file.split("/").map(encodeURIComponent).join("/")}`,
      { waitUntil: "load", timeout: 15000 },
    );
    await page.addStyleTag({
      content:
        "*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}",
    });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        Array.from(document.images, (image) => image.decode().catch(() => {})),
      );
    });
    const info = await page.evaluate(() => ({
      title: document.title || "",
      overflowX:
        Math.max(
          document.documentElement.scrollWidth,
          document.body?.scrollWidth || 0,
        ) > innerWidth,
      overflowY:
        Math.max(
          document.documentElement.scrollHeight,
          document.body?.scrollHeight || 0,
        ) > innerHeight,
      scripts: document.scripts.length,
      brokenImages: [...document.images].filter(
        (i) => !i.complete || !i.naturalWidth,
      ).length,
    }));
    if (info.overflowX || info.overflowY)
      warnings.add(
        `Content overflows ${[info.overflowX && "width", info.overflowY && "height"].filter(Boolean).join(" and ")}; export captures only the screen area.`,
      );
    if (info.scripts)
      warnings.add(
        "JavaScript is disabled. Upload static HTML or a pre-rendered export.",
      );
    if (info.brokenImages)
      warnings.add(`${info.brokenImages} image(s) did not load.`);
    const png = await page.screenshot({
      type: "png",
      fullPage: false,
      animations: "disabled",
    });
    return { png, title: info.title, warnings: [...warnings] };
  } finally {
    await context.close();
  }
}
