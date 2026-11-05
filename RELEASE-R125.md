# HOME STUDIO R125

Fixes automatic engine selection and cold graphics work during lobby/apartment walking.

## Changes

- Automatic browser rendering attempts WebGPU independently of passive headset capability. A supported `immersive-vr` probe no longer selects WebGL2 or tears down a running native renderer. Forced WebGPU remains strict, and driver failures still use the automatic compatibility path.
- VR preparation is explicit. In automatic native mode the VR action prepares the WebGL2 backend while preserving the standing view. Once preparation finishes, a second user click requests the immersive session synchronously, retaining browser activation requirements. The chosen engine preference is preserved. Passive headset status updates no longer clear held walking input.
- The walking cache now matches its actual preparation coverage: one key per building/floor covers the lobby and apartments. Room lighting and maps still follow individual room/apartment polygons.
- Real inactive tree/car detail tiers, neighbouring building contexts and nested courtyard meshes are prepared with their actual GPU buffers. Foliage colour attributes and placement matrices exist before a tier first appears. Temporary counts/visibility restore on completion, abort or failure; shadows refresh and a final normal frame draws before readiness is reported.
- Small walking instance batches share a 32-matrix allocation layout (larger batches use powers of two), preserving exact draw counts, independent matrices and spatial culling. This reduces equivalent shader variants without changing furniture geometry.
- Both phone backends use the existing interior IBL and live mirror instead of six scene captures every time a room is first visited.
- Log entries retain their own engine and attempt number, including after a later switch. Startup records whether the cause was initial load, explicit engine choice, VR preparation, or graphics failure. Walking/preparation entries include the actual engine and prepared floor key.

## Verification

- 516 source/asset checks passed, including VR request timing, forced engines, fallback errors, LOD placement/colour stability, instance-buffer ownership, floor scope, abort cleanup, final displayed state, and log attribution.
- Full-building native WebGPU fixture uses actual public geometry, GLB furniture, sun/interior lighting, postprocessing and the phone's 64 KiB uniform-binding limit.
- Lobby-to-apartment handoff runs without a second preparation. It and all 12 apartment room areas create zero new scene/shadow pipelines, with no GPU validation errors.
- The native fixture uses Dawn null. Work counts/API validation do not establish Android FPS, physical ARM driver behavior or final pixels. First preparation still depends on the phone and scene; no fixed load time or FPS is promised.
- The final compiled flows check every building transform, stairs/service rooms, apartment maps and protected personal assets. Production authentication/session values are preserved.

## Complete-file update

The update archive contains whole changed files relative to published R124 commit `8a2f78774245164dccbd92b2ddc49860193b3774`. Copy them over R124 and use the normal dependency/build workflow. The four pinned Three 0.185.0 fixes are unchanged and remain applied by postinstall. Native Dawn is used only outside application dependencies for QA.

The full source archive includes protected personal source material. Keep existing server-side secrets; do not include private plaintext or secret values in public build output.

Primary references reviewed: pinned Three r185 WebGPURenderer/XRManager, Renderer, Instance and WebGLRenderer sources; https://threejs.org/manual/pages/webgpurenderer .
