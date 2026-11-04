# HomeStudio R114 — first-frame building visibility

R113 kept the indoor spotlight visible at zero intensity to avoid recompiling
light-count variants at room boundaries. Its manually updated shadow started
with `map=null`, `autoUpdate=false`, `needsUpdate=false`. Three's real shadow
pass therefore skipped its first allocation outdoors. The lit building/ground
materials still included its shadow sampler, while unlit labels did not. This
matches the reported startup view containing labels and outlines without the
building meshes. The missing sampler's fallback has no configured comparison
function; strict WebGL texture/sampler validation can reject those lit draws.

The local shadow now requests its initial update unconditionally and has a
finite downward-looking pose before any room is entered. A missing map is
requested again independently of the current light intensity. Shadow size,
room fade, update throttling and the stable light topology remain intact.

The district uses supported PCFShadowMap from the start instead of the deprecated
PCFSoftShadowMap alias, which Three r185 changes during its first shadow pass.
Startup now applies camera depth, context culling and solar state, compiles
materials and performs a real scene draw under the loading overlay. Readiness
requires a completed draw with no reported GL error and allocated visible
shadow targets. A failed first draw exposes the retry state instead of marking
an empty view ready. Postprocessing also falls back to direct rendering after
INVALID_OPERATION and other draw errors, not just allocation errors.

The apartment selector now says “כל המתחם” when the district is selected.
The R113 floor, cladding, bed, material and upholstery changes are preserved.

Validation: 454 unit/asset tests passed. New tests run Three's actual shadow pass
and shadow-array uniform binder: the old unrequested state leaves a null map;
the corrected outdoor update allocates a PCF depth comparison texture for both
mobile and desktop sizes and restores it after trimming. A native EGL test
checks visible pixels with a configured comparison sampler. Native GLES allows
undefined behavior for its unconfigured control, so that result is recorded
without claiming it reproduces a strict WebGL draw error. Tests also verify
that compilation alone cannot dismiss startup loading and that failed drawing
and missing shadows do not mark a scene ready. All 16 compiled-site integration
checks passed, including stairs, ground maps and encrypted personal access.

The supplied phone screenshot guided diagnosis. A live phone/VR visual check
has not been performed; the available cloud browser has no WebGL context.

The update ZIP contains complete changed/new files relative to R113 commit
704e700a5a5a8797723b9e7a393fea86250f08b3. The full-source ZIP contains all tracked
files. Neither includes environment secrets, node_modules or built output.
