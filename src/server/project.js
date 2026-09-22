import path from "node:path";
export function safePath(value) {
  if (
    typeof value !== "string" ||
    !value ||
    value.includes("\\") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.split("/").some((p) => p === ".." || p === "." || !p)
  )
    throw new Error("Invalid relative file path.");
  return value;
}
export function dimensions(width, height) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 64 ||
    height < 64 ||
    width > 1920 ||
    height > 1920 ||
    width * height > 2073600
  )
    throw new Error(
      "Use whole pixel dimensions from 64 to 1920, up to 2,073,600 pixels.",
    );
  return { width, height };
}
export function pageFiles(files) {
  return files
    .filter((f) => /\.html?$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
export function relativeAsset(url, origin) {
  const parsed = new URL(url);
  if (parsed.origin !== origin) return null;
  try {
    return safePath(decodeURIComponent(parsed.pathname.slice(1)));
  } catch {
    return null;
  }
}
export const mime = (file) =>
  ({
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".ico": "image/x-icon",
  })[path.extname(file).toLowerCase()] || "application/octet-stream";
