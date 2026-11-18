# HomeStudio R174 — Visual and architectural fixes

Integrated on the canonical Site repository at source commit
`d9f3b3dbb07362187bbcc87d94080d1fbd478dc3`. This full distribution retains
the private reference media, development tools and original test suites.
The Clean export comes from the same committed source, with only its normal
distribution adjustments and reference-media exclusions.

| Task | Implemented behavior |
| --- | --- |
| 1. Synthetic turf | Removes turf parallax raymarching and striped blade fields. Jittered, rotated 2D tufts use a green Napoleone-style palette, screen-footprint fades for color, AO and relief, and soft fiber sheen. Legacy turf normal/bump textures no longer reintroduce unfiltered relief. |
| 2. Architectural joints | Both WebGPU wall paths share explicit 75 mm skirting, warm cement-grey top/bottom seams and metre-spaced vertical cuts. Wall contact shrinks to 18 mm at 10% strength. WebGL uses matching masks. Floor joints use lighter grout, 88% minimum AO and a 0.22 mm recess; the dry-floor WebGL material matches. |
| 3. SSR channel mapping | Surface R is roughness, G is real metalness and B is eligibility. The compositor now applies B × mix(0.42, 1, G) × (1 − R)². |
| 4. Frame projections | ModelView creates its element projection cache and service Vector3 once, outside the animation callback. DOM coordinates are parsed only when their anchor changes. |
| 5. Room probes | Evicting one probe preserves the original material-binding map. Only lingering references to the evicted texture are restored before disposal. Cached-room reactivation and final reset/disposal retain their bindings. |
| 6. Exposure queries | Camera and target containment queries reuse cached results until their evaluated position moves over 2 cm or walking/focused mode changes. Small movements accumulate against the last evaluated position. Sun and exposure smoothing continue updating. |
| 7. Adaptive GTAO | Indoor enhanced weight is 0.52; exterior weight is 0.42. Effects-off and AO-disabled quality tiers use zero, from initialization through later quality changes. |
| 8. Countertop polish | Worktop and stone/porcelain island surfaces receive 0.18 clearcoat and 0.25 clearcoat roughness. The island top is explicitly tagged as a worktop; its cabinet fronts keep their own finish. WebGPU conversion preserves the polish. |
| 9. Regression tests | Adds 11 tests in rendering-fixes-r173.test.mjs and preserves all 52 previous tests. Actual TSL arithmetic graphs are sampled for turf color, wall AO and skirting colors; lazy shader graphs are expanded to reject grass loop nodes. |

## Three.js r185 SSR detail

The non-stochastic r185 SSR implementation multiplies its raw ray-hit color
by `metalnessNode`, even with `reflectNonMetals: true`. Feeding zero physical
metalness directly into this stage would erase porcelain and glass reflections.
It therefore receives B as a binary tracing mask, while real metalness G
controls the requested dielectric/metal reflectance in the compositor. This
keeps tracing eligibility separate from the final material response.

## Verification

- Full `npm test`: 485 passed, 0 failed, 0 skipped.
- Public suite: 223 passed, 0 failed, 0 skipped after the production build.
- Clean core: 63 passed, 0 failed, 0 skipped on the same R174 runtime changes.
- `npm run build`: passed for the personal client, public client and server.
- `git diff --check`: passed.
- Runtime revision and generated public-baseline identifiers are R174.
- No on-device visual verification was possible here. A headless Chromium
  GPU check was attempted but browser startup was blocked by the execution
  environment's socket restriction. TSL regression tests and production builds
  do not establish appearance on the user's Android GPU.

## Running

Use Node.js 22.12 or newer, then `npm ci` and `npm test`.
Configure the local secrets described in README.md before `npm run dev`.
The archive contains complete source files and required runtime assets;
generated build output and node_modules are excluded.
