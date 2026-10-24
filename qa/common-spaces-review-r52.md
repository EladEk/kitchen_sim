# R52 source review: lobby and common spaces

Source: building-plan.pdf, page 3; actual paired vector wall faces in building-interiors.mjs. Original trace is unchanged. Native PDF page 1531 × 1689 points. Preview image 1500 × 1660; these dimensions were converted independently before applying the existing deskew/registration.

## Plan findings

- Club west of the lift/core; door bd-0-9 leads into the common circulation.
- Two lifts east of the bicycle room; ground landing door centres (11.59982,-10.69933), (11.59987,-9.09912).
- Pump room east of the lifts and south of the water reservoir, distinct from the electrical room further east. Main clear room width 4.299 m, depth 2.700 m from wall faces; a northern entry neck connects to door bd-0-5. These are vector-plan measurements, not an as-built survey.
- Pump entrance hinge (18.34823,-8.84971), closed leaf endpoint (18.34787,-7.90144). Verified open passage and closed-door collision.
- Entrance lobby continues south and east around the stair enclosure. Finish polygon stays outside pump equipment, electrical room, reservoir and stair footprint. No new partitions or decorative furniture added in circulation.
- Main external opening is at x=21.8239, z=-4.9498…-3.6998. Secondary opening is west of the stair enclosure. Structural wall ownership and existing headers retained.

## Evidence and uncertainty

Photo 298244.jpg confirms three upright pumps, shared headers, cream pressure vessel, valve handles, gauge, blue risers, red pipe, black drain, cable tray and raised concrete/metal base. Equipment scale, exact wall orientation and unseen connections are estimated. No manufacturer/capacity inferred. All added common-area lamps are 4000K simulator placeholders pending photographed positions. Lobby floor product/module, wall surface micro-relief and finishes are illustrative, not claimed as installed products.

## Verification

Common-space navigation tests check six destinations, clear spawn points and actual pump doorway traversal. Equipment blocks walking. Geometry audit reruns 83,778 wall probes across all nine floors, plus corners, lintels, door clearances and roof corners. Results stored in building-wall-audit-r52.json.

Mobile rendering caps initial device ratio at 1.25, adapts toward 0.8 after sustained slow frames, bypasses screen SSAO on touch devices, caps non-XR rendering at 30 FPS, and hides distant storeys only during interior walking. Exterior views retain all storeys. Existing visibility lifecycle pauses background rendering. No measured device FPS claim: managed browser preview unavailable in this session.
