# HOME STUDIO R170

R170 repairs grey, flat interior paint in the public and personal district tours.
The apartment paint remains neutral white and the lobby paint warm white.

## Run the complete source

Use Node.js 22.12 or newer (Node.js 24 is also supported).

```sh
npm install
npm run dev
```

Create the personal, public and server production outputs with:

```sh
npm run build
```

The tracked hosting configuration and Vercel configuration are included. Configure
server credentials using `.env.example` when running your own private entry.

## Appearance changes

- Physical eggshell paint and matte ceilings with metre-scale projected micro normals.
- An explicit orthonormal normal frame works without geometry UVs or tangents.
- Floor/ceiling contact shading remains active at reduced quality and in stereo.
- Neutral indoor radiance and directional room fill replace uniform paint emission.
- Natural and neutral inspection lighting retain brightness differences between
  walls, ceilings and the HVAC bulkhead. Floors keep their own reflection budget.
- Projected opaque paint no longer requests missing geometry UVs in the shadow pass.

## Verification

- 43 targeted regression tests, including the actual serialized public building.
- 31 native Dawn-null shader/API checks, including UV-free paint, grazing camera
  angles, shadow cascades, mobile post processing, night lights and UHD capture.
- Software Vulkan renders use the actual public apartment geometry and the mobile
  post-processing pipeline. See `qa/r170/natural.png`, `reference.png` and
  `reference-tier3.png`. These verify rendered appearance at 640×480, not phone FPS.
- Actual Android ARM pixels and performance still require device verification.

The software capture script is `qa/render-interior-r170.mjs`. Its optional external
Dawn package and software Vulkan driver are development tools and are not required
for installing, building or using HOME STUDIO.
