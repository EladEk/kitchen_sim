# HomeStudio R111

## Loading feedback

The simulator now gives the loading status a browser paint opportunity before
starting heavy scene work. District loading names the current preparation stage:
building/materials, personal layout, shared surroundings, walking and lighting.
The overlay remains until the renderer produces the first view. Selecting a
building, floor or apartment, entering/leaving a tour, and manually changing
render quality also show preparation feedback.

Personal home and kitchen rebuilds use the same deferred scheduling. Rapid
changes cancel the previous pending build, so only the newest choice is applied.
The next real render clears the loader; a timer never pretends that loading has
finished. Scene visibility, daylight, inspection framing and saved recovery poses
are applied to the replacement scene. Active WebXR retains its existing render
path rather than waiting for a desktop animation frame.

Photo quality shows a full overlay while preparing its renderer, snapshot and
lighting acceleration data, then while producing the first image. Once the
image is visible, a smaller header indicator accompanies progressive lighting
and reflection refinement. The live-view toggle remains usable to cancel.
Errors, photo cancellation, XR changes and disposal remove the overlay and clear
busy state. No estimated percentages are displayed.

Image export shows a loading status before the high-resolution render and
encoding. The public tour pauses normal frames until the image blob completes,
then restores normal rendering. Home and kitchen image exports await their
preparation before downloading. Existing plan/SVG exports are unchanged.

The shared loader uses a compositor-friendly spinning ring and readable status
text, with a static indicator when reduced motion is requested. Ordinary tour
frames do not trigger an overlay. Unexpected browser/driver stalls cannot be
detected while JavaScript itself is blocked; this change prepares the indicator
before the known loading and rendering tasks begin.

## Install and checks

The full-source ZIP is complete. The update ZIP contains complete changed files
to replace in R110 beside package.json. Dependencies are unchanged. Preserve the
existing document password and session signing secret. Build and runtime must
share DOCUMENTS_ASSET_SECRET, or DOCUMENTS_SECRET when no separate asset key is
configured.

Checks cover the two-frame paint opportunity, cancellation, throttled-frame
fallback, error forwarding, accessible overlay reuse/disposal, photo startup,
first visible photo samples, backend failure and asynchronous cancellation. The
existing scene, navigation, doors, stairs, environment and authorization checks
are retained. Browser WebGL is unavailable in this environment; appearance and
frame rate on a phone or VR headset remain unverified.
