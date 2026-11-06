# R135 verification

All implementation changes were committed before their checks. The final tested source is c90137c20bd09da61287333f029deb2893b0503a; later release changes contain only instructions and validation records.

- All 547 source/unit checks passed with no failures or skips (`src/*.test.mjs` and `public-view/*.test.mjs`).
- The independent PDF-path check reads page 10 of the actual original building PDF and verifies the traced L-counter polyline. The dimensioned photo identifies apartment 42 on floor 8; its perspective distortion is not used to change the building scale.
- Apartment 42 keeps four enclosed bedrooms including the safe room, its existing wall/door traces, three balconies and original floor/shaft registration. No footprint, opening, roof or neighbouring-apartment trace was changed.
- The actual floor-8 instance geometry contains the north kitchen, west return, fridge, two laundry bodies, open bathtub and long master shower. The countertop legs meet without coincident top faces. The projected map includes the new fixture outlines and the safe-room, utility, guest-WC and master-bathroom labels.
- All 103 source wet rooms retain separated fittings, clear door sweeps, real wall backing and connected standing approaches. Continuous collinear wall fragments are considered together for backing; a genuine opening is still rejected.
- All 16 selected production checks passed with no failures or skips. The new apartment-42 check inspects actual sanitized instance buffers and their body extents, since the public export intentionally removes private placement/source IDs. It verifies every new kitchen/laundry standing approach through the real walking world in all eight building registrations. The sanitary check verifies all exported wet-room approaches across the same registrations.
- Startup/current-version consistency, all 43 apartment doors, elevator landing geometry, wall finishes, facade layers and texture sharing passed. The audited district/walking stone batches still have zero eligible overlapping rectangular layers; see `surface-audit-r135.json`.
- The secure production build and compiled Worker/portable-adapter checks passed: 251 sealed private source assets, denied direct private URLs, authenticated original hashes, video range responses and no client secrets.

## Visual verification and limits

A plan comparison image was generated from the original page-10 raster and the actual model placement records. It was visually inspected: the highlighted cabinet and sanitary footprints follow their corresponding source positions. This is a geometric plan overlay, not a browser screenshot or a photoreal scene render.

Full-scene browser and phone rendering were not certified; the available browser was already found to have WebGL disabled during R134 verification. No phone frame-rate, physical WebGPU or immersive VR claim is made.

The 4m kitchen run follows the readable dimension in the supplied photo. Sanitary product shapes, cabinet/appliance heights, installation gaps, beds, sofas and finishes remain illustrative. The two service-room appliance symbols are represented as a washer and dryer, without asserting exact product models. The original PDF and photo are planning references, not an as-built survey.
