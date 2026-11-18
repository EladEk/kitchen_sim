# HOME STUDIO R171

This complete source includes the public district, password-protected personal
planning, original product/reference assets and production server. R171 updates
Building 4102 / Apartment 4 materials and repairs unsafe native geometry inputs.

## Run

Node.js 22.12+ (Node.js 24 supported):

```sh
npm install
npm run dev
```

Production public / personal / server output:

```sh
npm run build
```

Keep private deployment credentials in server environment variables described by
`.env.example`; they are not included in the source download. Existing personal
planning access rules and public/private layouts are preserved.

## Rendering changes

- Missing, constant or invalid UVs receive box-projected world-metre coordinates.
  Normal buffers remain Float32, missing/invalid normals and tangents are repaired.
  Invalid geometry receives a local map-free fallback without changing shared
  valid surfaces. Opaque paint uses explicit metric projection in its TSL path.
- Separate physical eggshell walls (`#F2EFE9`, roughness .82) and matte ceilings /
  AC drywall (`#F7F6F2`, roughness .94). Neutral mobile paint radiance, warm fill,
  micro normals and tight corner/contact shading retain structural depth.
- Sawn limestone `#E6DFD3`, secondary grey `#B8BCC0`, fascia `#7E8286`, white soffits,
  smoke-tinted glass and anthracite metal follow the supplied appearance swatches.
  Powder-coated entry / white room doors, furniture sheen and satin fronts share
  the same material pipeline. Explicit edited yard colours remain editable.
- Metric stone / grout / plank POM, cavity AO, varying roughness, per-tile sample
  rotation/offset and tiny normal tilt. Mobile 4–6 POM steps, desktop 8–16;
  capture uses 24. Texture anisotropy is capped at the supported maximum up to 16.
- The 1 m dry floor retains photographed mineral detail while replacing the phone
  photo's brown showroom illumination with the selected white-granite swatch.
  Wet/shower/catalogue products and original image files remain separate.
- Near-camera render-only wall fading keeps physical collision and doors intact.
- Walking exterior batches span storeys; inward paint/ceiling and furnishings use
  occupied-floor visibility. Mobile static architecture uses dedicated layer-1
  shadow batches, while interactive / deforming / alpha-masked objects keep their
  original shadows. Both WebGPU CSM and local/compatibility shadow cameras support
  this layer. Scene selection, floors and moving doors remain independent.
- Mobile automatic effects stay at tier 1; resolution adapts without cycling full
  effect tiers. DPR stays below 2. A compact four-object shell compiles/draws while
  detailed scene data and furniture load. The shell is a loading preview, not an
  immediately interactive detailed tour.
- AgX, CSM/PCSS, architectural night lighting/LTC, budgeted GTAO/SSR and 4K PNG
  export are retained. Mobile glass uses reflections/transparency to avoid the
  extra refraction pass; desktop high quality uses physical transmission.

## Validation and practical limits

The complete public-view test suite passed **212/212** checks. Additional focused
product/building/floor checks passed **36/36**. Native Dawn-null shader validation
passed **31** cases without validation errors. These are distinct/overlapping test
sets, not one cumulative test count.

Actual Apartment 4 software Vulkan captures are in `qa/r171/`: natural light,
neutral reference light and reduced effects show non-black white walls with a
separate AC/ceiling shape. This verifies software-rendered pixels, not the ARM
phone GPU which reported the original failure.

Correct per-frame counters at the same building-only apartment camera:

| Configuration | Before later R171 batching | Final R171 |
| --- | ---: | ---: |
| Natural, steady, effects enabled | 2666 | 200 |
| Reference, steady, effects enabled | 2164 | 174 |
| Reference, effects disabled | 411 | 126 |

These counts include that test's rendering passes, exclude neighbouring district
context and detailed streamed GLBs, and are not device FPS measurements. The
initial 80–89 values recorded during development counted renderer invocations,
not draw commands, and were discarded. No global <150 draw-call cap is claimed.
The loading shell used 5 draw commands including canvas output; a 147 ms native
compile/draw measurement excludes browser, network and renderer initialization.
A <3 second phone startup target has not been measured on the phone.

The broad legacy source suite also contains inherited assertions about older
socket counts, marker colours, night fixtures and deliberately flat facade
materials. An R170 checkout reproduced 16 such failures. Those unrelated legacy
expectations are not presented as a fully passing source suite.

Reproduce optional native checks with an external `webgpu` package (not a
production dependency):

```sh
WEBGPU_VALIDATOR=/path/to/webgpu/index.js node qa/check-graphics-r171.mjs
WEBGPU_VALIDATOR=/path/to/webgpu/index.js node qa/check-shell-r171.mjs
WEBGPU_VALIDATOR=/path/to/webgpu/index.js QA_FULL_BUILDING=1 QA_RENDER_BACKEND=null node qa/render-interior-r171.mjs
```

`qa/render-interior-r171.mjs` additionally supports an installed software Vulkan
ICD for actual pixels, and `QA_VIEW=exterior` for the exterior view. Source changes
were committed before running checks. Material swatches are supplied appearance
targets, not measured spectral reflectance; inferred stone/plank/relief dimensions
remain visual estimates.
