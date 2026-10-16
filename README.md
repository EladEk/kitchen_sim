# Kitchen Studio

React + Vite + Three.js kitchen simulator based on the attached Anise order 167968 drawings dated 15 October 2026.

## Run

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
```

The production build is in `dist/` and needs static hosting. No runtime network calls or external asset CDNs are used. Design choices are stored in browser localStorage; JSON import/export transfers them between devices. The site has English and Hebrew interfaces.

## Files

- `src/model.mjs`: millimetre dimensions, cabinet chains, material choices.
- `src/scene.js`: interactive Three.js geometry and procedural materials.
- `src/ModelView.jsx`: orbit controls, cabinet picking, image capture, responsive camera, WebGL fallback.
- `src/PlanViews.jsx`: metric floor plan and elevations, with SVG export.
- `src/main.jsx`: application, finish/lighting controls, source drawings, dimension notes.
- `src/styles.css`: responsive desktop/mobile layouts and Hebrew support.
- `public/plans/`: supplied drawings, oriented for viewing.

## Dimension accuracy

Directly transcribed: 5450 and 3300 wall lengths; individual base and upper module chains; 2600 overall height; 120 plinth; 754 base body; 912 worktop height; 1500 upper starting height, 900 upper body height, 320 upper carcass depth; island 2440 top and 2400 carcass length.

The handwritten 90 on the island countertop drawing is interpreted as 900 mm depth. Island origin x≈2180, z≈1600 is estimated from the scaled drawing (about 980 mm work aisle). Window dimensions/location and appliance styling/cutouts are illustrative. These are disclosed in the simulator and need a dimensioned execution plan or site measurements before asserting a fully verified 1:1 reproduction. The 700 sink and 900 cooktop housing widths follow the source drawings.

The reference drawing establishes arrangement rather than final finishes. Finishes, floor tone, illumination, and stools are visualization choices. Cabinet fronts can be opened for exploration; appliance doors are illustrative rather than full articulated mechanisms.

## Verification

Tests cover wall-chain closure, upper run alignment, island dimensional consistency, finite Three.js geometry for multiple lighting/material/opening states, island-front orientation, and upper front depth. A successful production build checks all React and stylesheet compilation. Browser visual QA must be performed in a WebGL-capable browser; no supported browser QA tool was available in the creation environment.

## Revision 02 — technical order and cabinet inspection

The added technical order is 168947 (drawing remains 167968). See `src/specifications.mjs` for a source-linked transcription and five unresolved conflicts. Confirmed details now include ZA01SM front laminate product code (no calibrated swatch), graphite-grey interior, plywood body/back, 120 mm aluminium-look plinth, Touch uppers, integrated lower profiles, two internal drawers in the 570 mm cabinet, a two-level 500 mm pull-out, three wire baskets in the island's 400 mm unit, three drawers in both 1000 mm island units, and an 18 mm rear panel.

Click a cabinet, then **Open cabinet** or **Look inside**. Each unit opens independently; multiple units can remain open. Look inside isolates the selected cabinet and positions the camera on its actual front side. Back to kitchen restores the room camera. Hinged fronts, sliding drawer trays, wire baskets, shelves, dishwasher door/racks, sink plumbing, a schematic mixer lift, and the oven compartment can be inspected. Object styling, hinge/lift travel, shelf positions, and stored props are illustrative; they are not an engineering mechanism or collision simulation.

The order's 600 mm return unit, upper item 16 width, above-fridge body size, 410 mm basket row versus 400 mm cabinet, and final pantry shelf/drawer allocation conflict or remain underspecified. The model keeps the drawing envelope and discloses these differences. Financial receipts and payment sections are not included in the source-plan gallery.


## Revision 03 — each door and drawer independently

Every movable front, internal drawer, wire basket, appliance rack and lift has a stable ID and its own saved state in `openParts`. Click that exact part in 3D to toggle only it, or use its individually labelled button. Inspect cabinet isolates the unit without opening any parts. The former cabinet-wide and Open all actions have been removed; Close open parts remains available. Materials from earlier saves are retained, while old cabinet-wide opening flags are ignored.

Internal drawers/baskets open their required access door only. They leave sibling parts unchanged. A door cannot be closed while its internal drawer or basket is extended; the UI identifies the part that must be retracted first. The 500 mm bottle carriage has one shared full-height front, so its attached levels correctly move with that front as a single mechanism.

Tests verify stable unique IDs, state independence, access prerequisites, clickable geometry for every control, and actual geometry bounds: moving one middle drawer, sink door, pantry door, upper door, oven flap, oven drawer or fridge door leaves every other independently controlled part in place.
