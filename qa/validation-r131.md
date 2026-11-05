# R131 verification

Implementation changes were committed before tests and the secure production build.

## Passed checks

- 535 source/unit checks passed, with no failures or skips (`test-results-r131.txt`). This run precedes the final expanded return-strip sampling. After that change, all 26 focused wall, source-corner, material, interior, furniture and collision regression checks passed (`finish-regression-r131.txt`).
- The final secure build passed (`build-r131.txt`). It exports the public baseline at revision 131 with 43 apartments, and seals 252 private source assets.
- All 22 checks against that final compiled production output passed (`compiled-results-r131.txt`). They cover the actual public startup loader, intentional stale-revision rejection, private variant isolation, all public room/terrace/map data, stair/service routes, inward/outward material assignment through exported walking batches and reflected building registrations, and elevator metadata and exits.
- Both lifts have collision-checked standing exits on every floor 0–8 in all eight building registrations: 144 stops. Invalid floors and lift IDs are rejected. The public export retains the call panels needed to open the selector.
- The final facade ray audit found zero exposed white wall faces at its sampled wall-face centroids in both the personal source scene and the exported public building (`facade-audit-r131.json`). The audit excludes horizontal faces and physically capped surfaces. It treats sub-2 cm core/unit trace seams inside party walls as occupied; it does not classify those seams as exterior space.
- The independent room ray audit found zero stone surfaces facing the sampled personal/public rooms (`interior-audit-r131.json`).
- Worker and adapter security checks passed (`security-results-r131.txt`): original authorized file hashes, direct-URL denial, video range access, no client secrets and available rendering-floor data. The existing production password and session secret are preserved; only the matching encrypted-asset key changes for deployment.

## Layout and appearance scope

All 39 upper-apartment sofas and the three generic garden layouts use real solid backing walls with 6 cm clearance and a television console opposite. Public garden unit 4 derives from the generic source. Physical walls, openings and routes are checked; the conservative living-zone annotations allow 35 cm registration tolerance. All 41 rugs are retained. Saved personal furniture overrides are preserved.

Decoded furniture assets retain their scanned textile maps and normal maps. Linen is beige; sofa accents use a separate red material, preserving the brown upholstery.

## Verification limits

These are source, decoded-asset, geometry, collision, HTTP-loader and compiled-output checks. The available cloud browser cannot initialize WebGL. No rendered-pixel, phone FPS, physical WebGPU or headset result is claimed. Facade and room ray checks are finite geometric samples, not a pixel-complete visual inspection.

Elevator use is a safe, quick lobby-to-lobby floor transfer with the existing preparation loader, not an animated shaft ride. The HTML floor selector is available in browser tours and disabled during immersive VR.

The production suite above is explicit. Historical wildcard script suites with obsolete R128/R129 expectations are not reported as passing. No dependency inputs changed.
