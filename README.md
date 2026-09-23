# DWIN Developer

> **Start here, including future agents:** read the **Latest handoff** at the very bottom first, then the most recent progress entries. Read `AGENTS.md` before editing. This README is the project’s continuing memory; update it after every meaningful code, configuration, documentation, or agreed design change.

A local web app for turning **already display-sized static websites** into numbered DWIN background source images.

**Current milestone:** folder upload → in-browser iframe rendering (no server-side Chromium) → page preview and ordering → PNG/JPEG ZIP export. Native `32.icl` encoding is **not implemented**. The exported ZIP is not a flash-ready DWIN project. Use the official DGUS ICL generator for that step.

## Run

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3210. Click **Load sample project** for a two-page 800 × 480 example. Or choose the `examples/control-panel` folder using the folder picker.

`PORT` changes the local port.

## Workflow

1. Design each HTML file for the exact target width and height. Keep CSS, fonts and images in the uploaded folder.
2. Upload the folder and choose dimensions. The app does not adapt your layout or split long pages.
3. Render. Each HTML file is loaded in a hidden iframe on your browser and captured as a viewport-sized image. Scrolling content outside that viewport is cropped and flagged. No server-side browser is required.
4. Review warnings and page previews. Reorder pages with the arrows; uncheck pages you do not need.
5. Download the source asset ZIP. Included pages receive sequential image indices starting at zero.
6. Use the official DGUS ICL generator to turn the images into `DWIN_SET/32.icl`. Configure your actual display project separately.

Text is baked into the images. Touch navigation, live variables and native font libraries are future milestones.

## Source structure

```text
src/
  web/              Browser interface, styles and interactions
    app.js          DOM capture via html2canvas and export controls
  server/
    index.js        Local HTTP API, project lifecycle, preview + capture endpoints
    project.js      Path and dimension validation
    aspect.js       Design-size detection and aspect-ratio mismatch warnings
    export.js       PNG/JPEG packaging and manifest
  (render.js kept for reference; no longer used in the main render path)
examples/
  control-panel/    Ready-to-upload 800 × 480 static website
tests/             Input validation, export, and aspect detection tests
docs/              Architecture, roadmap and ICL research boundary
```

## Supported input

Static HTML, local CSS, images and local font files. Relative paths resolve within the uploaded folder. Each `.html` or `.htm` file is a screen. JavaScript and external network resources are blocked by Content-Security-Policy during preview capture, so SPA source code and CDN-dependent pages need a static export with bundled assets. URL import is not implemented.

Limit: 250 files, 10 MB per file, 50 MB total accepted content, 30 HTML pages, dimensions from 64 to 1920 pixels per side and up to 2,073,600 pixels overall. Projects are temporary and expire after one hour or server shutdown.

## Testing

```sh
npm test
```

Tests do not require a browser. They validate input sanitization, PNG/JPEG export packaging, and aspect-ratio detection.

## Deployment status

This version binds to loopback and is intended for local development. It is not a hardened public upload service. Public hosting needs isolated render workers, bounded upload streams, authentication/rate limits, job scheduling, memory limits, and durable job state. See [architecture](docs/architecture.md).

See [roadmap](docs/roadmap.md) for the next stages and [ICL research](docs/icl.md) for why the app does not emit an unverified ICL file.

## Rendering approach

The server-side headless Chromium (Playwright) path was removed because Chromium failed to launch in restricted execution sessions. Rendering now happens **in the user's browser**: uploaded HTML is served at `/preview/<project-id>/`, loaded in a hidden same-origin `<iframe>`, and captured as a PNG via `html2canvas`. A Content-Security-Policy header blocks scripts and external network resources during preview, preserving the same security model as before. No browser download or `npm run setup:browser` step is needed.

## Product idea and agreed scope

We are building this project together with a beginner developer. Explain decisions simply and distinguish a proposed idea from something implemented or verified.

The eventual product is a web app where developers provide a website folder (and eventually a URL), select their DWIN display, preview its screens, and download a native display package. A standard DGUS display does not run a browser: this project translates prepared website designs into native graphics and, in later phases, display configuration.

The developer is responsible for designing each page for the exact target pixel dimensions. Aspect ratio alone is insufficient. For the first version, one HTML file represents one static display page. Do not add automatic slicing, responsive layout repair, or adaptation to other resolutions without a new decision. Those are future features.

`32.icl` is a **file containing a background-image library**, not a folder or one file per page. It belongs inside `DWIN_SET`. Text and button artwork can initially be baked into images. Images alone do not supply touch navigation, JavaScript behavior, controller actions, or live values.

The user's first intended milestone is website-to-ICL generation. Our current implementation only reaches the source-image export stage; this is a partial milestone, not completion of that aim.

## Phases and evidence

| Phase                          | Intended result                                                                   | Current status                                                                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1A: Prepared website to images | Upload, exact-size preview, page ordering, PNG/JPEG export                        | Reworked: server-side Playwright Chromium removed; rendering now uses in-browser iframe + html2canvas capture. End-to-end render still needs manual verification. |
| 1B: Images to ICL              | Valid `DWIN_SET/32.icl` from ordered page images                                  | Not implemented. Requires a verified format or official-tool integration and reference files.                                                        |
| 2: Static touch navigation     | Touch regions and configuration for moving between pages                          | Discussed, not implemented.                                                                                                                        |
| 3: Fonts and changing content  | Understand font libraries, native text, VP variables and controller mapping       | Discussed, not implemented. User wants font investigation after ICL.                                                                                 |
| Future                         | URL import, adapting other aspect ratios, broader website support, public hosting | Ideas only; not current scope.                                                                                                                     |

See `docs/architecture.md` for module boundaries, `docs/icl.md` for ICL research requirements, and `docs/roadmap.md` for the feature checklist. A checked implementation item does not by itself mean it passed an end-to-end or hardware test.

## What we still need

1. Manually confirm one complete sample render and ZIP export at http://localhost:3210: two 800 × 480 images, correct ordering, readable text, and valid manifest. Rendering happens in your browser now; report any capture issues.
2. Obtain the exact DWIN display model, controller generation, resolution and kernel version. These have **not yet been provided**.
3. Obtain the official DGUS tool version and known-good ICL files generated from known source images. Prefer one-image and two-image examples to establish the binary format and ordering.
4. Implement and verify ICL generation, then test on hardware. Do not rename a ZIP/JPEG to `.icl` or claim a package is flash-ready without evidence.
5. After that, agree the touch and font milestones before expanding scope.

## Keeping this README current

After each meaningful change or discussion that affects the project:

1. Update the relevant current-state sections so they do not contradict the implementation.
2. Append a dated entry to **Progress log**, immediately before **Latest handoff**. Record changes or decisions, why they matter, verification actually performed, remaining issues, and the next action. Group related edits into one coherent entry; do not log every keystroke.
3. Rewrite **Latest handoff** so it always remains the final section and provides a self-contained resumption point. Keep it compact enough to read with `tail -n 80 README.md`.
4. Update related docs when their claims change. Include the README update in the same commit as the work whenever possible.
5. Record repository synchronization accurately: local commit, pushed, or push failed. Never claim remote synchronization without confirming it. Do not put credentials, personal browser content, or full machine error dumps in this log.

For discussion-only decisions, record the agreement even when no application code changes. Label proposals, assumptions, and unresolved questions explicitly. Preserve old log entries; newer entries supersede them rather than silently rewriting history.

## Progress log

### 2026-09-22 — Scope agreed and initial application built

- **Decision:** Developers prepare static pages at the exact display dimensions. The app captures those pages; automatic resizing and pagination are deferred.
- **Implemented:** Node/Express service, browser UI, folder import, display presets/custom dimensions, Chromium capture module, page selection/reordering, PNG/JPEG ZIP exporter and manifest. Added a two-page 800 × 480 sample, tests, and architecture/roadmap/ICL notes.
- **Important gap:** Native ICL generation was not implemented; export explicitly says it is not flash-ready. Current output is input for DWIN's official generator.
- **Evidence:** UI opened; sample import returned three files and two HTML pages. Input validation test passed. Rendering integration test failed during browser launch, so downstream export was not verified by that test. Dependency audit reported zero vulnerabilities after updating Sharp.
- **Repository:** Initial commit `f5041fa` pushed to `origin/main`.

### 2026-09-22 — Rendering reworked from server-side Chromium to in-browser capture

- **Decision:** The Playwright headless Chromium launch was unreliable in restricted execution sessions and required a `setup:browser` download. Replaced server-side rendering with in-browser iframe capture using `html2canvas`. The user's browser does the rendering; the server only serves files and stores captured images.
- **Changed:** Removed the Playwright render endpoint and its import from `index.js`. Added `GET /preview/:id/:file` to serve uploaded files with a CSP that blocks scripts and external resources (preserving the security model). Added `POST /api/projects/:id/capture` to receive browser-captured PNGs. Reworked `src/web/app.js` to load each page in a hidden same-origin iframe, wait for fonts and images, capture via html2canvas, and upload PNGs. Integrated `aspect.js` (previously untracked) into the capture flow: the server reads each page's HTML/CSS, detects the design size, and adds aspect-ratio mismatch warnings. Increased Express JSON body limit to 50 MB for base64 image data. Removed `playwright` usage from the main code path; the `setup:browser` npm script and `render.js` are kept for reference but no longer used in production.
- **Evidence:** `npm test` passes (4 tests: input validation, PNG/JPEG export packaging, aspect detection, unrendered-page rejection). Server and frontend pass `node --check` syntax validation. `html2canvas` ESM build verified present at `node_modules/html2canvas/dist/html2canvas.esm.js`.
- **Verified:** Unit-level only. No end-to-end browser render test was run (per user preference for manual testing). The user should reload http://localhost:3210, load the sample project, and confirm pages render and export correctly.
- **Repository:** All changes are local and uncommitted. `render.js` is still tracked in git (not deleted). `html2canvas` was added as a dependency via `npm install`.

### 2026-09-22 — CSP fix and server-side integration test

- **Bug found:** The preview CSP used `frame-ancestors 'none'`, which blocked the iframe from loading in the app. This caused `Failed to read a named property 'document' from 'Window': Blocked a frame from accessing a cross-origin frame` in the browser.
- **Changed:** Updated CSP to `frame-ancestors 'self'` to allow same-origin iframe embedding. Added `iframe.sandbox = "allow-same-origin"` in the frontend for defense-in-depth against scripts. Added a guard in `capturePage` to produce a readable error if the iframe document is inaccessible.
- **Evidence:** Server-side integration test passed on port 3213: demo project created, two pages captured via `POST /api/projects/:id/capture` (mock PNGs), images retrieved at `/api/projects/:id/images/:page` (HTTP 200), and export ZIP produced with correct ordering and `iclGenerated: false`. `npm test` passes (4 tests).
- **Remaining:** The actual browser-side html2canvas capture path is untested (requires manual verification by the user). Old servers on ports 3210 and 3211 are still running the previous code; they must be stopped and restarted to use the reworked code.

### 2026-09-22 — Browser launch error and manual testing handoff

- **Observed:** Chromium exits at startup in the restricted session; reported macOS `bootstrap_check_in` / Mach-port permission errors. Both installed Chrome and downloaded Chromium launch attempts failed there.
- **Changed:** Replaced raw browser launch log responses with a concise message, kept detailed logs in the server terminal, and made the status area wrap long text. Documented normal-Terminal startup on port 3211.
- **Evidence:** Server syntax check passed. No successful render has been confirmed. Starting outside the restricted session is a proposed remedy, not a verified fix.
- **User preference:** User will test manually to avoid spending tokens on extensive automated/browser testing. Later asked whether a long wait was normal; advised that a two-page sample should take seconds and to report status/errors if still stuck after about 30 seconds. This timing is guidance, not a measured benchmark.
- **Repository:** Fix committed locally as `77cf2c8`; push failed because GitHub could not be resolved. Remote confirmation is outstanding.

### 2026-09-22 — Persistent project memory requested

- **Request:** Make the end of the README sufficient for another agent to understand the latest work, and require updates after changes and project discussions.
- **Changed:** Added product scope, phases with evidence levels, outstanding requirements, append-only progress log and final handoff. Added root `AGENTS.md` to instruct future agents. Clarified roadmap checkboxes as implementation status rather than proof of successful rendering.
- **Verification:** Documentation checked against the existing source structure and recorded command results. No browser or rendering tests rerun for this documentation change.
- **Next:** User manually checks the sample at port 3211; resolve any current launch error before ICL research. Native ICL generation remains the intended unfinished milestone.

### 2026-09-22 — User website inspected after empty output

- **Input inspected:** User-provided `dgus-preview` folder contains `index.html`, `page2.html`, `page3.html`, and `css/style.css`. All three pages reference the existing stylesheet; no JavaScript or external assets are required.
- **Finding:** CSS explicitly fixes the screen to **480 × 272**. This matches the supported static input contract. Select that resolution; 800 × 480 would add surrounding space, not explain completely missing output. The CSS mentions model DMG48270C043, but this is an unconfirmed source comment, not confirmation of the user's hardware.
- **Remaining uncertainty:** No fresh render result or current UI error is available. A localhost:3211 connection attempt from the agent session failed; this does not establish what the user currently sees. Earlier Chromium startup failure remains relevant, but is not proven to be this attempt's cause.
- **Next:** User should select 480 × 272 and click Render pages after import. Obtain the exact bottom status if no pages appear. No source changes or repeated browser tests were performed; uploaded files were left unchanged.

### 2026-09-22 — No visible status reported

- **Reported:** User sees no message at the bottom after attempting their upload. Exact runtime cause remains unknown; do not assume Chromium is the only cause.
- **Changed:** Mirrored status beside Render pages, added a static startup message/noscript notice, explicit server-connectivity errors, and a two-minute HTTP request timeout. Timeout does not cancel server-side work.
- **Verification:** JavaScript syntax and diff checks only; user retains manual testing. Reload the app to receive the frontend changes; status should immediately read “Ready”. A persistent “Loading app controls” message indicates frontend startup did not finish.
- **Next:** Read the now-visible message near Render pages to distinguish frontend startup, connection, upload, and rendering failures. No successful render has yet been confirmed. Changes remain local pending remote synchronization.

### 2026-09-22 — Environment re-checked; Chromium now launches

- **Observed:** On this machine the app is already running in two places: `http://localhost:3210` (started 19:56) and `http://localhost:3211` (started 20:08). Both respond with HTTP 200. Node v26, dependencies, and the Playwright Chromium under `.runtime/browsers` (chromium-1243) are all installed. Installed Google Chrome is also present.
- **Finding (supersedes earlier blocker note):** Chromium **does launch** here now. The headless shell started successfully during a test run, so the earlier `bootstrap_check_in` / Mach-port launch failure is **not reproducing** in the current session. That earlier failure was tied to a restricted execution session; it is not the current state.
- **Not yet verified:** A complete render-and-export test was started but was **interrupted before it finished**, so a full end-to-end render (correct 800×480 capture, warnings, ordered ZIP) is still unconfirmed. Several stale headless-browser processes left by earlier interrupted runs were cleaned up.
- **Repository:** Local `main` is 4 commits ahead of `origin/main` (`77cf2c8`, `ca6207c`, `bab18d0`, `8d69818`). Nothing is uncommitted besides this documentation update. Remote push has not been re-attempted; do not assume it is synchronized.
- **Next:** With the servers already running, reload the app, confirm the “Ready” status, then render. For the user's `dgus-preview` site select **480 × 272**. If a page does not appear, read the status text beside Render pages.

## Latest handoff — READ THIS FIRST

- **Updated:** 2026-09-22. Building DWIN Developer together; the user is a beginner and prefers simple explanations and manual testing.
- **Repository:** `https://github.com/zac-tec/dwin_developer.git`, branch `main`. All rework committed as `e7a8c59` and pushed to `origin/main`.
- **Rendering rework (just done):** Replaced server-side Playwright headless Chromium with in-browser iframe + `html2canvas` capture. The server now serves uploaded files at `/preview/<project-id>/` and receives captured PNGs at `POST /api/projects/:id/capture`. No `npm run setup:browser` is needed. `html2canvas` is imported client-side from `/vendor/html2canvas/`.
- **Running:** `npm start` (or `npm run dev`). No servers are currently running — restart as needed. Open http://localhost:3210.
- **Implemented:** Folder upload → iframe preview (CSP blocks JS and external resources) → html2canvas capture at chosen dimensions → page preview, ordering, inclusion → PNG/JPEG ZIP export with manifest. `aspect.js` is integrated to detect design size from HTML meta tags or CSS and warn on aspect-ratio mismatch.
- **Not finished:** `32.icl` generation, native touch configuration, native fonts, live values, URL import, layout adaptation. Never call the ZIP flash-ready.
- **Unverified:** The browser-side html2canvas capture path (the actual iframe rendering and image capture in the browser) is untested. Unit tests and server-side integration tests pass, but the full browser capture flow needs manual verification.
- **CSP fix:** `frame-ancestors` changed from `'none'` to `'self'` to allow the app to load preview pages in an iframe. Old servers on ports 3210/3211 are running pre-rework code and must be stopped and restarted to pick up the changes.
- **Next action:** Stop any running servers (`kill $(lsof -ti:3210)` etc.), then run `npm start`. Open http://localhost:3210, load the sample project, and confirm pages render and export correctly. Report any capture issues.
- **Update rule:** Read `AGENTS.md`; append a progress entry and rewrite this final handoff after every meaningful change or agreed decision. Keep this section last.

