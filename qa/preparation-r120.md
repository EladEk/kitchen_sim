# R120 verification

Every changed source/test batch was committed before tests.

## Reported failure and resulting change

The owner's R119 native ARM renderer initialized correctly and uploaded its
textures. It then reached the application guard at 60,081 ms with 14/80 compile
batches complete and 5,607 collected draw objects. R120 reduces overview work
through existing district batching, excludes hidden/empty/proxy/off-camera
preparation, reuses prepared bindings and permits healthy progress beyond the
old total-time guard. A single batch still has a measured time limit and error
diagnostics. Material/context changes and cancelled native jobs are covered.

## Actual geometry measurement

Using the public building, complete shipped GLB furniture, site and 394 × 734
camera aspect, the original headless fixture had 5,594 draw objects, 5,545
visible objects and 1,890 potential native compile objects. DOM building labels
and the sky are omitted from this fixture. With the same camera/geometry after
the overview change, 276 objects are visible and zero empty instance groups
remain. The original detailed model is preserved for fitting, collision and
detailed views; only its redundant overview rendering is hidden.

## Final checks

- Full source/assets suite: **491/491 passed** (`test-results-r120.txt`).
- Compiled public/personal integration: **17/17 passed** (`integration-r120.txt`), including private geometry ownership at 4102, doors, all eight transforms, common/service stairs, map markers and walking routes.
- Secure production build passed (`build-r120.txt`). Server checks verified 252 sealed source files, denied direct private URLs, authorized original hashes, video ranges and no client secrets.
- Actual native Three WebGPURenderer API preparation and real draw passed for initial overview (**203 compile objects / 9 batches**), detailed lobby walking (**439 / 19**), same-view reuse (**0 new objects / 0 batches; 439 cached**), and a ground apartment section (**60 / 3**) (`native-startup-r120.txt`). No GPU validation errors occurred.
- Regression cases cover real instance identities, unchanged parent pointers/shadow flags, visibility/frustum scope, empty batches, material/layout normalization, reused region keys, cache invalidation, serialized cancellation, measured percentages, healthy total-time progress and single-batch budget errors.

Native verification uses Dawn's null backend with actual geometry/furniture and
headless image pixels. It verifies API calls, shader compilation, bindings and
draw completion, not final imagery, physical ARM timing or phone FPS. The
owner should reload R120 and retry forced WebGPU for that device check.
