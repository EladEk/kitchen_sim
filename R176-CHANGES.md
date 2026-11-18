# HomeStudio R176 — Floor contrast and wider tile joints

Dry interior floors now use warm grey-beige #c3bcb0, distinct from the existing
wall paint. Their joints increase from 2 mm to 4 mm. The metre grid, original
product identifiers and photographed mineral detail are retained.

The shared appearance is applied to public floors, the personal home and
kitchen, the initial texture preview and the asynchronously loaded owner-photo
texture. WebGPU, WebGL2 and photo-mode floor grids share the new dry joint width.
The WebGL generic joint color now uses the same linearized cement-grey swatch
as WebGPU. Wet-room and exterior product layouts keep their existing widths.

Four installed-floor photographs arrived during the update and were inspected.
They show warm grey-beige tiles, restrained cloudy mineral variation and matching
skirting against white walls. The floor and both procedural/physical skirting
now share that appearance; the floor joints use darker warm cement #aaa397.
The swatch is visually guided by these photos, not a color-calibrated measurement.
Original photo texture detail and uploaded reference bytes are not modified.

Source changes are committed before verification. Existing tests are retained
and obsolete 2 mm expectations are updated. The material regression checks
actual floor/wall luminance separation and the WebGL joint uniforms.

Verified: 46/46 focused material and native shader cases, 496/496 full-source
cases and 223/223 public cases. The private/public/Worker build passes. Exported
Clean checks and publication results are recorded during release in qa/progress.md.
Device appearance has not been verified on Android here.
