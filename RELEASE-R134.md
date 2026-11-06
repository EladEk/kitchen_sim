# Home Studio R134

The facade finish now uses the chosen limestone colour directly in both rendering engines. Large legacy colour maps and per-stone random tonal patches no longer modulate this material. Fine grain is limited to 0.15% and fades at distance. The 4 mm staggered joints remain, with 4% maximum colour contrast. The facade's derivative-based normal relief is removed; fallback height and roughness maps are flat. Photo conversion uses the same matte roughness and restrained joints.

The unused R96 stone image import is removed from the district viewer. A small R134 label is visible in the header, including on phones, so the loaded application revision can be identified without opening Options.

R133 render-layer consolidation, brown-beige lobbies, elevator floor selection and public/private access are retained. Geometry, furniture, openings and movement are unchanged.

Checks include native GLES pixel probes with deliberately mottled incoming albedo, material/photo checks and production regression checks. These probes isolate the material; they do not certify the complete result on the user's phone. Detailed validation is recorded after checks.
