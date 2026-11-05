# R132 facade verification

Implementation changes were committed before tests and the secure build.

## Results

- All 538 source/unit tests passed, with no failures or skips (`test-results-r132.txt`). This includes the three new facade tests and existing source geometry, furniture, elevator, rendering lifecycle, private/public separation, material and collision coverage.
- All 23 tests against the final compiled production output passed, with no failures or skips (`compiled-results-r132.txt`). The new neighbour-facade test checks the real exported facade material and source-registered outward surfaces in all eight rotated/reflected building copies. Existing checks preserve all 43 apartments, stairs, gardens, terraces, private variant isolation and the 144 elevator exit stops.
- The actual patched facade shader compiles/links with Three lighting and instancing on native GLES3. Additional probes run its actual colour/joint body at district coordinate offsets and distant pixel footprints. They keep stone tone bounded and even within the tested stones. This is finite shader-pixel validation, not a full-scene or phone screenshot.
- The actual nine-storey source model has one disjoint cosmetic facade cover per storey. Apertures remain open. The test tolerates only Float32 rounding at adjoining panel edges; it rejects positive overlap in both panel dimensions.
- Comparing the actual R131 deployment building snapshot to the final R132 export reduces stone-only instances from 2,006 to 1,676 (330 fewer) and their source draw objects from 29 to 24. These are model counts, not measured frame-rate gains.
- Exterior wall-face ray audits report zero sampled exposed white wall faces in both the personal scene and public export (`facade-audit-r132.json`). Room ray audits report zero sampled stone surfaces facing the personal/public apartment rooms (`interior-audit-r132.json`). Audit sampling and trace-seam tolerances remain as documented in R131.
- The secure build and worker/adapter checks passed: 252 sealed private source assets, authorized original hashes, direct-URL denial, video ranges and no client secrets (`build-r132.txt`, `security-results-r132.txt`). The production password and session secret are preserved; only the matching encrypted-asset key is updated.

## Scope and limits

The fix unifies overlapping cosmetic veneers, stabilizes face-axis selection using transformed normals, bounds stone variation to 2.5%, reduces dark joint contrast and fades per-stone variation at distance. The limestone colour (#d9d2c5), matte roughness (0.96), 4 mm joints and physical wall/collision dimensions remain consistent. Both rendering engines use the same tone and course dimensions.

R131 bedding, seating, TVs and browser elevator transfers are retained. WebGL2 remains the default. These checks do not certify full-scene rendered appearance on the user's phone, phone FPS, physical native WebGPU hardware or immersive VR. The available cloud browser cannot initialize WebGL. Historical script wildcard suites with obsolete version expectations are not included in the reported production suite.
