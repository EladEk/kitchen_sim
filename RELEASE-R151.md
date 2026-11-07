# Home Studio R151

Assisted editing remains entirely in the 3D perspective renderer.

- Hide/show all measurement lines and labels from the bottom toolbar; retained through room selection and save/cancel.
- One-click top and angled camera views, no separate 2D mode.
- Optional camera-facing wall occlusion and transparency for furniture obstructing the subject; reversible display effects.
- Screen-projected X/Z/height drag handles and a rotation handle; position changes remain drafts until saved.
- Click a distance label or bottom metric, enter centimetres, apply and save. Includes vertical gaps.
- Smart nearby wall/furniture gap snapping and edge/center alignment with validation and feedback; can be disabled.
- Quick duplicate enters location picking. Furniture locks persist with saved layouts and block indirect motion through supporting furniture.
- Up to 50 undo/redo operations in the editing session, with Ctrl/Cmd-Z, Shift-Z or Y in the catalog.
- Named room alternatives reuse existing saved layouts. Preview the chosen room, apply or return; other rooms and camera remain unchanged. Saved in this browser; file backup remains available in Options.
- Collapsible movement toolbar.

Verification: source geometry/controller tests and secure production build; 394×852 CPU-rendered mobile fixture exercised hiding measurements, numeric clearance, top camera, locking and dock collapse (107px). Full hardware WebGL/WebGPU behavior on the resident's phone is not certified by the CPU fixture.
