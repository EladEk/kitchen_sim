# HomeStudio R113

## Tour finishes and loading

Generic ground apartments now install the same physical-size tile and stone
course shaders as upper floors. Dry tile is 80 cm with 4 mm joints; wet tile is
30 cm with 3 mm joints. Grout is recessed and rough; the tile body has restrained
grain and matte roughness 0.50–0.62. Generic photo-mode materials now receive
owned color, bump and roughness maps, retaining joints when shader hooks are
removed by the path tracer. Documented owner floor photos and product sizes
remain authoritative.

A thin, instanced outer stone skin covers the 1.8 mm protruding plaster ends
that caused the unexplained vertical stripes. It follows existing solid wall
spans and leaves openings untouched. Staggered 94 × 48 cm courses use 4 mm fine
joints and a narrow recessed-looking darker datum below the next storey. These
course sizes and the datum width are illustrative, guided by the existing real
facade photographs rather than a measured contractor cladding schedule. Interior
broad faces and wall cut ends keep plaster. The old explicit full-height line
grid at service-porch cladding is removed.

The master bed returns to the pre-orange-annotation R104 position
`point(680,803.11)`, rotation 0; its personal TV returns opposite it. Only known
shipped old bed poses migrate. Custom dimensions and intentional revision-113
placements remain intact. This uses the stated assumption after the optional
placement question received no answer.

Photo-mode signature traversals no longer run during camera movement. A new
room/visibility/quality preparation queues behind a painted loading status,
compiles the actual visible draw types, and uploads textures before resuming.
The compact status preserves live movement inputs and clears only after an
actual frame. Startup covers shader preparation too. Fixed indoor light
visibility avoids light-count shader variants at doorways. Deferred work is
canceled on newer selections, context loss, errors and unmounts.

## Graphics additions

A shared 19,260-byte Meshopt GLB contains authored cushion and duvet component
meshes. It is decoded with Three's actual GLTFLoader and reused in instanced
public furnishings and personal soft parts. These are modeled illustrative
components, not scans or exact purchased sofa models. The existing architecture,
cabinetry, supports, furniture dimensions and door circulation remain procedural.
The lightweight deterministic mesh remains the loading-failure fallback.

Fourteen existing measured/photographic PBR maps for plaster, cotton, oak and
asphalt, plus the existing procedural ambientCG lawn maps, are encoded as KTX2
Basis Universal textures with full mip chains. Linear UASTC is used for normals;
ETC1S is used for albedo/roughness. The complete texture set is 7,277,211 bytes.
Existing JPEG/PNG maps remain decoder-failure fallbacks. Selected material tint
and ordered product photographs are retained. See the asset manifests for exact
hashes, provenance and neutralization method; grass is not mislabeled a scan.

Room entry can capture a bounded local cube probe (128 mobile / 256 desktop)
and PMREM it for eligible interior reflective materials. At most two targets
are retained. This never replaces the sky/background environment. One nearby
bathroom mirror can reflect the real scene at 256/512 pixels, throttled to
160/80 ms. Mirror work is skipped in XR, AO override passes and reduced-effects
mode; resources are released on reset/disposal. The browser AO pipeline retains
its existing GTAO and adds restrained high-threshold bloom. The district already
used AgX; the owner's separate finish-calibration view keeps its existing
neutral color pipeline.

## Validation and limits

449 unit/asset tests passed, including native EGL linking of six complete
architectural/cloth shader programs, actual GLB decoding, KTX2 header/mipmap/hash
checks, canceled shader preparation and live-mirror/probe ownership. All 16
compiled-site integration tests passed, covering the 43 apartment maps,
facade faces, stairs/service access, collision bounds and encrypted personal
assets. A runtime asset-load simulation replaced 50 shared soft batches and
retained one bounded collision world (3,122,104 bytes before site geometry).

The browser preview did not progress beyond its startup view in this environment;
phone/VR appearance and frame rate are not visually verified. No universal
60 FPS or total-furniture download-size claim is made. Full pre-baked GI/lightmap
atlases, replacement models for every whole furniture/plant/tap/chair, and SSR
are not part of this release. Current contact/cavity AO is not presented as baked
GI. Those require separate asset and lighting validation against the actual
home; the delivered GLB is the upholstery component library described above.

## Files and updating

The full-source ZIP contains every tracked source file, assets and tests. The
UpdateFromR112 ZIP contains the complete contents of every changed/new file,
not patch fragments. Extract it over an R112 checkout, install locked
dependencies with `npm ci`, and use the existing secure build flow. Keep the
production password/session secret; deploy with the asset key used for that
build. No secret is included in either source archive.
