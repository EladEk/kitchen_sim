# R130 startup fix verification

Changes were committed before checks.

## Cause

R129 generated navigation revision 129 but `DistrictViewer.jsx` still contained `n.revision !== 128`. The renderer initialized successfully and the application rejected its own valid data. This was an application version check, not a GPU initialization failure or a cache problem.

## Fix and checks

- `BASELINE_REVISION` in `public-view/revision.mjs` supplies the numeric navigation revision and the derived app label. The build and loader share this definition. The obsolete inline guard is removed from the viewer.
- Four download/progress unit checks passed (`loading-results-r130.txt`).
- All 11 compiled checks passed (`compiled-results-r130.txt`). These include the actual startup loader fetching the current compiled manifest, navigation, building and site files; deliberate stale-navigation rejection with diagnostic version details; public access protection; private variant isolation; and current floor/map/loading manifests.
- The secure build passed (`build-r130.txt`). Worker and adapter access checks also passed (`security-results-r130.txt`): 252 sealed source assets, original authorized hashes, direct-URL denial, ranged video and no client secrets.
- `qa/check-live-baseline.mjs` runs the same loader over HTTP against the deployed public Site. It reports each response status and the accepted app/navigation revision. It is intended to be run after publication.

## Scope and limits

This hotfix changes startup validation and diagnostics only. R129's WebGL2 preference, detailed furniture colours and contractor terrace geometry are retained. No graphics-engine migration runs again.

These checks validate the real data-loading path independently of graphics hardware. They do not certify rendered pixels, mobile FPS or native WebGPU behaviour.
