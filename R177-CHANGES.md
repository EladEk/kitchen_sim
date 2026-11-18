# HomeStudio R177

Based on the released R176 source and its publication record
`ddb846c5ed8c6c3f58b0525b9e619bc5e16b317c`.

- Reduced sky Rayleigh strength, restrained upper-sky IBL chroma and retained a
  midday solar warmth floor. The specified RGB gains keep green below unity.
- Aligned astronomical and standalone sun rigs, room fill, interior probes and
  mobile paint to the requested warm-white palette. These are author-specified
  rendering values, rather than measured spectral/CCT calibration.
- Replaced legacy cyan glazing swatches in the building, home, garden and
  outdoor kitchen builders. Public material restoration bounds alpha while
  retaining already-clear panes. Photo Quality uses the same crystal-glass
  optical profile and updated attenuation.
  The suggested legacy `reflectivity=.9` setter changes Three.js IOR to 2.125,
  so restoration retains physical IOR 1.52 and specular intensity 1 instead.
- Corrected the standalone kitchen floor swatch and building tile metadata.
  The existing greige material, 100 × 100 cm grid and 4 mm dry grout remain.
- Photo Quality's generic floor textures encode 0.25 satin face roughness,
  0.56 matte face roughness and 0.92 grout roughness with 15% grout modulation.
  Its scalar roughness stays at one so the map supplies those actual values.
  Satin physical materials retain clearcoat; wet/exterior layouts remain.
- Wall-fade and selection clones retain the original traditional material
  binding, including chained clones, so photo entry recovers opaque textured
  paint while the live wall is faded.
- Lifted instanced olive-green lawn blades and the WebGPU turf palette, and
  replaced the cyan initial backgrounds in the district viewer, lightweight
  startup shell and CSS viewport/loading layers. The HTML boot screen uses the
  same ivory. Raised standalone environment bounce to 0.45.

All previous tests remain, with numeric expectations updated for the requested
constants and new regressions for the changed rendering paths. Verification
results are recorded in `qa/progress.md` after the committed source is checked.
No new external assets or network dependencies are introduced.
