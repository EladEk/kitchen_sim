# Baked lightmaps (R188 pilot: building 4102, ground floor, apartment 4)

The 8 buildings share one model, so a bake for one unit lights that unit in every building. The bake uses a uniform white sky, which makes it independent of the building's orientation.

## Bake one more unit

```sh
npm run build                                   # writes dist/client/baseline
node scripts/lightmaps/extract-apartment.mjs dist/client/baseline <floor> <unit> .site-private/lightmaps/apt-<floor>-<unit>.json
blender -b --python scripts/lightmaps/bake.py -- .site-private/lightmaps/apt-<floor>-<unit>.json .site-private/lightmaps/f<floor>-u<unit> 1024 256
BASISU=<basisu> python3 scripts/lightmaps/package.py .site-private/lightmaps/f<floor>-u<unit> <floor> <unit>
```

- The bake takes about 50 s per unit on CPU (Blender 4.2.3 LTS, Cycles, 1024 px, 256 samples).
- Unit numbers come from `dist/client/baseline/navigation.json` (`floors[].units[].number`).
- To register the unit, add `{floor,unit,indirect,uv}` to `BAKED_LIGHTMAPS` in `public-view/baked-lightmaps.mjs` (`?url` imports of `indirect.ktx2` and `uv2.json`). Also add an `indirectFallback` entry to its loader map.
- Then check that `uv2.json` matches the runtime geometry. Mismatched meshes are skipped by the corner-count check; look at `apply()`'s `matched` count.

## Budget: why only one unit is baked

- Each unit costs about 260 KB: the irradiance KTX2 is about 156 KB and `uv2.json` about 101 KB.
- The AO atlas is baked but not loaded, because it greyed whole walls in the walk-through.
- The building has 40 units (4 on the ground floor, 6 on floors 1–6, 2 on floors 7–8), so baking all of them and loading them eagerly would add about 10 MB. That breaks the phone budget.
- Covering more units needs **lazy per-unit loading**:
  1. Fetch a unit's atlas only when `bakedCoverage()` reports the walker entering it, and drop it when they leave.
  2. Swap the receiving meshes to the baked clones at that point.
  3. On WebGPU, run `session.adapt()` on the new clones. Today the pilot is applied before adaptation and warm-up.
  4. Compile in idle time so entering a unit doesn't hitch.
- Until that exists, add at most 2–3 more units eagerly (under about 1 MB in total).
- The visible gain is modest: soft corner and ceiling gradients. The faked-GI fills already carry most of the interior look.
