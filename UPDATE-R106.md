# HomeStudio R106

## Master bed facing

The supplied photograph shows the headboard facing the open room. The bed is
now rotated by 180 degrees around the R105 centre, approximately (1.70, 14.38)
metres in the native plan. Its headboard is against the lower wall, with the
personal bed's roughly 35 mm clearance retained. The television moves to the
opposite wall, clear of the ensuite opening. Actual meshes verify the headboard
direction, the entrance-door sweep and the side route, not just the map rectangle.

Both the generic public apartment-4 bed and the personal bed are corrected.
The personal 180 x 200 cm mattress and any saved custom dimensions are preserved.
The known R105 default pose migrates once using a placement revision marker;
later deliberate edits to its facing remain editable. Other apartment furnishings
keep their own placements. The new supplied photograph is retained as
`/house/bed-facing-r106.jpg` behind the existing document access control.

## Stone outside, plaster inside

External walls previously used a single stone material across their entire box,
so the inward face also displayed exterior cladding. A face classifier now samples
the occupied plan on each side of a wall and assigns separate materials to its
outer and inner broad faces. Cut ends and wall caps retain the interior finish.
The wall dimensions, openings and collision geometry are unchanged.

This applies to the ground-apartment template, the personal home and upper
building facades. Facade instances remain grouped by their face-material pattern.
Unit and core polygons identify indoor space without treating an open balcony as
a room. The assignments survive public export, district batching, reflections
and photo-scene conversion. Interior plaster/paint normal strength is reduced
to retain fine painted-wall detail without the coarse exterior appearance.

## Unblocked common stairs

The common stair's original treads were boxes extruded all the way down to each
storey's base. On the return flight, that filled the standing space above the
stairs one storey below. The treads now have finite concrete thickness: one
riser plus 120 mm, with the same top surfaces, footprints, rise and direction.
Landing ends overlap the arriving flight by 25 mm to bridge millimetre-scale
registration differences between repeated floor plans. Landings and the physical
centre handrails remain in place. Walking collision
continues to use the real rendered geometry; no obstacle is ignored to allow
the climb.

The regression walks the compiled district continuously from ground to floor 8
and back in every building, including both reflected copies. It checks small
height changes, standing headroom and the centre guard. The reflected-building
route also uses the 50 mm maximum substep used in fast walking and WebXR.
The separate descent to the pump and meter rooms is checked in all eight copies.

## Install and checks

The full-source ZIP contains the complete project. The smaller update ZIP targets
R105: extract it beside package.json and replace matching files. No dependency
change is required. Preserve existing local environment variables and the
document password. Build and runtime must share DOCUMENTS_ASSET_SECRET, or
DOCUMENTS_SECRET if no separate asset key is configured. Source downloads omit
environment files, live credentials and deployment vaults; protected originals
remain included in the private source package.

Checks cover public/personal bed geometry and migration, wall-face material rays
in walking/photo/mirrored district scenes, all nine common-stair levels in all
eight buildings, physical guard collision, service-room descent/ascent, public
walking, personal district boundaries, and compiled Worker/Vercel document
encryption and authorization. The complete existing source test suite also runs.

Live WebGL browser rendering is unavailable in this environment. CPU scene and
movement checks and native GLES shader checks do not establish the final
appearance or frame rate on a phone or headset.
