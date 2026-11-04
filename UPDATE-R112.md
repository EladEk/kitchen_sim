# HomeStudio R112

## Architectural rendering

The generic 80 cm public tile now shades shallow recessed joints and micro-bevels,
with tile roughness 0.14–0.24 and grout roughness 0.92. Restrained per-tile colour
variation keeps the selected neutral finish. The owner's photographed, ordered
floors keep their existing dimensions, colour, matte finish and physical joints;
no marble veining is added to a documented matte tile.

Interior walls gain analytic floor/ceiling cavity shading and a shaded 7.5 cm
skirting edge. This adds no triangles and uses the same material shader in stereo.
It approximates surface relief rather than creating a physical silhouette. The
owner's existing 7 cm geometry remains tied to the order. Exterior stone and
interior plaster stay on their separate wall faces. Shader hooks survive public
JSON export and are reinstalled after ObjectLoader.

The astronomical sky already used an HDR and a camera-following shadow map.
Walking now tightens that existing sun map to a 14 m radius; this is one map,
not a multi-cascade shadow implementation. Indoor wall, ceiling, door, cloth and
ceramic materials receive a separate fixed neutral room probe (1024×512 desktop,
512×256 mobile). The outdoor sky and scene background are not swapped at doors.
Probe intensity follows daylight and reaches zero in dark mode. This is an
approximation of indoor radiance, not measured room light transport.

The dedicated kitchen replaces four LED point lights with one rectangular strip
light. Selected personal bathroom mirrors have a bounded rear area light and
an emissive perimeter. District tours use one local area fill in kitchens/wet
rooms alongside the existing bounded ceiling shadow. RectAreaLight does not cast
shadows; the existing shadow light supplies that part.

Fabrics use a sheen lobe of 0.85 with measured scan normals where available.
Ceramic bowls and sanitary bodies use a glazed physical material. Upper basins
have actual recessed bowl geometry shared across instances. Ground fixtures keep
their original source-plan locations; the personal master WC turns toward the
room from its source west wall. Shared soft contact decals anchor furniture;
these are visual approximations and are excluded from walking collision and
photo tracing, where real light transport supplies contact shadows.

Fallback surfaces have separate tangent-space XYZ normals and roughness data.
Desktop generic stone/tile can use 1024 px detail; other desktop fallbacks use
512 px and mobile fallbacks stay at 256 px. Existing measured scans retain their
512/1024 caps. The CPU pixel cache stays below 8 MiB; a larger individual result
is owned by its live texture rather than retained in that cache. Maps, geometry,
HDR targets and per-renderer registries are released by their owners.

Shower transmission is 0.92 only within the desktop high-quality budget. Mobile,
lower quality and WebXR use dielectric reflection with transparency instead of
the extra refraction pass. Quality reacts to sustained frame times above 22 ms
and recovers only after sustained time below 17 ms. This targets a smoother tour;
it does not establish or guarantee 60 FPS on a phone/headset.

## Layout and source checks

The personal sofa and television were already opposite each other in R111.
The corrected upper living zones now require a solid wall behind every media
cabinet; the floating exception is removed. Penthouse zones are extended to the
actual supporting wall while preserving kitchen, opening and walking reserves.
Floor numbers are 0–8 in the simulator; PDF pages 9–10 are floors 7–8.

Ground furniture rotations were already orthogonal. A single groundAngle helper
now exposes the existing canonical facing transform for rotations/reflections.
Geometry already transformed as a whole is not reflected a second time.

The suggested vanity point [974,422] overlaps the main bathroom door opening
(PDF y=405.7–451.06). It is therefore not used. The personal vanity stays on the
north wall at [979,382.25], clear of that doorway; the WC moves to [1042,384].
The en-suite WC follows the source west-wall orientation at [625.86,666.5], with
catalogue depth applied toward the room. No partition, opening or plumbing
installation is asserted to have moved in the real apartment.

Bathroom seeds were reviewed on building-plan.pdf pages4–10, including changed
duplex and penthouse plans. The generator places 213 generic fixtures in 103 wet
rooms on all eight upper floors. Existing source walls, full door-sweep reserves,
fixture separation, front standing approaches and connected room approaches are
checked. The map gains wet-room names and sanitary footprints. These proposed
neighbour furnishings do not represent measured plumbing layouts or regulatory
certification. The original lower-floor baseline fixture footprints stay intact.

## Validation, installation and limits

The full source ZIP is complete. The update ZIP contains complete changed files
to replace in R111 beside package.json. Dependencies are unchanged. Preserve the
existing document password and session signing secret. Build and runtime must
share DOCUMENTS_ASSET_SECRET, or DOCUMENTS_SECRET if no separate asset key is set.

Checks include native GLES3 compilation/linking of the complete patched floor,
stone, wall and fabric shaders; room placement, personal door-leaf sweeps,
reflection transforms, HDR ownership/night behaviour, normal vectors, cache
bounds, optical-glass quality and resource cleanup. Integration checks exercise
the exported district, including the real sanitary standing approaches in all
eight building transforms, plus existing stairs, doors, maps and authorization.
The cloud browser lacks WebGL; GPU appearance and frame rate on a phone/VR headset
remain unverified.

Offline lightmaps are not enabled by this release. The installed xatlas-web
package rejects this Node build environment; unwrapping alone is also not a
lighting bake. Dynamic sun/doors and the independent photo path remain active.

Implementation references:
- https://threejs.org/docs/pages/MeshPhysicalMaterial.html
- https://threejs.org/docs/pages/DirectionalLightShadow.html
- https://threejs.org/docs/pages/RectAreaLight.html
