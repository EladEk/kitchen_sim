# HomeStudio R104

## Real-time tour graphics

The tour keeps its React interface and Three.js renderer. Replacing React would
not change material shading, lighting or scene geometry; this release changes
those systems directly, without a new runtime dependency or downloaded engine.

Eleven CC0 scan maps add measured surface normals and roughness for clean
plaster, cotton fabric, oak and road aggregate. Cloth and wood also use scan
albedo detail, normalized to retain the selected finish colour. Normal/roughness
are linear data; albedo is sRGB. Texture scale uses metres, including instanced
and batched surfaces. Private ordered floor products retain their own photos,
dimensions, joints and finish settings. Clean walls do not receive weathered
plaster photographs or artificial dirt.

Rooms gain a local HDR environment captured from the actual visible scene.
The same prefiltered cubemap supplies approximate indirect diffuse colour and
rough reflections. One cube and one completed filtered environment are retained;
six faces are spread over separate frames, then reused in the room. Room, solar
and door changes invalidate the capture. The first capture waits briefly after
entry. It does not require the user to stop walking. It is a probe approximation,
not ray-traced global illumination or parallax-correct mirror rendering.

The uniform solar fill is reduced gradually indoors, while daylight exposure
continues to adapt gently. Small shared floor/wall lights remain as a fallback.
AgX tone mapping softens bright highlights. Fabric uses restrained dielectric
specular and sheen; cushions, pillows and duvet folds now change the actual
silhouette. Shared indexed soft meshes avoid duplicating high-resolution fabric
geometry. Facade mortar joints now affect the lighting normal as well as colour.

Mobile scan maps are capped at 512 pixels; desktop maps at 1024. Room probes are
64 pixels per face on mobile and 128 on desktop. Capture work is skipped under
the lower adaptive-quality tiers, during paused menus, image export and immersive
XR. A previously completed compatible probe can still be used in XR. Devices
without a capture fall back to the existing solar environment. Failed probes
release their targets and never block the main renderer; context restoration
allows a new attempt. Existing quality adaptation remains enabled.

## Master bedroom

The owner requested a half-turn relative to R103. The default master bed now
faces the opposite direction; its 180 x 200 cm mattress is unchanged. The headboard
is placed 25 mm clear of the ensuite-side wall. The television follows to the
opposite wall, facing the bed, with more than 90 cm clear beyond the foot.
The entrance door's full sweep and route to the room's walking destination are
checked against the actual scene. Only the old shipped default saved pose is
migrated. Deliberate custom placements and custom furniture dimensions survive.

## Photo/reference basis

The existing owner entry-stone photo, October lobby photo and master-room
construction photo guide matte wall/stone appearance and room geometry. These
are not calibrated colour measurements and the empty-room photo does not establish
a furnished bed pose. The requested orientation is the authority for the bed.

Additional official project gallery images were reviewed. They are marketing
renders, not a survey or verified photographs of this exact installed apartment.
They do not override the contractor plan or owner photos. New material scans
come from Poly Haven under CC0:

| Material | Scan width | Used channels |
| --- | --- | --- |
| [Beige Wall 001](https://polyhaven.com/a/beige_wall_001) | 3 m | Normal, roughness |
| [Cotton Jersey](https://polyhaven.com/a/cotton_jersey) | 0.3 m | Colour detail, normal, roughness |
| [Oak Veneer 01](https://polyhaven.com/a/oak_veneer_01) | 1.8 m | Colour detail, normal, roughness |
| [Asphalt 03](https://polyhaven.com/a/asphalt_03) | 2 m | Colour detail, normal, roughness |

[Poly Haven licence](https://polyhaven.com/license),
[official project gallery](https://efficapital.co.il/Effi-Afikim/),
[Three.js PBR documentation](https://threejs.org/docs/pages/MeshStandardMaterial.html).
Exact download URLs, SHA256 hashes and additional reviewed reference URLs are in
`public-view/assets/pbr-r104/SOURCES.json`.

## Install and validation

The full-source ZIP contains the complete project. The update ZIP targets an
existing R103 checkout: extract it beside package.json and replace matching
files. No dependency change is needed. Keep local environment variables and the
existing document password. Build and runtime must share DOCUMENTS_ASSET_SECRET
(or DOCUMENTS_SECRET when no separate asset key is configured). No passwords,
environment files, deployment vaults or signing/encryption keys are included in
the source downloads. Their private source photos remain in the private full ZIP.

Checks cover material colour/product preservation, physical texture scaling,
late texture cancellation, finite soft-mesh normals/footprints, bounded probe
ownership, renderer-state recovery, moving capture, XR/load fallback, day/night
invalidation, the corrected bedroom, all existing unit and district integration
flows, production compilation, and compiled Worker/Vercel authentication and
decryption. The patched Three physical shaders also compile/link on native GLES3
with normal maps, instancing, sheen, room environments and facade-joint relief.

The available browser has WebGL disabled. These checks therefore do not establish
the final visual result, GPU memory, phone/headset frame rate or complete 3D
browser navigation. Those need evaluation in a compatible browser/device.
The R103 service descent, map, saved views, recovery controls and privacy boundary
are preserved.
