# HomeStudio R115 — WebGPU and TSL with WebGL2 compatibility

React 19.2.6 and Three 0.185.0 remain pinned. The shared public/personal district
viewer initializes a native WebGPURenderer on secure supported devices, with
bounded initialization and a fresh WebGL2 canvas on failure. WebXR uses the
established WebGL2 path. Options show the active renderer and offer an explicit
compatibility choice. Device/draw/preparation failure rebuilds WebGL2 under the
loader, preserving a valid tour/orbit pose.

WebGPU uses TSL architectural finishes (stone courses, metric PBR maps, shallow
tile joints and bevels, roughness variation, wall cavities/skirting and garden
paving/grass variation), native PMREM, TSL sun/moon disks, interior/room probes
and a throttled planar mirror. Default effects are half-resolution GTAO,
restrained bloom, AgX and FXAA. Desktop high quality indoors additionally uses
SSGI with spatial denoising and half-resolution SSR with actual surface
roughness/metalness masks. Performance priority and XR bypass screen effects.
WebGL2 uses postprocessing 6.39.6 and N8AO 2.0.1 with restrained bloom/AgX/FXAA.

Released realism-effects 1.1.2 imports WebGLMultipleRenderTargets, removed from
Three r185. It is not shipped as a broken/unused dependency. The requested
GI/reflection features use maintained native Three TSL nodes instead.

Ordered photographic flooring preserves dimensions, non-mirrored tile rotation,
explicit sampling gradients, shallow joints and dielectric physical parameters.
A WeakMap keeps conventional source materials available to the separate photo
path tracer without adding references to serializable scene metadata.

Native warmup uses real non-owning Object3D lists and batches compilation.
Duplicate regular draw layouts share preparation; instanced objects retain
identity because r185 binds their buffers to object-specific shader state.
Shadow receiver shaders are prepared before their first shadow draw. Original
shadow-update flags are restored in finally. Preparation exceeding the device
budget requests the compatibility renderer; the loader waits for real drawing.
Geometry, apartment placements, stairs, doors, maps and private access are
preserved. The R114 first-frame spotlight fix remains in place.

This release is not offline baked global illumination or a complete replacement
of all procedural furniture with GLB assets. SSGI/SSR are screen-space effects;
offscreen information still relies on probes/IBL. Physical phone/VR visuals and
60 FPS on every device are not asserted. Verification records are kept in qa/.

The update ZIP contains complete changed/new files relative to R114 commit
2892ba8af9694967567a9d08dbbe0724092a04b5. Full source excludes environment secrets,
node_modules and generated deployment output.

Verification: 461 unit/asset tests passed; native API checks validate finish
shaders, async compilation/first draw, AO/GI/SSR/denoising, mirrors, PMREM,
room probes and restoration after effect failure. The complete exported
building correctly requests compatibility when native preparation exceeds its
device budget in the null backend. This is not a claim of a full-building GPU
visual/performance pass. Seven real N8AO/effect GLSL programs compile/link in
native EGL. Browser pixels and physical phone/VR performance remain unverified.

The optional native validator needs Dawn on a supported desktop platform:
`npm install --no-save --package-lock=false webgpu@0.6.2`, then
`node qa/check-webgpu-r115.mjs` (add `--building` for the large-scene budget
check). Dawn is deliberately excluded from project dependencies so ordinary
installation/builds, including Termux, do not require its native binary.

The final compiled Site also passes all 16 navigation/district/access integration
checks. Protected source assets remain encrypted (252 entries); direct private
URLs are denied and authorized source hashes/video ranges remain correct.
