# DWIN Developer

> **Start here, including future agents:** read the **Latest handoff** at the very bottom first, then the most recent progress entries. Read `AGENTS.md` before editing. This README is the project’s continuing memory; update it after every meaningful code, configuration, documentation, or agreed design change.

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

## macOS: rendering browser fails to launch

If the message includes `bootstrap_check_in`, `MachPortRendezvousServer`, or `Permission denied (1100)`, the server may be running inside a restricted execution session that prevents Chromium from starting. Launch it in your normal macOS Terminal instead. Do not disable the browser sandbox.

For this checkout, if the browser was installed under `.runtime/browsers`, run:

```sh
PLAYWRIGHT_BROWSERS_PATH=.runtime/browsers PORT=3211 npm start
```

Then open http://localhost:3211 and re-import your folder or load the sample. Port 3211 avoids a conflict with an existing preview on 3210. If the browser is missing, run `PLAYWRIGHT_BROWSERS_PATH=.runtime/browsers npm run setup:browser` first. This workaround still requires manual verification on your machine.

## Product idea and agreed scope

We are building this project together with a beginner developer. Explain decisions simply and distinguish a proposed idea from something implemented or verified.

The eventual product is a web app where developers provide a website folder (and eventually a URL), select their DWIN display, preview its screens, and download a native display package. A standard DGUS display does not run a browser: this project translates prepared website designs into native graphics and, in later phases, display configuration.

The developer is responsible for designing each page for the exact target pixel dimensions. Aspect ratio alone is insufficient. For the first version, one HTML file represents one static display page. Do not add automatic slicing, responsive layout repair, or adaptation to other resolutions without a new decision. Those are future features.

`32.icl` is a **file containing a background-image library**, not a folder or one file per page. It belongs inside `DWIN_SET`. Text and button artwork can initially be baked into images. Images alone do not supply touch navigation, JavaScript behavior, controller actions, or live values.

The user's first intended milestone is website-to-ICL generation. Our current implementation only reaches the source-image export stage; this is a partial milestone, not completion of that aim.

## Phases and evidence

| Phase                          | Intended result                                                                   | Current status                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1A: Prepared website to images | Upload, exact-size preview, page ordering, PNG/JPEG export                        | Code implemented; interface and sample import observed working. Rendering/export end-to-end still unverified because Chromium failed to launch. |
| 1B: Images to ICL              | Valid `DWIN_SET/32.icl` from ordered page images                                  | Not implemented. Requires a verified format or official-tool integration and reference files.                                                   |
| 2: Static touch navigation     | Touch regions and configuration for moving between pages                          | Discussed, not implemented.                                                                                                                     |
| 3: Fonts and changing content  | Understand font libraries, native text, VP variables and controller mapping       | Discussed, not implemented. User wants font investigation after ICL.                                                                            |
| Future                         | URL import, adapting other aspect ratios, broader website support, public hosting | Ideas only; not current scope.                                                                                                                  |

See `docs/architecture.md` for module boundaries, `docs/icl.md` for ICL research requirements, and `docs/roadmap.md` for the feature checklist. A checked implementation item does not by itself mean it passed an end-to-end or hardware test.

## What we still need

1. Resolve or confirm the Chromium launch issue in the user's normal Terminal. Obtain the current status text and final terminal error lines if rendering still stalls.
2. Confirm one complete sample render and ZIP export: two 800 × 480 images, correct ordering, readable text, and valid manifest. The user prefers manual testing to reduce token use; do not repeat broad browser tests without a reason or request.
3. Obtain the exact DWIN display model, controller generation, resolution and kernel version. These have **not yet been provided**.
4. Obtain the official DGUS tool version and known-good ICL files generated from known source images. Prefer one-image and two-image examples to establish the binary format and ordering.
5. Implement and verify ICL generation, then test on hardware. Do not rename a ZIP/JPEG to `.icl` or claim a package is flash-ready without evidence.
6. After that, agree the touch and font milestones before expanding scope.

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

## Latest handoff — READ THIS FIRST

- **Updated:** 2026-09-22. We are building DWIN Developer together; the user is a beginner and prefers simple explanations and manual testing.
- **Repository:** `https://github.com/zac-tec/dwin_developer.git`, branch `main`. Initial implementation was pushed. Launch-error fix `77cf2c8` is local with a previously failed push. This documentation work must be saved with its agent instructions; check `git status` and remote state before claiming everything is synchronized.
- **Implemented:** Folder upload → one HTML file per page → exact target viewport → static capture → ordered PNG/JPEG ZIP and manifest. Local-only Express app, plain browser UI, Playwright renderer and Sharp export. Sample is under `examples/control-panel`.
- **Not finished:** `32.icl` generation, native touch configuration, native fonts, live values, URL import and layout adaptation. Never call the ZIP flash-ready.
- **Current blocker:** Chromium failed to launch under the restricted session. The normal-Terminal workaround on port 3211 was supplied; user success is **not confirmed**. Sample import and UI worked; full render/export did not pass verification.
- **Next action:** Investigate empty output for the user’s `dgus-preview` upload. Its three static HTML pages and local CSS fit the input contract; use 480 × 272. Ask for the current bottom status after Render pages before attributing this attempt to the earlier Chromium error. Uploaded source was left unchanged. Respect manual testing.
- **Manual start:** From the repository root, run `PLAYWRIGHT_BROWSERS_PATH=.runtime/browsers PORT=3211 npm start`, open `http://localhost:3211`, then load the sample. This assumes the browser is installed there; otherwise run setup with the same environment variable first. Keep the browser sandbox enabled.
- **After rendering works:** Obtain exact display model/kernel and known-good DWIN-generated ICL examples. Implement verified ICL output before investigating native font libraries.
- **Update rule:** Read `AGENTS.md`; append a progress entry and rewrite this final handoff after every meaningful change or agreed project decision. Keep this section last.
