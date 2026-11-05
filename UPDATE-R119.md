# HomeStudio R119 — mobile WebGPU compressed texture fix

The R118 diagnostic log identified valid native WebGPU initialization followed
by ASTC4x4/ETC2 texture allocation errors. The three cotton-jersey PBR maps
were encoded at 1023 × 1024 pixels. This device requires base dimensions that
align to 4 × 4 compression blocks; the failed texture then produced repeated
secondary `Invalid Texture` upload errors during scene preparation.

The fabric color, normal and roughness maps are resampled consistently to
1024 × 1024 before Basis encoding, with complete regenerated mip pyramids.
The encoder aligns future maps too. Original scan photographs are unchanged.
The existing compressed GPU texture path, furniture and material appearance
are retained. All 14 shipped maps have an alignment/mip/header regression check.

Native WebGPU loading now checks Basis dimensions before upload. If a future
unaligned map is encountered, its existing raster counterpart is loaded and
the diagnostic log identifies the asset and its exact dimensions. Forced
WebGPU stays forced; this does not switch the renderer to WebGL2.

The first graphics error in each attempt is pinned outside the bounded event
timeline, so a stream of secondary errors cannot discard it. Copy/TXT export
includes that original cause along with the latest failure. Reloading restores
it, and Clear removes it.

After publication, reload R119 and retry forced WebGPU. ARM physical-device
rendering/FPS still requires checking on the owner's phone; API validation in
the development environment is not a claim of that physical-device test.

The update ZIP contains complete changed files against R118 source commit
ab0a84ffbe7b5fb1a50ba1e164d4a427e931eaf5.
