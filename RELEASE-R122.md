# Home Studio R122

R122 addresses the reported tour loading sequence (about 96% followed by 0%) and the R121 WebGPU texture copy failure when the phone viewport changed from 492×705 to 492×746 pixels.

## Changes

- A selected view prepares its actual destination room, lighting and first displayed frame in one operation. The render loop recognizes the prepared room rather than starting another room load immediately afterward.
- Progress continues within the same operation; stale progress callbacks are invalidated. A new explicit selection still starts a new operation at 0%. Only a successfully displayed frame completes the UI progress at 100%.
- GPU preparation owns the renderer and camera until it finishes. Mobile viewport changes are coalesced and applied afterward. A newer selection waits for cancelled native compilation to release that ownership.
- Native compilation binds the framebuffer actually being prepared, and preparation uses the same MRT postprocessing pass as the subsequent tour frame. The identical mobile pipeline stays allocated when moving indoors.
- On native WebGPU phones, the existing interior IBL supplies room reflections without an additional synchronous six-view cubemap capture in each room. The nearby live bathroom mirror remains available. Desktop room probes and WebGL behavior retain their existing paths.
- The pinned Three.js r185 compiler now builds shaders sequentially with an 8 ms yield budget and allows at most four asynchronous pipelines in flight. Validation scopes close before awaiting a pipeline. A failed pipeline or lost GPU stops preparation instead of reporting successful completion.
- Repeated diagnostic stages retain the latest measured batch details.

## Installation and complete files

Use the full source archive, or copy all complete files from `HomeStudio-R122-UpdateFromR121.zip` over R121. Run the usual dependency installation and secure build. The existing installation/build scripts automatically apply both narrow, checked Three.js backports to r185 source and its exported WebGPU bundle. Do not copy a previously generated `node_modules` or old Vite cache over the patched installation.

Keep the existing production password and session secret. Secure builds require the asset encryption key matching their deployed runtime. No production credentials are included in these archives.

## Verification

- Source changes were committed before checks, as requested.
- Full source suite: 497 passed. After adding delegated first-draw preparation, 19 affected preparation/reflection tests passed, including two additional regressions.
- Compiled public/personal flows: 17 passed. This includes walking, stairs, service rooms, maps, the master bed and exterior/interior material separation.
- Compiled document worker: 252 encrypted originals; direct unauthenticated access denied; authorized original hashes and video ranges verified; client bundles contain no secrets.
- Native Dawn validation with the phone's 64 KiB uniform binding limit: actual building + GLB furniture + MRT/AO/bloom/FXAA; viewport change 492×705 → 492×746; explicit physical transmission glass; one presentation pipeline; cached revisit compiled zero new objects. No GPU validation errors. See `qa/native-tour-r122.txt`.
- The earlier 1,758-instance capacity regression, low/high draw counts, MRT and shadow variants also passed under the same 64 KiB limit. See `qa/instance-limits-r122.txt`.
- A fresh extraction of the official pinned Three.js package, patched twice, exactly matches all six deployed dependency files. See `qa/install-patches-r122.txt`.

Native tests use Dawn's null backend. They verify API calls, bindings and state transitions; they do not verify final pixels, physical ARM driver behavior or phone FPS. The physical phone should still be refreshed to R122 and checked through the same tour transition.

Compiler scheduling reference: https://github.com/mrdoob/three.js/pull/34816. The application keeps its pinned r185 API, the R121 instance-capacity correction, and a four-pipeline mobile bound.
