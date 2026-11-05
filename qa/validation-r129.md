# R129 verification

Every source change was committed before tests.

- All 533 source/unit checks passed, with no failures or skips (`test-results-r129.txt`). This includes the actual Meshopt GLB decoded through Three's production loader: brown scanned upholstery, red bed fabric retaining its normal maps, and two red accent pillows sharing one extra geometry part. The engine-preference check covers the first-visit migration to WebGL2 and subsequent persistent explicit selections.
- All 19 selected compiled/security flows passed, with no skips (`compiled-results-r129.txt`). These are the R128 production suite plus the new terrace flow. The real exported geometry and walking batches have paving under all four contractor terrace centres in all eight rotated/reflected buildings. Private variant isolation, floor maps, entrances, service stairs and common stairs also pass.
- The secure build and worker/adapter checks passed (`build-r129.txt`, `security-results-r129.txt`): 252 sealed source assets, direct-URL protection, authorized original hashes, ranged video and no client secrets.
- A direct baseline comparison using the committed R128 source found district geometry buffers of 72,054,044 bytes in R128 and 72,063,164 bytes in R129 (9,120 bytes added). Collision-index buffers were 4,935,920 and 4,936,392 bytes respectively (472 bytes added). This comparison uses the exported baseline before detailed furniture replacement; the new sofa accents reuse existing decoded fabric data.

## Expanded legacy checks

An initial wider wildcard test run also picked up two older checks outside the R128 production suite. The 65 MB geometry ceiling already fails on R128's 72.05 MB baseline; it was not raised in this release. A visibility check expects the unbatched source model to remain visible while walking, although the current controller renders its walking batches instead. The same check fails on the unchanged R128 worktree. These legacy expectations remain unchanged; this release does not claim the entire historical wildcard suite passes.

## Source and appearance limits

Terrace outlines are the four independent line paths on page 3 of the original building plan, registered using the existing ground control and deskew. Tile appearance, 60 cm joint pattern and the small surface elevation are illustrative. No private planned extension is exported into the public baseline.

Geometry, decoded materials, default selection and resource/access protection are verified. A usable 3D graphics context is unavailable in the cloud browser, so rendered pixels and phone FPS are not visually verified. R129 changes the default engine; explicit WebGPU remains available and is not newly certified on physical GPUs by these checks.
