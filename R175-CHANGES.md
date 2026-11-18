# HomeStudio R175 — Mediterranean daylight and remaining rendering fixes

Based on the published R174 source `cf115f77bbbd7a81fe3bbfc2f79251640669aefb`
and its release checkpoint `408636e0fdf93ecd39e71a82c7aa56fa8f09386c`.

| Task | Result |
| --- | --- |
| 1. Clear glazing | Mobile, reduced quality and XR fallback opacity is 0.075 per pane. Glass tint is #f6faf8 with #dff0ec attenuation over 0.65 m. WebGPU border/grazing AO is softened to a minimum of 0.94 × 0.95. |
| 2. Mediterranean sky | IBL retains at least 0.16 upper-sky and 0.42 ground chroma with the requested 1.03/1.01/0.97 warm RGB gains. Sun intensity is 3.45 × sqrt(daylight); celestial environment intensity uses 1.24 × daylight. Both raster paths share warm fog (#efeae0, density 0.00008, 95% interior reduction) and 1.85 default turbidity. The physical sky uses Rayleigh 2.1, cloud coverage 0.02 and cloud density 0.04. Daytime sun and fill colors match the requested warm palette. |
| 3. Room warmth and season | Mobile paint environment is (0.97, 0.94, 0.89); room probes and window/floor/wall bounce use the specified warm balance. Opening starts on 2026-05-15 at noon. The existing explicit live-time mode still follows Asia/Jerusalem, including date rollover and DST. |
| 4. Wall seams | Bottom grout measures absolute floor distance in both TSL and GLSL. Its pixel footprint uses continuous world height, preventing artificial widening at a storey modulo boundary. Paint curvature has the requested 0.035–0.22 deadzone with 0.26 maximum strength. |
| 5. Probe invalidation | Reactivating a cached probe increments material.version when a previously null envMap gains a texture. Reusing an existing texture or switching between non-null textures avoids an unnecessary shader invalidation. |
| 6. Regression coverage | Retains all 63 previous Clean cases, updates obsolete glass calibration assertions, and adds 10 R175 cases. The tests evaluate actual TSL graphs and cover glazing, IBL, both atmosphere paths, solar defaults/live time, room lighting, negative slab heights, curvature derivatives and cached-probe activation. |

## Sky chroma test clarification

The exact requested chroma and RGB gains do not guarantee red > blue for an
originally blue zenith sample: retaining blue sky chroma can keep blue dominant.
The real-sky regression therefore checks retained chroma and an increased red/blue
ratio. A neutral-daylight fixture separately checks red > blue. The prescribed
lighting coefficients are unchanged; this avoids forcing the sky itself orange.

## Validation

Changes are committed before tests. The focused lighting/rendering regression
set passes 36/36. Full-source npm test passes 495/495 and the public suite
passes 223/223, with zero failures or skipped cases. The private/public/Worker
production build passes. Exported Clean verification follows from this source.

Both downloads are generated from the published source. FullSource retains
private reference documents and development tools; Clean retains required
textures, meshes, decoders and the same rendering settings. No external asset
dependencies are introduced. Dependencies, secrets and generated private build
output are excluded from the source archives.

No Android GPU or on-device appearance verification is claimed. The previous
Chromium attempt was blocked by this execution environment; arithmetic, lifecycle
and production-build checks establish their stated coverage only.
