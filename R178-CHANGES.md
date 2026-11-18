# HomeStudio R178

## Detached apartments and floors

- Focused views contain the actual cropped surfaces instead of full building
  buffers with fragment-only masks. Drawing, picking, framing and photo workload
  therefore share the same apartment/floor geometry, including duplex floors.
- Every valid apartment/floor pair resolves independently, including apartment
  32's upper floor, and appears in that floor's apartment selector.
- Cropping preserves furniture instance colours, interpolated vertex colours,
  source texture/physical material bindings and animated door copies.
- Detached views render against a contrasting warm-grey background while their
  sunlight and environment illumination remain unchanged. Sky visibility and
  background ownership are restored after each draw.
- Previous wall fades reset before view preparation and height changes.

## Editing and Photo Quality

- Editor entry and exit fit the apartment after measuring the current canvas.
  Ordinary panel resizing continues to preserve camera pose.
- Phone layouts reserve more height for the model and contain canvas overflow.
- Photo Quality is retired during editing so placement/dragging uses the live
  scene. Finishing editing makes Photo Quality available again.
- Photo preparation applies real selection snapshots before enforcing workload
  limits, preventing full source batches from being counted as a small crop.
- Lighting maps release bindings when temporary cropped materials are disposed.

The R177 warm-white lighting, clear glazing, satin photo floors, greige tiles and
4 mm dry joints remain. Public/private access and saved apartment layouts remain.
Verification results and deployment provenance are recorded in `qa/progress.md`.
