# Home Studio R123

The owner's R122 log has no GPU validation failure, but entering the tour took about 201 seconds. Shader compilation finished after 61 seconds, drawing took another 25 seconds, and the first interactive-frame record came about 115 seconds later. The old log cannot distinguish all CPU/GPU work from browser suspension during that last interval.

## Rendering changes

- Equivalent instanced meshes now reuse the same WebGPU shader source and pipeline. Previously unnamed buffers embedded globally increasing node IDs in their WGSL. The correction preserves each object's matrix buffers and all explicitly named uniforms.
- The scene precompiles at its actual depth in our rendering graph: output quad → FXAA input texture quad → MRT scene pass. Camera/render buffers remain separate for each render context. We do not remove render-context identities or share those buffers across nested renders.
- Dependency fixes run sequentially. A clean installation must retain the R121 instance-capacity fix, R122 compilation scheduling and R123 cache changes on its first run. Independent asynchronous patch imports could otherwise overwrite the shared exported bundle.
- First interactive-frame diagnostics now report district, sky, interior, reflections, presentation and photo CPU times, plus new node builds and synchronous/asynchronous pipeline creations. Preparation-to-frame waiting is recorded separately. Render-loop suspension/resumption and document visibility are recorded to help identify background pauses.

The pinned Three.js r185 API, model geometry, materials, selected rendering quality, forced engine behavior, private access and VR paths are preserved.

## Reproduced and measured

The small native regression first ran against R122: two equivalent instanced meshes produced two asynchronous GPU pipelines, and their first postprocessed render built two more pipelines synchronously. R123 produces one asynchronous pipeline, with no additional scene builds or pipelines in the first two renders. Matrix bindings remain independent. The same result passes for mobile AO and enhanced desktop GI/SSR graphs.

The actual public building, GLB furniture, restored finishes, sky IBL, indoor IBL, sun and room shadows were also tested:

| Native API fixture metric | R122 | R123 |
| --- | ---: | ---: |
| Overview first-draw synchronous scene pipelines | 540 | 67 |
| Lobby first-draw synchronous scene pipelines | 1,432 | 154 |
| Additional lobby pipelines in three follow-up frames | 189 | 0 |
| Lobby preparation time in this fixture | 53,031 ms | 30,387 ms |
| Cached lobby preparation time in this fixture | 2,385 ms | 210 ms |

See `qa/live-frames-baseline-r122.txt`, `qa/live-frames-r123.txt` and the shader-reuse reports. These are Dawn null-backend API measurements, not timings from the owner's ARM phone. Final pixels, browser UI behavior and phone FPS are not verified by these tests; scanned-image decoding is omitted from the live-frame fixture.

## Checks

- Source changes were committed before test batches.
- Full source/assets suite: 501 passed. Preparation regressions: 23 passed. Final frame/lifecycle checks: 12 passed.
- Compiled public/personal geometry and walking flows: 17 passed, covering maps, stairs, service rooms, master bed and interior/exterior material separation.
- Secure build and worker checks retain 252 encrypted originals, denied direct private URLs, authorized hashes, video ranges and absent client secrets.
- Native validation retained the exact 492×705 → 492×746 resize, transmission glass, percentage progression, cached revisit and the 1,758-instance/64 KiB regression, including MRT/AO/bloom/FXAA and shadow variants. No GPU validation errors.
- First-run and second-run hashes from a fresh official Three.js package match all seven dependency files used in the build.

## Complete-file update

Use the full source ZIP or copy every complete file from the update ZIP over R122. Install dependencies and run the usual secure build; the existing scripts apply the checked backports automatically. Keep the production password and session secret. The build's asset encryption key must match its deployed runtime. No production credentials are included in the download.

Upstream references:

- https://github.com/mrdoob/three.js/pull/34872
- https://github.com/mrdoob/three.js/issues/34681
- https://github.com/mrdoob/three.js/pull/35014

R123 uses the narrowly scoped pass-depth correction for its tested graph, while retaining separate buffers per context. It does not backport the broader shared-context refactor from PR 35014.
