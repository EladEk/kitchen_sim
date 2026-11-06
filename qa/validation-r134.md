# R134 verification

Implementation was committed before tests in 6121cbae055f0b948017ac61a3ef7329054ad65a. Later release changes contain only documentation and the recorded surface audit.

- All 543 source/unit checks passed, without failures or skips (`src/*.test.mjs` and `public-view/*.test.mjs`).
- The secure production build passed and sealed 251 private source assets.
- All 14 selected production checks passed, without failures or skips: current-revision startup, public/private isolation, all 43 apartment doors, safe elevator exits across all eight building registrations, interior/exterior wall finishes, facade materials and shared texture ownership.
- Compiled Worker and portable adapter checks passed: authenticated original hashes, denied direct private URLs, video ranges and absence of client secrets.
- The real installed facade fragment was tested on native GLES using deliberately mottled incoming albedo at near and distant coordinates and on opposite wall orientations. It retained the selected material colour. The complete expanded Three physical shaders also compiled and linked on GLES3.
- The fallback facade height and roughness maps are flat, its neutral colour map has only bounded fine grain, and photo conversion retains the chosen colour with matte roughness and no bump relief.
- The actual merged district and walking facade batches have zero overlapping eligible rectangular stone layers in the audited 16 mm depth band. Each uses one shared albedo, one shared normal and one shared roughness map. These are distinct channels, not repeated colour layers. Original collision source buffers are unchanged. See `surface-audit-r134.json` for the counts.
- The compiled public application was opened through the managed preview; the header displayed R134. Its diagnostic log reported that this browser has WebGL disabled (`GL_VENDOR = Disabled`, `GL_RENDERER = Disabled`). Full-scene browser rendering could not be checked in this environment.

## Limits

The pixel probes isolate the material. They do not establish that material shading was the only cause of every patch in the supplied phone screenshots. No full-scene phone image, phone frame-rate, physical WebGPU or immersive VR verification is claimed. The WebGPU material changes have source/build coverage; the native pixel probes exercise the WebGL fragment.

Layer union remains limited to rectangular vertical stone faces in the district and walking batches. Other shapes and the original section/collision geometry retain their original triangles.

R133 elevator selection, brown-beige lobby walls (#c5ad91) and lobby panelling (#ad9074) are retained. This release changes the facade material and adds a visible revision label; it does not change building geometry, window openings or apartment layouts.
