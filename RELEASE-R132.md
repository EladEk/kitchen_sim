# Home Studio R132

This release addresses the patchy facade appearance reported on the neighbouring buildings after R131.

Overlapping facade veneers from exterior and partition wall traces are combined into one cover per storey. Coplanar cosmetic rectangles are unioned without filling doors or windows; near-identical planes within 1 mm are consolidated. The solid wall geometry and collision model are untouched. Ground veneer batches use the same union. This removes redundant depth surfaces and reduces the exterior panel count.

Stone-course orientation now uses the transformed vertex normal rather than a normal reconstructed from world-position screen derivatives. Per-stone variation uses a bounded polynomial hash, with 2.5% total tonal variation and a fade at distance. The 4 mm recessed joints have a restrained stone-coloured shade rather than dark lines. Both WebGL2 and WebGPU keep the same stone colour, matte roughness, dimensions and tone profile. The public export and all district copies share that finish.

R131's beige linen, wall-backed sofa layouts, opposing TV consoles and browser elevator floor selection are preserved. WebGL2 remains the default, and the private password gate remains in place.

QA includes the actual facade shader linked on native GLES3, finite pixel probes at district offsets, disjoint cover geometry in the actual nine-storey model, and exported facade ray checks through all eight building registrations. These do not replace a full visual inspection on the user's phone. Details are recorded in qa/validation-r132.md.
