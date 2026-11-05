# HomeStudio R120 — prepare the current view instead of the whole hidden model

The R119 ARM report successfully initialized native WebGPU and uploaded its
textures, then hit the application's unchanged 60-second preparation guard at
14 of 80 batches. This was excessive preparation work, not another compressed
texture format failure.

Whole-building and district overviews now render the selected building through
the existing merged district batches, exactly as the other buildings already
do. The original detailed model remains available for dimensions, collisions,
walking, apartment/floor sections and personal variants. Entering a detailed
view switches it back without drawing a duplicate building. Empty instance
groups are hidden, and doors retain their separate interactive batching.

Startup no longer traverses hidden model branches. Native preparation uploads
and compiles only visible drawables in the current camera frustum, excluding
collision proxies and zero-instance batches. Already prepared layouts and
per-object instance bindings are reused across room/view preparation. Material,
lighting and context changes invalidate the relevant cache. Cancelled jobs are
serialized before the next job to protect Three's shared compilation state.
Per-batch diagnostics and measured loading percentages continue to advance.

The 60-second forced-engine guard now applies to an individual compilation batch, rather than stopping a healthy sequence of completed batches at one minute in total. Real first-frame draw and shadow checks remain. Forced WebGPU
continues using WebGPU. No mobile FPS or physical-device timing is promised by
the development API checks; reload R120 and retry on the owner's phone.

The update ZIP contains full changed files against R119 source commit
b08bb3fe65c4c6bc4128899f9694de39c28203bf.
