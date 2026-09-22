# Roadmap

## Stage 1 — Background assets (current)

- [x] Static website folder upload, preserving relative assets
- [x] Exact pixel dimensions, presets and aspect-ratio display
- [x] One HTML file per screen, no automatic adaptation
- [x] Actual Chromium rasterization at device scale 1
- [x] Local fonts/image loading, overflow and missing-resource warnings
- [x] Page preview, ordering and inclusion
- [x] Lossless PNG, configurable baseline JPEG, ZIP and manifest
- [ ] Verified native ICL generation (blocked on format/reference validation)
- [ ] Hardware validation on the user's display

## Stage 2 — Display package

Generate a verified ICL through an encoder or a supported official-tool adapter. Select hardware profiles and check resource/flash limits. Preserve source/output metadata for repeatable conversions.

## Stage 3 — Touch mapping

Define page navigation and touch regions, then generate the appropriate touch/display configuration. Website links alone do not automatically create native DGUS controls.

## Stage 4 — Text and variables

Investigate font library formats, supported encodings, dynamic labels, VP assignments and controller mappings.

## Later

URL import, layout adaptation to other resolutions, SPA capture, cloud rendering and deployment. These are intentionally outside the first static website contract.
