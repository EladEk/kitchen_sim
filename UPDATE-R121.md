# HomeStudio R121 — respect instance-pool buffer capacity

The R120 phone log reported a 112,512-byte uniform binding against a 65,536-byte
device limit. That size is exactly 1,758 matrices × 64 bytes. The pinned Three.js
r185 instance accessor chooses uniform versus vertex-buffer storage using the
current draw count, while binding the entire allocated instance-matrix array.
LOD or visibility can lower the draw count without shrinking that array.

R121 backports the reviewed capacity calculations from Three.js r186 into the
pinned r185 instance accessor. It selects storage using the allocated matrix
capacity and uses that same capacity for declarations and update tracking.
Large pools use the existing instanced vertex-buffer path. Logical draw counts,
all matrices, geometry, colors, doors, LOD updates and material appearance remain
unchanged. The renderer's real hardware limits are preserved.

The narrow compatibility patch is tracked in
`scripts/apply-three-instance-capacity.mjs` and applied to both the source
accessor and the exported WebGPU bundle. Installation, local dev, npm tests and
secure builds apply it idempotently; stale generated Vite prebundles are cleared
only when the patch changes dependency bytes. Dependency versions stay pinned.
The patch rejects unexpected dependency contents instead of silently proceeding.

Verification includes an exact pre-fix native negative control at 64 KiB,
post-fix count decreases/increases on the same 1,758-matrix pool, MRT/effects
and shadow variants, and actual district/walking/section preparation with
explicit phone-equivalent uniform/storage/buffer/texture limits. Viewport
aspect changes exercise LOD changes that do not change allocated pool sizes.

Native checks validate API/shader/binding behavior, not physical ARM pixels or
FPS. Reload R121 and retry the phone for final device verification.

The update ZIP contains complete changed files against R120 source commit
2120d127bbcb8069951e7124e80471d0b469629c.
