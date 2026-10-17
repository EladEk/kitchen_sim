# Home Studio + Kitchen Studio

React + Vite + Three.js whole-house and detailed kitchen simulator. The house follows the attached RG1 floor plan. Kitchen geometry retains the Anise order 167968 drawings and subsequent technical/appliance sheets.

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
- `src/main.jsx`: hash routes between Home Studio and Kitchen Studio.
- `src/KitchenApp.jsx`: retained detailed kitchen, independent openings and manufacturer-dimensioned hood.
- `src/HomeApp.jsx`, `src/HomeView.jsx`, `src/HomePlan.jsx`: room controls, orbit/first-person walkthrough and interactive SVG map.
- `src/home-model.mjs`, `src/home-scene.js`: traced house topology, navigation collisions/pathfinding and room furniture.
- `src/home.css`: scoped responsive whole-house UI, Hebrew/English and touch controls.
- `public/house/`: attached house PDF unchanged and its rendered preview.
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


## Revision 06 — whole house, individual rooms and garden

The default route is Home Studio. `#/kitchen` opens the complete Kitchen Studio; its **Whole home** button returns to the house kitchen view. The kitchen model, independent openings, half-transparent/minimizable inspection panel, Siemens hob and Elica BOXIN LX 90 are retained. Home and kitchen settings use separate localStorage keys and flush on navigation. The house kitchen proxy reads the saved kitchen finishes and preserves its cabinet and island chains; it is an alignment for visualization, not a newly verified kitchen installation survey.

The 15 navigable spaces are living, dining, kitchen, four bedrooms, safe room, main bathroom, en suite, guest WC, utility, hall, terrace and garden. The outline, master-bedroom L shape, hall opening, doors and windows were traced from the vector geometry on page 1 of the attached house plan. Living/dining/kitchen floor zones are UI divisions of one open space, not new walls. The original PDF is included unchanged. Nominal scale is 1:50: one PDF point becomes `50 × 25.4 / 72 / 1000` metres. Some vector spans exceed printed room dimensions by roughly 5–7 cm; the source does not explain this. Printed labels remain separately visible and no wall is stretched to force agreement. The dashed exterior line is the upper-floor projection, not a new wall.

**Views:** whole-home cutaway, room orbit, interactive floor plan and continuous first-person walking. In walking mode drag to look, use WASD to move, or up/down arrows to move and left/right arrows to turn. Touch direction buttons support a phone. Choose a room in the sidebar or minimap to follow a continuous grid path; only doors on that path open. Movement stops at walls, closed doors, the fixed half of the terrace slider, kitchen counters/island and large furniture. Manual movement cancels the guided route. The living slider leads to the terrace/garden; the utility exterior door leads to the service yard/garden.

Wall colors, floor finishes, furniture finishes, daylight/evening, cutaway, room labels and illustrative furniture can be adjusted. Wardrobe doors, lower drawers, vanity doors and console drawers have stable independent states and clickable meshes. Their controls can be minimized. Home designs export/import as JSON; the current 3D view exports as PNG. Furniture and lighting are illustrative. Ceiling height 2.75 m, eye level 1.62 m, window heights, planting and fence height are assumptions without a verifying building section. Door swing, glass and furniture mechanisms do not have engineering collision modelling. The home is not claimed as a fully verified 1:1 construction model.

Verification covers source topology, distinct open-plan floor zones, indoor routes to every room with furniture, step-by-step collision-aware route execution, the two exterior routes, closed doorway/window blocking, slider fixed-half blocking, independent saved part states, finite house geometry, clickable controls and retained kitchen/hood tests. A supported browser QA tool was unavailable in the managed creation environment, so no browser or mobile visual test is claimed. Run the build in a WebGL-capable browser for final visual/device checks.


## Revision 07 — owner's layout and Harash / Hercules products

The attached Harash schedule is transcribed by product code and source page in `src/home-products.mjs`. Original PDFs are preserved under `public/house/`; the in-app source viewer shows the five product pages and the Hercules sheet. Each room's **Your specified products** card and each ordered fitting's inspector link show its code, dimensions, source page and any ambiguity. Financial totals and legal pages are not transcribed into the product UI.

Defaults now use MI402439 Chic matte-white 100 × 100 cm tiles in dry rooms, YUCLCE33 grey 30 × 30 cm R10 in wet/utility rooms, EGEHDA15 Habitat Dawn 15 × 60 cm R10 on the terrace, MOZ62705 Mona grey 25 × 75 cm wet-room wall tiles and PANEL124 7 cm skirting in dry rooms. The en-suite shower has the separately listed YUCLAC33 33 × 30 cm R11 floor patch. Tile spacing is metric; shade, decor pattern, laying phase and tiling heights are illustrative because no product photos or elevations were attached.

The general bath has the HR000160 Eco Cubic 160 × 70 cm tub, one 82 cm VISION door vanity and an 80 cm model 109 aluminium-frame mirror. The en suite has its 82 cm VISION Wrangler vanity and matching 80 cm mirror. Harash lists both S2610721 Gabriel and S2512421 Wrangler against the general-bath vanity without a clear cancellation, so the model shows one cabinet of their common width and explicitly flags the unresolved model choice. All three toilets are wall-hung Harash Sky white HISK3180 with SLIM HISK8520 seats; the contractor-provided concealed cistern and plate have no specified model. The guest WC has the ST0000SO wall basin with no invented vanity underneath. The source itself lists alternative basin names and no dimensions; that shape remains illustrative.

VR008077 chrome basin mixers, the ELIX8321 / VR081770 four-way mixer, VRN00416 hand-shower rail, round outlet and the en-suite Ø20 cm VR001833 shower head with 35 cm VR000239 arm are represented. There is no separate invented floor shower in the general bath. The indoor kitchen now also defaults to the scheduled 100 cm white floor, and its tap is represented as the VR001221 brushed two-mode pull-out rather than inheriting the cabinet-handle color. The schedule credits the kitchen bowl and does not identify a selected replacement; the earlier illustrative sink envelope is retained.

Owner layout changes: indoor dining furniture and its separate zone are removed; its floor remains part of the open living area. Bedroom 1 and 2 mattresses are exactly 1.20 × 1.90 m. Bedroom 3 (stable internal ID `bedroom-c`) becomes an office with desk, task chair and office storage. The garden sofa is removed. Living sofa/TV swap to the opposite walls, with sofa back against the former TV wall. The main bed rotates 180°, with headboard against the south wall and a wall TV opposite on the existing en-suite partition. Architectural walls, windows and openings remain fixed.

The black Gusto Hercules outdoor kitchen sits against the western garden boundary directly opposite the living slider, facing the house. Its documented chain is 80 cm sink + 150 cm six-burner grill / rear burner / side hob + 80 cm fridge / storage = 310 cm, depth approximately 70 cm. It includes individual sink doors, grill doors, two drawers, adjacent storage, glass fridge door and hinged grill hood; each has its own clickable saved state. Cabinet height 90 cm, internal appliance dimensions, detailed contours and hardware travel are illustrative. `src/outdoor-kitchen.js` owns this assembly. The original terrace table remains; the cancelled dining area is the indoor one.

Home settings migrate to schema 2, replacing old illustrative floor defaults with the supplied selections while retaining other finishes and valid individual opening states. Unknown old parts are removed. Kitchen revision 7 similarly migrates its previous floor default. Explicit new finish experiments remain editable and import/export still work.

Tests verify the real mattress geometry, sofa/TV facing and wall contact, rotated main-bed headboard contact, the removal of cancelled objects, office access, product-code assignments, ordered finishes and migration, metric wall/floor tile sizes, 82 cm vanities, wall-hung WCs, the Hercules module chain and fence/slider alignment, independent outdoor openings, all continuous walking routes and the unchanged detailed hood/cabinet mechanisms. Browser visual QA remains unavailable in the managed environment.


## Revision 08 — safe-room bed, compact map and item dimensions

The safe-room sofa is replaced by a 140 × 190 cm double mattress (a chosen illustrative size because no exact size was specified). Its headboard faces the south wall and stays below the window sill; side tables are omitted to keep the room accessible. The guided-walk destination moves into the clear aisle between bed and storage, with existing doors/windows unchanged. The plant at the northern/right end of the Hercules kitchen is removed; four other garden plants remain.

The collapsed **Your location** control is now inside a shared navigation dock beneath the walking arrows. Its reserved slot keeps the arrow controls stationary when the map expands; the expanded map keeps its existing opposite-side position. The dock uses the existing desktop/mobile offsets and supports RTL/LTR.

Click any main room furniture or sanitary fitting to see width, depth/length and height immediately in the translucent inspector. `src/home-measurements.mjs` returns nominal dimensions in cm in the object's own axes, so rotating a desk or opening a door never swaps or inflates its listed size. Beds show mattress width/length and approximate platform height; wall basins identify mounting height. Cabinet body sizes exclude attached mirrors and accessories. Explicitly supplied bedroom mattress sizes and documented bathtub/vanity/outdoor widths are distinguished from assumed dimensions. The ≈ marker identifies an unsupplied real-life size; outdoor depth is also marked approximate as in the sheet. `src/ItemDimensions.jsx` renders these details above existing product and independent-opening controls. Previously untagged furniture meshes now inherit their furniture selection, while exact door/drawer click targets retain their independent actions.

Regression checks cover the double mattress's actual mesh size, window/headboard clearance, safe-room walking route, remaining plant locations, measurement provenance, rotated-object dimensions and selection coverage. The existing house navigation, source products, individual openings and detailed hood tests remain in place. Browser visual QA remains unavailable in the managed environment.

## Revision 09 — bedroom wardrobes beside the entrance doors

Bedroom 1 and 2 wardrobes now sit beside their respective doors along the continuation of the east entrance wall, facing west into the room. Their original body sizes remain 180 × 55 × 230 cm and 170 × 55 × 230 cm. The first wardrobe follows the existing wall jog above the door; the second sits below its door. Bedroom 2's computer desk moves to the former wardrobe area on the north wall, with a small sideways offset to clear the entrance door swing. Bedroom 1's desk shifts about 30 cm west along its existing south wall to keep the entrance walkable. Both 120 × 190 cm mattresses keep their positions.

Guided-walk destinations move to the clear central aisles. Geometry checks cover the actual closed/open wardrobe meshes, entrance-door sweeps, room containment and separation from other furniture, in addition to all existing continuous walking routes. Individual cabinet doors/drawers, the inspector and item dimensions retain their stable IDs. Walls, windows and door openings are unchanged. Browser visual QA remains unavailable in the managed environment.

## Revision 10 — corner beds, close all and RG/RG1 construction specification

The new apartment specification numbers the main bedroom 1, the two children's rooms 2 and 3, the office 4 and the safe room 5. Existing simulator room names stay stable. Per the owner's clarification, the two 120 × 190 cm children's mattresses in simulator bedrooms 1 and 2 (`bed-a`, `bed-b`; specification rooms 2 and 3) now sit in their north-west room corners, with about 2 cm of frame/headboard clearance for skirting on both walls. The previously converted office stays an office. Wardrobes remain beside the entrance doors, and the room 2 computer/wardrobe swap from revision 09 is retained.

**Close all** is available in every home view and in the detailed kitchen. It clears all home door states and furniture parts (including outdoor appliances), as well as the detailed kitchen's individual door/drawer states. `src/studio-state.mjs` preserves finishes, language, source metadata and the active app's unsaved choices while updating both browser saves. In a walking view it cancels a guided route and held controls; when the camera is in a doorway, `clearStandingPosition` finds a nearby clear position before the doors close. Selection and inspection remain available, and individual opening controls work again immediately.

The supplied originals are included unchanged as `public/house/apartment-spec.pdf` (47 PDF pages) and `public/house/building-plan.pdf` (12 PDF pages). The source viewer offers selected pages with their actual PDF page numbers, plus links to both complete originals. The building's ground-floor sheet (page 3, building 4102 / plot 1410 / apartment 4) confirms the existing apartment outline; it does not justify moving walls.

`src/home-building-spec.mjs` transcribes the **RG/RG1** opening schedule only (pages 16–17): bedroom and kitchen window heights 125 cm, en-suite window 90 cm, safe-room window 100 cm, utility window 125 cm; standard door heights 210 cm, safe-room steel door 200 cm and service exit 230 cm. Opening x/z coordinates and construction widths continue to follow the apartment plan, with scheduled approximate widths retained as reference data. The two tilt windows use a single-frame layout, and steel entrance/service doors use a metal finish. Sill heights remain assumptions. The additional inner wooden safe-room door is documented but is not modeled separately.

Bathroom cladding now stops at the nominal door-frame height (210 cm); guest WC cladding stops at about 120 cm (specification pages 11–12), with painted walls above. The source permits completing a full tile, so final tile-course height is not an installation claim. The listed **minimum** ceiling heights of 250 cm / 205 cm for services and hall are shown as minima; the displayed 275 cm ceiling remains explicitly assumed. The constructor's baseline does not replace the later Harash selections or the custom Anise kitchen schedule. Existing ordered tile sizes, product codes, independent cabinet parts and manufacturer hood dimensions remain intact.

Checks cover actual bed/frame corner placement, preserved office use, entrance-door sweeps, all walking routes, closure transforms for both full Three.js scenes, cross-simulator save persistence, nearby clear standing positions, rendered opening heights, bounded cladding heights, unchanged original PDF digests and preview assets. Browser visual QA remains unavailable in the managed environment.

## Revision 11 — drawn door swings, two safe-room doors, shutters and services

The resupplied apartment and building PDFs are byte-identical to the originals used in revision 10. A deeper review adds the mechanisms and applicable six-room garden-apartment service clauses rather than changing the traced apartment outline or the owner's furniture/kitchen layout.

`DOOR_HANDINGS` records hinge endpoints and opening directions from the apartment drawing. Bedroom 1 hinges at the south jamb, the guest WC opens into the WC, the bathroom hinges at its south jamb and opens east, the utility door opens into the utility area, and the safe-room steel door hinges at the east jamb and opens outward. The actual Three.js pivots and handles follow those sides. The safe room also has a separate 70 × 200 cm wooden inward-opening leaf from specification page 16. Both leaves share one construction opening and retain independent saved/clickable states. Its inner hinge side and 13 cm frame offsets are illustrative; the drawing only shows the outer steel leaf. Guided walking opens both leaves and a closed one blocks passage.

The six electric aluminium roller shutters specified on page 16 are now modeled at the living slider, kitchen window and four bedroom windows. They have separate sidebar and 3D click controls, animated curtains and saved `closedShutters` states. There is no invented electric shutter in the wet rooms, utility or safe room. Box profiles, curtain slats and roll-up representation are illustrative. A closed terrace shutter blocks passage even when the glass slider is open. Guided routes raise that shutter when necessary while retaining other shutter states. **Close all**, from either simulator, now lowers all shutters as well as closing all home and kitchen doors/drawers. Existing schema-2 saves/imports remain compatible and invalid shutter IDs are removed.

Exterior living/bedroom/kitchen glass now uses two glass layers following page 26 note c; wet-room, utility and safe-room glass retain their separate single-pane illustration. Thickness, inter-pane gap and detailed profiles are assumed, and no certification of the protected window assembly is implied.

The room-design panel and source facts now report the specific garden-apartment electrical supply (3 × 40 A), the included mini-central air-conditioning exception for six-room apartments (excluding bathrooms/utility), specified mechanical ventilation in the main bathroom and guest WC, included safe-room air filtration, minimum 150-litre hot-water storage and the private garden's delivery without landscaping/irrigation. Sources are specification pages 16, 30, 33 and 34. Locations/capacities/models not given in the documents are not placed as invented measured service fixtures. The existing planting remains a clearly labeled design proposal. Source preview tabs add pages 26 and 30–34, including the electrical-point tables on pages 31–32, and the full PDFs remain unchanged.

Geometry/state checks verify real hinge endpoints and swing sides, independent safe-room leaves and their shared wall opening, both-leaf route requirements, individual shutter meshes and state isolation, shutter passage blocking and guided reopening, glazing-layer counts, legacy-save sanitization and global closure of all shutters. All prior bed/wardrobe layouts, selected products, detailed kitchen mechanisms and manufacturer hood geometry remain covered. Browser visual QA remains unavailable in the managed environment.


## Revision 12 — real house photographs and walkthrough

The nine owner photographs and the 32-second video are now usable references inside the source viewer. The header camera button opens **House photos & video**; each photograph has its own caption and the video has native play, seek, volume and fullscreen controls, with no autoplay. Local JPEG previews and a fast-start H.264/AAC 540 × 960 video preserve the original audio while keeping the complete preview set around 4 MB. `public/house/photos/provenance.json` records each original attachment filename and SHA-256; these are viewing derivatives, not replaced source photographs or a calibrated scan.

`src/home-photo-reference.mjs` separates visible observations from estimated dimensions. Dark anthracite window profiles now have two sliding sashes on distinct tracks, with two glazing layers in each sash. The four bedroom shutter access covers and the living slider cover face the interior above the opening, in the photographed dark finish. The earlier white exterior headboxes are removed. The kitchen access cover is concealed at its photographed bulkhead. Opening positions, schedule heights, independent electric-shutter states and close-all behavior are preserved. The safe-room window gains the exterior slats seen in its photograph; this is a visual illustration, not a certified protection assembly.

Permanent architecture added in `src/home-observed-scene.js`: the kitchen work-wall bulkhead with two differently sized horizontal HVAC grilles, the lowered hall ceiling, the ceiling drop at the main-bedroom entrance beside the en-suite partition, and the white filtration unit above the safe-room window. Their presence/relative placement is observed; dimensions, exact grille positions, construction thicknesses and equipment model details are estimated. The main 275 cm ceiling and window sill assumptions remain; photo perspective does not establish a new height. Kitchen bulkhead underside is provisionally 242 cm, hall 246 cm and main-bedroom entrance 242 cm; the safe filter body is provisionally 48 × 22 × 40 cm with its bottom at 217 cm. These are clearly marked ≈ in the new translucent, minimizable building-element inspector, available by clicking the feature or its Room design reference card.

Ceiling drops and high fittings are visible in **Walk through** or with **Cutaway** disabled; they are omitted from the low-wall overview so the plan remains readable. They stay present when illustrative furniture is hidden. The HVAC bulkhead clears the existing 240 cm kitchen tall/upper cabinets; the safe filter is above the protected-window opening and mounted just inside the actual wall face. The lower ceilings remain above doors and eye height and do not modify 2D walking routes.

Bedroom photographs lack numbered labels. Their common window/profile treatment is used, while room-specific outlet positions are not guessed. The existing measured plan, Harash finishes, owner furniture placements, independent doors/drawers, exact kitchen hood and appliance geometry are retained. The source and accuracy panels explain which additions are photo-observed and which sizes remain estimates.

Verification includes actual Three.js feature placement, ceiling footprints and clearances, two grille assemblies, safe-filter/window separation, permanent-fixture visibility independent of furniture, inward shutter covers versus exterior independent curtains, separate window tracks, all local media previews and fast-start video packaging, plus all prior navigation, layout, kitchen and global-close regressions. Browser visual QA remains unavailable in the managed environment; no browser/mobile visual test is claimed.


## Revision 13 — terrace-width paving, pergola and privacy fence

The new paving carries the original terrace side lines straight west to the existing garden boundary. The original terrace remains intact; the added rectangle is approximately **4.34975 × 3.559175 m = 15.4815 m²**. The total finished paving is about **29.8352 m²**. Its ordered Habitat Dawn 15×60 cm finish and world-origin joint grid continue across the original/new seam at the same displayed level. Changing the terrace floor finish updates both surfaces. Room view now fits the complete finished terrace and walking recognizes the added strip as terrace.

The cream pergola begins at the upper-floor edge (PDF x=498.3) and ends at the existing west boundary (x=273.84), spanning only the existing paving's z=42.88…289.48 side lines. Its plan-derived footprint is approximately **4.34975 × 3.959225 m = 17.2216 m²**. It does not use the roughly 7.4 m full balcony frontage. The original paving already projects about 40 cm beyond the upstairs edge. Plan scale remains nominal 1:50, not a field survey.

`src/home-garden-layout.mjs` keeps footprint derivation and planned-versus-existing element metadata separate from rendering. `src/home-garden-scene.js` models a cream 150×50 mm perimeter, 120×50 carrier, 80×80 dividers/posts and 11 cm shade profiles from the example. Four illustrative corner supports avoid the actual Hercules kitchen; they also block the walking camera when furniture is hidden. Height is provisionally 3 m. The attached 5×4 m / three-post example is a style reference, not a structurally approved support layout or quantity schedule for this different footprint. Connections, clearance, drainage, substrates and slopes need a measured installation design.

The existing upstairs balcony front line follows the plan, with slab/fascia/glass railing suggested by the four exterior photos. Its 275 cm soffit and 20 cm slab thickness remain assumptions. In cutaway, the new slats are translucent and the existing balcony reduces to its edge. **Hide pergola roof** removes the new shade profiles and existing balcony slab/railing so the space is inspectable; posts and frame remain. The setting survives local saves, JSON import/export and Close all.

The boundary follows exactly the same four modeled runs as before, now with horizontal 11 cm textured-grey-1200-style Modolina panels. Overall modeled height is **150 cm from paving**, consisting of the quoted 120 cm panel on an explicitly assumed 30 cm stone base. This overall-height interpretation is shown in the inspector. The quote's 37 m does not resize or certify the full plot perimeter. Listed colors are screen approximations.

Click a frame, fence run or new paving for estimated dimensions and relevant source; controls remain translucent and minimizable. **Room design** for Terrace/Garden and the accuracy dialog include a compact outdoor summary. The SVG plan/minimap show the exact paving extension, pergola outline and post positions. The exterior-photo/design-reference gallery includes four existing-condition photos and five separately labeled example screenshots. Local portable previews and SHA-256 provenance are included in `public/house/garden/`; original attachments are unchanged.

Validation: 60 automated tests pass, including actual mesh envelopes, requested terrace-only strip, source-line/area calculations, original/new paving seam and level, fence overall height and slat direction, post/kitchen clearance and walking collisions, route from living slider, roof visibility, saved-state/global-close preservation, source provenance and all existing room/kitchen regressions. Production compilation is checked through the Sites packaging workflow. Browser/mobile visual QA remains unavailable in this managed environment; no browser visual verification is claimed.
