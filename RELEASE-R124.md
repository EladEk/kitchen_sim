# HOME STUDIO R124

Fixes walking hitches in the lobby and repeated preparation at room boundaries.

## Runtime changes

- Walking renders exact spatially batched architecture instead of thousands of individual source meshes. GLB upholstery and foliage remain instanced. Original geometry continues to own collisions and actions; moving doors/cabinets remain independent. Spatial cells and floor masks preserve culling, and generated buffers are reused across buildings and released on disposal.
- One GPU preparation key covers an apartment or common floor. Lighting, exposure, room labels, and mirrors still follow the occupied room. Nearby objects are prepared in all directions. Three's own compile-time frustum culling is temporarily disabled for the selected work, then restored even on cancellation/failure.
- Transparent front/back material sides are retained per asynchronous compilation item. This fixes preparation of a different pipeline from the one used during walking. The pinned r185 patch applies to source and exported bundle, after the existing sequential fixes.
- Sun shadows retain a fixed anchor over short steps and refresh after meaningful camera displacement, solar/quality changes, or an occluder action. Interior shadows refresh when the light moves or doors/other interactive geometry change. Neutral bounce and smooth exposure transitions remain active.
- Actual local and distant sun-caster shadow variants are primed under the existing loader. A temporary render hook preserves ordinary beauty culling for distant casters, with full restoration on failure.
- Invisible service markers are omitted from walking display batches. Smaller automatic resolution adjustments no longer reset all preparation caches or open a new loader. Significant quality changes retain the existing preparation flow.
- Slow walking frames now report phase timings, compilation counters, camera position, and total draw calls, at most once per five seconds. Preparation requests log their reason. Forced engine choice and loading percentages remain available.

## Verification

Same full-building scene, real GLB primitives, sky/interior IBL, sun and local shadow; strict 64 KiB WebGPU uniform limit:

| Metric | R123 | R124 |
| --- | ---: | ---: |
| Typical steady lobby draw calls | 9,247 | 462 |
| Typical steady apartment entry draw calls | 9,014 | 461 |
| Additional scene/shadow pipelines while turning through 12 apartment room areas | observed cold builds | 0 |
| Apartment preparation keys across those room areas | room-specific in viewer | 1 |

Dawn null validates GPU commands, bindings and work counts. These are not phone FPS measurements or pixel verification. The physical ARM device still needs a live check. The first effect-only AO variant can still initialize on the first follow-up frame; it is distinct from the eliminated scene/shadow compilation while crossing rooms.

- Full source/assets suite: 508 passing checks, followed by targeted final preparation/display regressions.
- Compiled scene flows: 17 passing checks covering public/private access, every reflected building, stairs, pump/service rooms, apartment maps, registered bed placement, and interior/exterior finishes.
- Actual mobile-profile room crossing regression: 12 room areas, one preparation key, zero new scene/shadow pipelines, no GPU validation errors.
- 1,758-instance capacity regression: draw-count changes and MRT/shadow variants remain within the 64 KiB uniform-binding device profile.
- Fresh official Three 0.185.0 package: all four dependency fixes apply in one run, are idempotent, and match the deployed dependency files.
- Private assets remain encrypted and authentication/session credentials are preserved.

## Install/update

The update archive contains complete changed files relative to published R123 commit `2a434f28c688ee1c3ae45cbae2facea3da06c7a7`. Copy its files over the R123 project, then run the normal dependency installation/build. `postinstall` applies all four pinned Three fixes in order. No extra native GPU package is needed in the application; the optional Dawn package used for verification stays outside project dependencies.

Preserve the existing deployment secrets. A protected production build requires a valid server-side encryption key; never include plaintext private plans or secrets in browser output.

Primary references reviewed: Three r185 Renderer.compileAsync/projectObject, ShadowNode/ShadowFilterNode, RenderPipeline, and Info source; https://threejs.org/manual/pages/webgpurenderer and https://threejs.org/docs/pages/RenderPipeline.html .
