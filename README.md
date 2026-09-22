# DWIN Developer

A local web app for turning **already display-sized static websites** into numbered DWIN background source images.

**Current milestone:** folder upload → exact-resolution Chromium rendering → page preview and ordering → PNG/JPEG ZIP export. Native `32.icl` encoding is **not implemented**. The exported ZIP is not a flash-ready DWIN project. Use the official DGUS ICL generator for that step.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run setup:browser
npm run dev
```

Open http://localhost:3210. Click **Load sample project** for a two-page 800 × 480 example. Or choose the `examples/control-panel` folder using the folder picker.

Optional: `DWIN_BROWSER_EXECUTABLE` can point to an installed Chrome/Chromium executable, avoiding the browser download. `PORT` changes the local port.

## Workflow

1. Design each HTML file for the exact target width and height. Keep CSS, fonts and images in the uploaded folder.
2. Upload the folder and choose dimensions. The app does not adapt your layout or split long pages.
3. Render. Each HTML file becomes one viewport-sized image at device scale 1. Scrolling content outside that viewport is cropped and flagged.
4. Review warnings and page previews. Reorder pages with the arrows; uncheck pages you do not need.
5. Download the source asset ZIP. Included pages receive sequential image indices starting at zero.
6. Use the official DGUS ICL generator to turn the images into `DWIN_SET/32.icl`. Configure your actual display project separately.

Text is baked into the images. Touch navigation, live variables and native font libraries are future milestones.

## Source structure

```text
src/
  web/              Browser interface, styles and interactions
  server/
    index.js        Local HTTP API, temporary project lifecycle
    project.js      Path and dimension validation
    render.js       Chromium rendering and resource isolation
    export.js       PNG/JPEG packaging and manifest
examples/
  control-panel/    Ready-to-upload 800 × 480 static website
tests/             Rendering, export and input validation tests
docs/              Architecture, roadmap and ICL research boundary
```

## Supported input

Static HTML, local CSS, images and local font files. Relative paths and root-relative paths resolve within the uploaded folder. Each `.html` or `.htm` file is a screen. JavaScript and external network resources are deliberately disabled, so SPA source code and CDN-dependent pages need a static export with bundled assets. URL import is not implemented.

Limit: 250 files, 10 MB per file, 50 MB total accepted content, 30 HTML pages, dimensions from 64 to 1920 pixels per side and up to 2,073,600 pixels overall. Projects are temporary and expire after one hour or server shutdown.

## Testing

```sh
npm test
```

Tests launch Chromium. Run browser setup first, or set `DWIN_BROWSER_EXECUTABLE`.

## Deployment status

This version binds to loopback and is intended for local development. It is not a hardened public upload service. Public hosting needs isolated render workers, bounded upload streams, authentication/rate limits, job scheduling, memory limits, and durable job state. See [architecture](docs/architecture.md).

See [roadmap](docs/roadmap.md) for the next stages and [ICL research](docs/icl.md) for why the app does not emit an unverified ICL file.
