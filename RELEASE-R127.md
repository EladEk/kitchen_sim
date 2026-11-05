# Home Studio R127

R127 corrects the actual party-wall geometry that placed a neighbouring apartment's stone veneer inside the kitchen. Ground-floor shells now classify finishes against the entire occupied storey after each rotation/reflection. Public apartment 4 is built at its own registration instead of inheriting apartment 1's facade classification. Openings and construction dimensions are unchanged.

Dry-room wall paint defaults to neutral white (`#f5f5f3`). Legacy default ivory migrates once; other saved wall colours and bathroom cladding remain selected. White ceilings retain their separate matte finish.

Cabinet motions carry explicit closed and open poses. Right-hand wardrobe/vanity doors open outwards; drawers, service cabinets and the outdoor kitchen retain their actual travel and hinge direction. Moving leaves remain separate from static walking batches.

Personal tours load the detailed kitchen's latest saved finishes, with the home draft as fallback. The selected kitchen paint/wood uses neutral interior radiance. The real MI402439 photo must finish loading before the private scene is prepared; its pattern is not replaced with a public texture. Fine photographed grain also drives bounded matte roughness variation, with no artificial surface displacement.

Scanned wood/fabric albedo is normalized by its measured linear mean in the shader. Compressed KTX2 and JPEG now retain the same chosen finish colour, without a costly compressed-image readback. Normal and roughness maps remain linear data; paint and doors retain a satin finish rather than having their roughness overwritten with the plaster profile.

Validation results are recorded in `qa/`. Physical-device visual appearance and frame rate still require the actual phone/Intel browser; software validation does not establish those results.
