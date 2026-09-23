# How the first version works

The browser uploads a folder as multipart files plus a relative-path list. The server validates paths, writes temporary files outside the repository, and discovers HTML pages. No submitted filename is used as an unrestricted filesystem path.

## Preview serving

When the user clicks Render, the server exposes each page at `/preview/<project-id>/<path>`. The response includes a `Content-Security-Policy` header that blocks scripts (`script-src 'none'`) and external network resources (`default-src 'self'`), preserving the same security model as the previous Playwright approach. HTML responses get a `<base href>` tag so relative URLs resolve against the preview path.

## In-browser capture

The frontend loads each page in a hidden same-origin `<iframe>`. Once the iframe fires its load event, the app waits for `document.fonts.ready` and all images to complete, then captures the iframe's document with `html2canvas` at the selected viewport dimensions. The resulting PNG is sent back to the server via `POST /api/projects/:id/capture` as a base64 data URI. The server stores the raw PNG buffer in the in-memory project.

Aspect-ratio detection from `aspect.js` runs server-side during capture: the server reads each page's HTML and CSS, finds the design size (from a `dwin-design-size` meta tag or CSS box dimensions), and adds a warning if it does not match the selected frame.

## Export

The export module converts each captured PNG into baseline JPEG with 4:4:4 chroma sampling, includes the original lossless PNG, records the selected order in a manifest, and produces a ZIP. The DWIN_SET folder contains an explanatory README, **not** an ICL placeholder. The official DWIN tool remains necessary to generate the actual library.

## Future module boundary

An `icl` encoder should accept an ordered list of encoded images plus a hardware profile. It should return a validated binary library and diagnostics. Add it only after a known-good reference library and exact format have been validated. Do not combine it with rendering code.

## Rendering notes

The previous server-side Playwright Chromium approach was removed because Chromium failed to launch in restricted execution sessions. The in-browser approach eliminates server-side browser management entirely. `html2canvas` re-renders the DOM to a canvas rather than capturing native pixels, so CSS support is good for static layouts but may differ from a real browser for advanced features. The old `render.js` module is retained for reference.

## Public service considerations

The present process is a local single-user development service. Rendering now happens in the user's browser, so no browser processes or memory limits are needed on the server. Project data (uploaded files and captured PNGs) is still buffered in memory; the 50 MB upload limit applies. Before public exposure, add authentication, rate limits, job scheduling, and durable job state.

## API

- POST `/api/projects`: multipart `files` and JSON `paths`.
- POST `/api/demo`: import bundled sample.
- GET `/preview/:id/<path>`: serve an uploaded file for iframe preview (with CSP).
- POST `/api/projects/:id/capture`: `{width, height, pages:[{id, source, title, warnings, png:"data:image/png;base64,…"}]}`.
- GET `/api/projects/:id/images/:page`: captured PNG.
- POST `/api/projects/:id/export`: `{pages:[pageId,...],quality:95}`.

Project state is temporary and in-memory; restarting requires re-uploading.
