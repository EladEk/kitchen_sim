# Interior material atlas

`interior-atlas-r22.png` was generated with the built-in ImageGen tool for this simulator. It supplies illustrative photographic-style albedo detail, not manufacturer-authenticated scans. The renderer extracts each quadrant at runtime and preserves the selected finish colours. Source room photographs and measured plan geometry are not replaced by this image.

Quadrants: top-left warm quartzite; top-right oak; bottom-left matte porcelain; bottom-right linen. Height and roughness detail are derived from the bitmap, with fine procedural fallback while it loads. Product codes and tile sizes remain those supplied by the owner.

## Ordered floors — revision 23

The four ordered floor materials no longer use this generated atlas. `src/ordered-flooring.mjs` connects each rendered material directly to its Harash order product: MI402439 matte-white 100×100 cm, YUCLCE33 grey R10 30×30 cm, YUCLAC33 R11 33×30 cm and EGEHDA15 Habitat Dawn R10 15×60 cm. Repetition follows those physical tile dimensions. Each has its own material/cache entry; a generic bitmap cannot replace it asynchronously. Both kitchen scenes use the same MI402439 definition; original and extended terrace paving share the same EGEHDA15 definition and world grid.

No authenticated image of MI402439 was present in the supplied five-page order or found through the exact-code/name supplier search. The source room photos show installed floors under construction dust and uneven light; these are not treated as a clean manufacturer scan. Product-specific shader variation and screen shades remain illustrative and are explicitly described that way in the interface. The generated porcelain quadrant remains only for optional experimental floor finishes. Furniture oak remains unrelated to the ordered terrace tile.

## Generation prompt

Use case: product-mockup. Asset type: 3D interior simulator material albedo texture atlas, not a room rendering. Create one perfectly square 2048 x 2048 image divided exactly into four equal square quadrants, with no borders, gutters, shadows, labels, text or watermarks. Every quadrant is a straight-on, flat, orthographic, evenly lit photographic surface scan, edge to edge, no perspective. Top-left: honed Taj Mahal style ivory beige quartzite slab, realistic translucent mineral grain and flowing long subtle tan veins, a restrained upscale warm stone, not white Carrara marble, no grout. Top-right: natural light European oak veneer with exceptionally realistic fine vertical grain, a few narrow elongated growth features, matte finish, no boards or plank seams. Bottom-left: clean warm off-white matte large-format porcelain tile surface, subtle mineral mottling and fine microscopic pores, no grout, no tile divisions, no stains or construction dust. Bottom-right: light neutral greige woven linen upholstery, realistic fine irregular threads, flat unstretched cloth, no folds, no seams. Each entire quadrant must work as a repeatable PBR base-color material sample for a physically based 3D renderer. Extremely lifelike high resolution material photography, low contrast even illumination, no baked directional lighting or reflections. The four materials must occupy exactly the four quadrants. This is an illustrative material atlas, not a manufacturer-authenticated product scan.


## MI402439 original owner photograph — revision 24

The main floor now bypasses both the generated atlas and the revision 23 procedural fallback pattern. Original owner files are in `owner-products/`; no edited version replaces them. Their exact identities and crop bounds are recorded in `src/owner-product-references.mjs`. `src/ordered-floor-photo.mjs` samples the clean region of the original tile photograph at runtime, keeps its RGB pixels, uses a white material tint, and leaves the height map flat. Floor joints remain 1×1 m. The source is a showroom photograph with uncalibrated light, not a manufacturer scan. Only MI402439 has this photographed texture; the other floor products remain explicitly schedule-derived.

## Harash catalogue product images — revision 25

The owner's full 41-page catalogue now supplies the actual Classico Cement R10/R11, Habitat Dawn plank and Mona Grey Decor colour images. Their physical sizes come from the apartment order; Mona is oriented 75 cm horizontally and 25 cm vertically. Habitat grain follows the 60 cm plank axis. Native asset bytes and source page/object/hash metadata are retained in `harash/manifest.json`. Runtime canvas sampling preserves RGB and uses flat height maps, with illustrative roughness. Catalogue photos are not calibrated PBR scans. MI402439 still uses the owner's photographed tile, not a similar catalogue tile. This supersedes earlier schedule-only notes for the matched wet/exterior surfaces.

Sanitary and tap images in the same folder are comparison evidence, not textures projected on geometry. MuPDF reconstructs native transparency masks for the Eco bath, guest basin, Dror rail and 35 cm arm; the native encoded images and their original hashes remain present too. Detailed match confidence, variant limitations and source rectangles are in `src/harash-catalog.mjs`.

## Floor rendering — revision 27

Original source bytes and crop bounds remain unchanged. At runtime MI402439 receives a bounded broad-lighting correction in linear colour (gain 0.85–1.15), retaining its photographed grain and flecks. Catalogue RGB is unchanged. The same prepared colour pixels are shown in the floor card's original/prepared comparison. No original attachment is edited, and no generated bitmap replaces these ordered products.

Ordered floors now rotate their source pattern per physical tile instead of mirroring repeats. Square tiles allow 90° turns; rectangular shower tiles and terrace planks allow 180° only. Thin joints use estimated millimetre widths, pixel-area antialiasing and shallow edge relief; the printed photo pattern remains flat. Matte physical-material reflection and a shared neutral tone mapper replace the former filmic lift. Optical parameters and joint dimensions are estimates, not measured PBR or installation specifications. The manufacturer's full set of tile faces is not available, so rotations of the supplied single image remain an approximation.
