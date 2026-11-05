# Home Studio R128

The regular public and personal district views default to **uniform neutral lighting**. White lights and one fixed neutral environment replace the solar contribution to the model while leaving the sky visible. The option can be disabled in Options and persists across entries. Switching it preserves the camera and renderer, uses queued preparation, retains the same environment allocation, and never destroys a live shadow target. Unused solar shadow refreshes are suppressed while the mode is active. Natural lighting remains available.

All building facade builders now share the private apartment's existing stone colour `#d9d2c5`, roughness and albedo grain. Public restoration no longer tints it with a separate bitmap. Exposed wall returns are split across their thickness: exterior halves receive stone and halves opening into rooms retain paint. Construction bounds and door openings are unchanged.

Door frames now have deep jambs, door stops, casings on both faces and a fine casing step. The profile is shared by the home, base apartments and upper floors. It has no bottom bar.

The standard ground-apartment kitchen keeps its plan-registered footprint but replaces the single grey mass with panelled base fronts, drawers, handles, a recessed plinth, a distinct stone worktop, upper fronts and separate fridge/freezer doors. Upper-floor kitchen finishes receive the same generic cream/stone palette. These are standard illustrative finishes; the private kitchen's saved design remains separate.

Convex room corners receive a shared transparent contact gradient to improve depth in mobile and XR. It is a visual approximation, excluded from collision and photo ray tracing. Existing floor/ceiling cavity shading remains in place.

Verification results and physical-device limits are recorded in `qa/validation-r128.md`.
