# R136 verification

Implementation was committed before all checks. All 550 source/unit checks passed without failures or skips. Runtime code was unchanged during the final production-test tolerance adjustment in 0d5b4b5fb7cd531cc641b276d73f727280de3509. Subsequent release changes contain only instructions and verification records.

- All 58 balconies remain accessible in the source navigation audit, including hinged exits and contiguous terrace pieces.
- Six source-registered main sun-balcony bays on each repeating floor 1-6 receive matte grey surrounds. The generated geometry contains 66 vertical return sections and 38 joined beam sections. Added vertical walls have corresponding walking collision and map outlines. Overhead beams preserve clear standing height; cutaway views omit floating upper caps.
- The actual source model, restored WebGL materials, WebGPU node conversion and photo conversion retain one independent grey material, without stone-course, albedo, bump or normal textures. Roughness is .94 and metalness is zero.
- All 17 selected production checks passed. The grey facade check inspects the actual sanitized exported geometry, then verifies 144 outward band controls across three storeys, six bays and eight district registrations. It also checks that grey exterior batches remain visible while walking at ground level.
- Render-only consolidation may use an outer face up to the documented 16 mm layer tolerance. The imported source floor sheets vary slightly between storeys; the actual grey controls stay within that tolerance, including rotations and reflections.
- The other production checks retain current-revision startup, all 43 apartment doors, safe elevator landings, all wet-room approaches, apartment-42 fittings, public/private isolation and stone/plaster finish separation. These 16 checks passed with the same unchanged runtime build before the grey test's tolerance correction.
- The stone-surface audit still reports zero overlapping eligible rectangular stone layers and one shared texture for each separate stone material channel. See `surface-audit-r136.json`; this audit does not count every horizontal or unrelated material surface.
- The secure build passed and sealed 251 private assets. Compiled Worker and portable-adapter verification passed: direct private URLs denied, authenticated original hashes retained, video ranges working and no secrets in client output.

## Visual evidence and limits

The owner supplied three additional real photographs. Earlier garden/exterior photos, official Efi Capital stage-A renders and the newly consulted complex-5 C5/C5M specification were reviewed. The specification permits combined stone/plaster/other finishes but does not prescribe this grey product or an exact RAL. Reference roles and unknowns are recorded in `facade-evidence-r136.json`.

The facade review PNG was projected from the actual model triangles and material colours and visually inspected. It is an orthographic geometry/colour review, not a browser PBR screenshot. Full-scene phone rendering, phone performance, physical WebGPU and immersive VR are not certified; the browser available in earlier verification had WebGL disabled.

Positions follow the existing building-4102 balcony traces. Neighbouring C5/C5M/C8 copies still use the existing shared reconstruction. This release does not supply newly surveyed building-specific elevations. Grey colour, beam/return profiles and product details remain photographic estimates. Main walls, windows, door openings and apartment-42 layout remain as before.
