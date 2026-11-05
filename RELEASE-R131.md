# Home Studio R131

Exterior walls now share the private apartment's limestone colour (#d9d2c5), with a dry matte finish. All construction wall faces are classified against the occupied plan, including safe-room walls and short corner returns previously treated as interior paint. A 24 cm registration margin accounts for differences between traced wall centrelines and traced apartment outlines; dimensions, openings and walking collisions are unchanged. Per-face materials keep inward faces white. Roughness is 0.96; colour and height variation, bump strength, normal strength and joint relief are reduced to remove blotchy, wet-looking highlights. Broad faces, corner returns and veneer finishes use the same stone palette in both rendering engines.

Bed linen is warm beige (#d8c8ab). Sofa upholstery remains brown (#946344) with separate red accent pillows (#b82e35); scanned textile and normal maps are retained. Sofa accents no longer share the bedding material.

The 39 upper-apartment sofa layouts and three generic garden layouts place each sofa 6 cm from a real solid wall and a supported television console directly opposite. Public garden apartment 4 derives from the generic source layout. Placement preserves the actual living-room zone, windows, door openings and walking clearances. The conservative source annotation allows 35 cm registration tolerance; physical wall, opening and route checks remain strict. All 41 existing rugs remain present. The personal apartment's own sofa/TV placement and saved furniture overrides are preserved.

Browser tours now offer elevator floor selection for floors 0–8 in the current building. The HUD's “אל המעלית” moves to a safe elevator lobby position. Near the lift, “מעלית ⇅” or the model's elevator panel opens the floor selector. Selecting a floor uses the existing preparation loader and moves to a collision-checked standing position beside that floor's elevator. This is quick lobby-to-lobby transfer, not animated travel through the shaft. The HTML selector is disabled during immersive VR, so it cannot capture and block VR movement.

WebGL2 remains the default engine. The personal password gate and document access controls are preserved. R131 exports and loaders use the shared baseline revision, preventing the R129 public-data mismatch.

Validation results and limitations are recorded in qa/validation-r131.md. No mobile frame-rate or rendered-pixel result is claimed from the browser environment used for this release, where WebGL is unavailable.
