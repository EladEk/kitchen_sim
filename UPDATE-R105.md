# HomeStudio R105

## Stable interior daylight and shadows

R104 replaced the whole scene's environment map with a room capture, then fell
back to the blue sky at a room boundary. That could change diffuse colour and
brightness abruptly. R105 removes room-cube rendering from the walking viewer.
One unchanged solar environment remains active; its indoor contribution and the
hemisphere colour ease toward neutral warm daylight without a per-room IBL swap.
The old room-environment API is an inert compatibility controller.

A single ceiling-fill spotlight adds actual shadow mapping inside the occupied
room, including mobile and XR when screen-space AO is unavailable. It uses a
room-polygon anchor, keeps its neutral colour, fades down before changing rooms,
and refreshes its shadow at a bounded interval. Mobile shadows use 512 pixels
(256 under load), desktop 1024 (512 under load). There are no room cubemaps or
six-face refreshes. The fill is an illustrative daylight approximation, not a
surveyed fixture location or ray-traced global illumination. Solar night remains
night. Existing GTAO contact shading is retained where the device budget allows.

## Bed position from the annotation

The uploaded map mark places the bed in the lower-left part of the master room,
near the lower wall. The centre is now approximately (1.70, 14.38) in the native
plan's metre coordinates. The requested facing from R104 is retained. The private
180 x 200 cm mattress keeps its dimensions; the bedside pieces move with it and
the television remains aligned opposite. The side approach and full entrance-door
sweep are checked against the actual meshes.

The screenshot showed the public plan, whose generic apartment-4 bed was separate
from the personal bed. Its position and orientation are now corrected too, using
the generic public bed and materials. Other ground apartment templates retain their
own furniture. The personal plan continues to replace only apartment 4 at 4102.
Only known obsolete shipped poses migrate automatically; intentional custom
placements and furniture dimensions remain editable.

The source annotation is kept as `/house/bed-placement-r105.jpg`, behind the
existing document password. This is a requested furnishing location, not a new
measurement of the building. Walls and openings are unchanged.

## Doors, interior walls and lawn

All ordinary plaster/paint surfaces receive physically scaled normal and
roughness detail. Painted door leaves receive restrained grain relief while
retaining their existing colours: dark entrances, light interior doors and sage
shared corridors. Shared wall maps are reused, rather than decoded separately
for each material. Ordered floor/wall products retain their own protected samples.

The lawn uses [ambientCG Grass004](https://ambientcg.com/view?id=Grass004), a CC0
procedural PBR material representing roughly 1.4 x 1.4 metres. It is not a
photograph of the actual garden. Natural albedo is retained, normals are subtle,
and the source's low roughness is remapped to a matte range to avoid a waxy look.
Exact sources, licence, hashes and preparation are in the grass asset directory.

Nearby short blades add real silhouettes in one instanced draw: at most 1500
mobile or 4200 desktop clumps, fewer under load, with distance tapering. Placement
uses the clipped lawn polygons and their holes; the private garden additionally
excludes its house, paving, service apron and shed. Blades are visual only and
cannot become floor support, collision objects or clickable obstacles. Distant
lawns use the textured ground. No runtime dependency is added.

## Install and checks

The full-source ZIP contains the whole project. The smaller update ZIP targets
R104: extract beside package.json and replace matching files. Keep existing local
environment variables and the document password. Build and runtime must share
DOCUMENTS_ASSET_SECRET, or DOCUMENTS_SECRET when no separate asset key is set.
Source downloads exclude environment files, live credentials and deployment
vaults. Private originals remain included only in the private source package.

Checks cover stable colour/environment state at room boundaries, neutral shadow
transitions, night behaviour, lowered common-room elevation, shared material maps,
door/paint colour preservation, lawn budgets and holes, grass-free collision
support, the annotated public/private bed position, real walking routes, doors,
resource disposal, the service descent in all eight building transforms, and the
compiled Worker/Vercel access/encryption boundary. The patched Three physical
shaders compile/link on native GLES3 with normal maps, instancing and the new
spotlight shadow path.

Live browser WebGL rendering is unavailable in this environment. These checks
do not establish phone/headset appearance or frame rate; the final visual result
still needs evaluation on a compatible device.
