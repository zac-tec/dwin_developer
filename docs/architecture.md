# How the first version works

The browser uploads a folder as multipart files plus a relative-path list. The server validates paths, writes temporary files outside the repository, and discovers HTML pages. No submitted filename is used as an unrestricted filesystem path.

The render module creates a fresh Chromium context per page with the chosen viewport, device scale 1, JavaScript disabled, service workers blocked and external network requests blocked. Browser requests to a synthetic origin are fulfilled only from the uploaded file allowlist. The uploaded HTML is never served directly into the app's origin. Fonts and images finish loading before a viewport screenshot is captured; CSS motion is disabled. The app displays the resulting PNG, not a live iframe, so preview and export share exactly the same captured pixels.

The export module converts each captured PNG into baseline JPEG with 4:4:4 chroma sampling, includes the original lossless PNG, records the selected order in a manifest, and produces a ZIP. The DWIN_SET folder contains an explanatory README, **not** an ICL placeholder. The official DWIN tool remains necessary to generate the actual library.

## Future module boundary

An `icl` encoder should accept an ordered list of encoded images plus a hardware profile. It should return a validated binary library and diagnostics. Add it only after a known-good reference library and exact format have been validated. Do not combine it with rendering code.

## Public service considerations

The present process is a local single-user development service. Multer buffers uploads before checking the aggregate content limit; therefore that limit is not a strict process memory bound. Screenshots and ZIPs are also buffered. Before public exposure, use streaming byte limits, filesystem/container isolation for the browser, bounded worker concurrency, deadlines for whole jobs, quotas, expired-job cleanup, rate limiting, and authentication. Browser resource interception is useful defense but is not an OS isolation boundary. Keep the browser sandbox enabled.

## API

- POST `/api/projects`: multipart `files` and JSON `paths`.
- POST `/api/demo`: import bundled sample.
- POST `/api/projects/:id/render`: `{width,height}`.
- GET `/api/projects/:id/images/:page`: captured PNG.
- POST `/api/projects/:id/export`: `{pages:[pageId,...],quality:95}`.

Project state is temporary and in-memory; restarting requires re-uploading.
