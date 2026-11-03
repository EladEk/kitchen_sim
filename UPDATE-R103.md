# HomeStudio R103

R103 focuses on walking performance, readable interiors, a usable map and the
actual service-room descent in the complete public and personal district.

## Walking and quality

Automatic quality is now the default. Sustained frame pressure lowers rendering
resolution in small steps, then shadow size/update rate, distant interior detail,
prop LOD and optional screen effects. Sustained spare capacity restores detail
slowly. Loading, suspended tabs, paused dialogs and WebXR do not drive the frame
estimator. Render pixel counts are bounded. High quality and smoother-motion
preferences are available in Options and persist in this browser.

A shared diffuse floor/wall-light approximation and gentle exposure adaptation
help interiors during daylight. It uses two shared lights and creates no second
scene or shadow maps. This is an artistic approximation, not real-time global
illumination. It follows solar daylight and does not illuminate night as day.
Grass has restrained world-scale variation; tree silhouettes vary without extra
batches or collision objects. Existing environment reflections remain shared.

## Map

Expand the vector plan to a large native dialog. Zoom with buttons, the wheel or
pinch; drag or use arrow keys to pan. Fit and My location restore useful views.
Walking input pauses, held keys/joystick clear, and Escape returns to the compact
map with the same camera position. The map includes room names and highlights
the room occupied by the live position marker.

Ground-room polygons use the registered source layout. Upper bedroom, living and
kitchen labels use existing source-registered anchors and real wall/door room
components; the open kitchen/lounge split is a proximity estimate. Unidentified
upper wet rooms are not assigned invented names. This is a navigation map, not a
new measured room survey. All eight rotations and reflections retain registration.

In the authorized personal apartment only, the original contractor plan can be
shown below the map with adjustable opacity. Its 1318 x 1120 PDF-page registration
matches the original 2636 x 2240 image and the native plan transform. The image
continues to require the existing password session; it is not in the public map.

## Service stairs, pump room and meter room

The full-district grass sheet previously bridged the descending stair and rooms
at -0.09 m, so physical walking stayed near lobby height. R103 removes all service
voids from the independent district ground as well as the building slabs.
Connected holes are unioned before triangulation, and both lower thresholds have
continuous floor support. The east retaining wall stops at the actual upper jamb
instead of crossing most of the meter-room portal. Meter room is now a destination.
Direct entry uses the service elevation and resolves standing clearance against
actual floor rays. The seven-step/1.05 m vertical reconstruction remains an
estimate from the original video: no surveyed section has been supplied.

The regression walks down, through both rooms, and back upstairs using the actual
shared district collision engine, including every rotated and mirrored building.

## Views, images and recovery

A Rescue button returns to a physically checked standing point on the current
floor/apartment. Options can save up to twelve named walking views in this
browser, return to a saved view, and export a PNG up to 2048 pixels on its long
edge. Exports reuse the renderer and restore its resolution afterward. Public
and personal viewpoint lists are separate. Immersive VR keeps its own framebuffer;
image capture and desktop recovery are disabled while presenting.

## Install and verification

The full-source ZIP contains the complete project. The smaller update ZIP is for
an existing R102 checkout; extract beside package.json and replace matching files.
No new dependency is required. Preserve local environment variables and the
existing document password. Commit/push to your own GitHub/Vercel project to
update that deployment; the ChatGPT-hosted Site is published separately.

Build and runtime must use the same DOCUMENTS_ASSET_SECRET (or DOCUMENTS_SECRET
when no separate asset key is set). All personal application assets and originals
remain encrypted. Environment files and keys are excluded from these downloads.

Validation includes quality transitions and recovery, night/interior behavior,
map zoom bounds, source registration, safe spawn and full service-room round
trips, doors and personal state, resource disposal, production compilation, and
compiled Worker/Vercel authorization and decryption checks. Browser map layout
and controls are inspected. WebGL is disabled in this environment's browser, so
phone/headset appearance, GPU frame rate and full browser 3D navigation are not
established by these CPU and DOM checks.

Route finding from a clicked map destination remains a later feature.
