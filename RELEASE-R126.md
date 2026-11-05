# HOME STUDIO R126

Repairs native WebGPU texture lifetime failures during adaptive quality changes and interior/exterior presentation changes, including the protected personal entry.

## Changes

- Sun and interior shadow targets remain attached to their native ShadowNode owners. Resolution changes use `RenderTarget.setSize()` before scene preparation, and request a shadow refresh. WebGL2 retains its required reallocation behavior and comparison-depth initialization. Final owner disposal still releases the resources.
- The pinned Three r185 observer now tracks shadow map dimensions for every object sharing a material. This narrowly backports Three PR #34361; a resolution change refreshes bindings without changing shader keys.
- Native object bindings also refresh when the output target changes, even when its size and attachment formats match the previous target, and when output dimensions change. The checks precede static/bundle cache exits. They adapt the fixes in Three PRs #34612 and #34968 to r185's boolean refresh API.
- Both backports apply to the SDK's source and exported WebGPU bundle through the existing ordered postinstall/predev/pretest/build hooks. The four earlier pinned fixes remain intact. No application dependency upgrade is required.
- Repeated ratio/interval updates at the same shadow resolution reuse the static shadow. Unchanged glass quality does not repeatedly rewrite material settings.
- Quality-change diagnostic events record the engine, selected quality mode, tier, requested shadow size and target policy. Public/personal manifests, refresh messages and image export names identify R126.

## Verification

- 520 source/asset checks passed, including real shared-material observer behavior, native target identity/size, WebGL2 comparison textures, static-cache behavior and owner cleanup.
- The pre-backport full personal scene reproduces the exact `Destroyed texture "ShadowDepthTexture" used in a submit` validation error. The fixture covers quality reduction, recovery, equal-size updates, trimming, prepared postprocessing and actual private geometry.
- A separate control confirms that the unpatched output observer misses equal-size target replacements. Native render tests exercise repeated plain/enhanced presentation replacement, suspension, size changes and effects restoration.
- All 32 quality stages across desktop/mobile/enhanced/full-personal fixtures pass GPU validation. Six real private living/bathroom/outdoor transitions, including bounded room probes and the live mirror, also complete without GPU validation errors. Ten output-target lifecycle transitions pass. Format-copy warnings in the null-backend fixture are not a pixel-quality verification.
- Clean Three 0.185.0 installation applies all six pinned fixes; running the hook again leaves them ready without duplicate edits.
- Compiled scene/access checks cover all eight building transforms, 43 apartment destinations, common stairs/service rooms, parks, personal geometry isolation, maps and protected source assets. Authentication/session configuration is preserved.
- Native regressions use Dawn null with the 64 KiB uniform-binding profile. They validate API resources/bindings and work counts, not final pixels, Intel/ARM driver behavior or device FPS. Browser-driver confirmation is still necessary.

## Complete-file update

The update ZIP contains whole changed files relative to published R125 commit `6db792869ec44285b79c0cc5f31e7e3bec5bf8f3`. Copy them over R125 and run the usual dependency/build workflow. Existing installs must run `node scripts/apply-three-fixes.mjs` (also invoked by dev, test and build). The full source ZIP contains protected personal material and should remain private. Keep existing production password/session secrets; use the matching build asset secret for encrypted assets.

Primary references: https://github.com/mrdoob/three.js/pull/34361 , https://github.com/mrdoob/three.js/pull/34612 , https://github.com/mrdoob/three.js/pull/34968 and the pinned r185 renderer/shadow/observer sources.
