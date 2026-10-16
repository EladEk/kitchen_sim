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

The handwritten 90 on the island countertop drawing is interpreted as 900 mm depth. Island origin x≈2180, z≈1600 is estimated from the scaled drawing (about 980 mm work aisle). Window dimensions/location are illustrative. Revision 04 adds the exact Siemens hob outer dimensions from its supplied sheet; underside, cutout position and hood installation details remain illustrative. These are disclosed in the simulator and need a dimensioned execution plan or site measurements before asserting a fully verified 1:1 reproduction. The 700 sink and 900 cooktop housing widths follow the source drawings.

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


## Revision 04 — ordered appliances and unobstructed inspection

`src/appliances.mjs` records Siemens EX875LYV1E (812 × 520 × 51 mm, two extended FlexInduction zones / four areas, 7400 W) and Elica BOXIN LX 90. Both supplied manufacturer sheets are available in the source gallery, with manufacturer links in the appliance specification cards. The cooktop now has rectangular Flex zones, two slider marks, stainless side trims, a below-counter body and an actual opening in the stone. The preview opening is 780 × 500 mm, within the range on the supplied sheet; it is not a fabrication template. The underside and ventilation are schematic.

The hood is a child of `upper-3`, the 900 mm cabinet over the hob. Its illustrated 894 × 310 mm trim includes a grease-filter grille, two LED lights and mechanical control. Opening either Touch door reveals a motor housing and Ø150 mm vertical outlet. The lower storage space is reserved for the hood; the remaining shelf and top panel have openings around the duct. The hood preview is stainless; the uploaded sheet also lists a matte-black variant. Mounting, shelf modifications and the exhaust route are schematic until a final installation drawing is provided. No cross-brand cookConnect compatibility is assumed.

The upper cabinet centre (x3920) is 40 mm right of the hob centre (x3880). This inherited offset is disclosed and no cabinets are moved. The 862 mm dimension belongs to the mounting pan, not the motor. Revision 05 replaces the preliminary hood geometry with the manufacturer-dimensioned construction described below.

The floating cabinet controls now use a 50% opacity background with opaque, readable text. In Inspect cabinet, **Minimize cabinet controls** collapses the controls into a small card; **Restore cabinet controls** brings them back. Minimizing does not change the camera, selection or individual `openParts` states. Direct 3D part clicks remain available while minimized. Switching cabinets or leaving inspection resets the panel to its expanded presentation.

Verification adds actual mesh-envelope, worktop-hole, hood/cabinet fit, duct/shelf clearance and hood-isolation tests. Browser visual QA remains unavailable in this environment.


## Revision 05 — manufacturer-dimensioned BOXIN LX 90

The Elica BOXIN LX/IX/A/90 hood is rebuilt from the official 90 cm technical PDF (Elica product 4625, PRF0114761A), pages 3–4, cross-checked against Elica’s exact 90 cm installed product photo. Both the numbered drawings and product photo are available in the source gallery; the original PDF is included unchanged. `src/hood.js` models the product separately from the installation duct.

Verified dimensions in mm: external frame 894 × 310; mounting pan width 862; pan/base height 60 with 35 mm upper section and 25 mm lower skirt; motor 305 × 269.8 × 278.8, set 16.2 mm from the rear; overall body height 338.8; height including outlet collar 361.3; Ø150 outlet with its axis 102.7 mm from the product rear. The upper cabinet depth is 320, so the modelled collar axis is 112.7 mm from the wall. The 862 mm pan fits between the illustrated 18 mm cabinet sides. The motor is a narrow central housing with space either side.

The underside now shows two independent framed grease-filter cassettes with diamond mesh, recessed release handles, two round LED bezels, a rotary selector, folded front visor and side protection. The motor has folded panel seams, cover screws and an Elica badge. Numbered dimensions are at 1:1 scale; filter/lamp/handle/screw positions and tiny manufacturing details are visually matched to the reference photo and are not a factory CAD scan. Stainless finish is retained.

In Inspect cabinet for the hood’s upper unit, **Hood underside** moves the camera below the appliance. The inspection orbit now permits views from below; Back to kitchen restores the room camera limits. The half-transparent/minimizable controls and all individual door/drawer states are retained.

The installation pipe extends beyond the real collar as a separate object. It passes through actual circular Ø160 holes in the shelf and cabinet top. The duct route and final cabinet mounting are still an installation illustration. Cabinet positions and the existing 40 mm hob/upper centre offset remain unchanged.

Tests check the actual product mesh envelope and motor dimensions against the drawing, collar and motor offsets, filter/LED counts, mounting-pan fit, circular-hole ray clearance and isolated-cabinet contents. Browser QA is unavailable in this environment; geometry and production compilation are verified independently.
