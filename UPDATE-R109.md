# HomeStudio R109

The interior of the eight-building block now follows the planted pedestrian
corridors visible in the supplied opposite aerial. Two pale paths cross between
the parking courts, with green shrubs, narrow burgundy planting, rounded broadleaf
trees and small rectangular tree/lawn pockets in the shared paved forecourts.
Short connections keep the forecourts accessible through the planted edges.
The existing external parks, vehicles and R107 ceiling corrections remain.

The attachment is byte-identical to the retained official August 2024 aerial:

- Source: https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/08/104187-5_effi_hadmaya_c_press_-1.pdf
- Retained source: public/house/efi-reference/site-opposite-view.pdf
- SHA256: 35546b8ad233b41cf0fdf0a32ff0fc6532361791ab705cda0c89730f13536bf8
- Image traces, coordinate system, reconstructed dimensions and limits:
  public-view/courtyard-reference-r109.json.

The coloured bands are planted beds, not red paving. Species, planting widths,
tree spacing/counts and construction sections are illustrative; the oblique
marketing view is not a survey or verification of completed construction.
There is no reliable evidence for specific palms, benches, a playground or a
large central plaza inside this block, so those are not introduced here.
The central rear building's duplicate 4102 label in this source does not change
its existing accepted 4103 identity or any building placement.

All 209 traced plot1410 bays/labels, 452 total retained bays, drive connections,
building entrances and 32 private garden plots stay fixed. Public planting is
clipped against these surfaces. Tree pockets open real holes in the shared
forecourt paving; grass and soil occupy their respective polygons. Plantings
leave the crossing paths and forecourt links unobstructed. Polygon clipping
runs at build time; public, personal and VR views use the same compiled layout
and actual render geometry for walking collision.

The botanical detail uses one procedural leaf atlas, two plant palettes and
14 instanced/merged batches. Low canopy cores cast shadows, textured leaf cards
receive light, and no additional scene lights are added. Resource disposal and
finite instance transforms are checked. Tree detail keeps the existing distance
tiers and automatic tour quality system.

## Installation and verification

The full-source ZIP is complete. The smaller update replaces changed files in
R108 beside package.json. Dependencies are unchanged. Preserve the existing
document password and session secret. Build and runtime must share the same
DOCUMENTS_ASSET_SECRET (or DOCUMENTS_SECRET if no separate asset key is set).

Checks cover actual north/south and east/west walks, every forecourt connection,
private gardens, parking access, grass/paving holes, batching and disposal,
existing service/common stairs and document authorization/encryption. A plan
review uses the compiled polygons and actual placements. Browser WebGL is not
available in the verification environment; phone/VR appearance and frame rate
have not been validated here.
