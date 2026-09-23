# Instructions for agents working on DWIN Developer

These instructions apply to this repository. Follow the user's current instructions when they change scope or preferences.

## At the start of every task

1. Read the last 80 lines of `README.md`, especially **Latest handoff**, before planning or editing.
2. Read the earlier README sections and relevant `docs/` files as needed for the task. Check `git status` and recent history; preserve existing work.
3. Distinguish implemented code, verified behavior, proposals, and hardware-tested output. Do not infer successful rendering from a working interface.

## Mandatory project memory updates

- After every meaningful code/configuration/documentation change or agreed project discussion, update `README.md` before handing work back.
- Update its current-state sections; append a dated progress entry immediately before **Latest handoff**; rewrite that final section with the latest state, evidence, blockers, and next action.
- Keep **Latest handoff** at the very bottom. It must be understandable without access to the chat. Preserve earlier progress entries and note when a newer decision supersedes them.
- Include what changed or was agreed, why, what was actually checked, what remains unverified, and local-versus-remote commit status. Discussion-only decisions also need an entry.
- Commit the README alongside the related changes when committing work. Never claim a push succeeded unless confirmed. Keep secrets and large raw logs out of documentation.
- Align `docs/roadmap.md`, `docs/architecture.md`, and `docs/icl.md` whenever their claims change.

## Product boundaries and user preferences

- The user is a beginner: explain decisions plainly and keep the structure approachable.
- The user prefers manual testing to reduce token use. Use focused checks when necessary; do not repeatedly run broad browser testing unless requested or justified by a specific issue.
- Developers design each static HTML page for the exact display pixel dimensions. Do not automatically resize layouts or paginate long pages without agreement.
- The first intended milestone includes valid ICL generation. The present PNG/JPEG exporter only completes part of it.
- `DWIN_SET/32.icl` must be a verified DWIN binary library. Never substitute a renamed ZIP, JPEG, or incompatible ICO file, and never describe the present export as flash-ready.
- Rendering happens in the user's browser via a hidden iframe and `html2canvas`. The server serves files at `/preview/<id>/` with a CSP that blocks scripts and external resources. Do not reintroduce server-side browser launching unless explicitly agreed.
- `render.js` is retained for reference but is not imported in the main code path.
- Touch controls, native fonts, controller variables, URL import and automatic adaptation are later work. Do not silently expand scope.
