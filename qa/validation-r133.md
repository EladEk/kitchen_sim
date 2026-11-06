# R133 verification

Implementation was committed before tests. The final code is committed in a97df5688c6302108a97b4ce3abbc87d25a865bb; subsequent changes in this release are documentation and validation records.

- All 540 source/unit checks passed, without failures or skips (src/*.test.mjs and public-view/*.test.mjs).
- The secure production build passed and sealed 252 private source assets.
- All 14 selected production checks passed, without failures or skips: startup/current-revision consistency, private/public isolation, all 43 apartment doors, 144 safe elevator exits across all eight buildings, source/merged wall finish consistency, facade materials and layers, and shared texture ownership.
- Compiled Worker and portable adapter checks passed: authenticated original hashes, denied direct private URLs, video ranges and absence of client secrets.
- The actual rendered district and walking stone batches have zero overlapping rectangular stone layers in the audited 16 mm depth band. Each uses one shared albedo map, one shared normal map and one shared roughness map. These three maps serve different material channels; they are not duplicate colour overlays. Original collision source buffers remain byte-for-byte unchanged.
- The surface audit counts unique merged geometries, including reflected district geometry, rather than multiplying counts by eight buildings. See surface-audit-r133.json for the exact counts.
- Browser UI verification used the actual ElevatorDialog and createElevatorActions in an isolated fixture with a simulated movement/preparation adapter. A nearby click opened floors 0–8 with zero preparations. Choosing floor 3 completed one preparation and closed selection. One remote click completed the approach and automatically reopened the selector at floor 3.

## Limits

The browser fixture verifies the dialog and action flow, not a rendered end-to-end 3D ride. Safe physical landing positions, actual exported call panels and all building registrations are checked in the production geometry suite. No phone frame-rate, full-scene phone screenshot, physical WebGPU or immersive VR result is claimed.

The render union applies only to rectangular vertical stone faces in full district and walking batches. Nonrectangular/horizontal faces keep their original triangles. Original source geometry and focused-section selection/collision geometry are retained. No claim is made that every unrelated interior finish or source trace has been deduplicated.

Lobby and lift waiting-area walls use #c5ad91; lobby panelling uses #ad9074. The exported corridor finish is verified on all floors 0–8. Apartment walls, white ceiling finishes and dark entrance doors are retained.
