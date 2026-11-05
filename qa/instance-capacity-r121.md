# R121 verification

Source changes were committed before test batches.

## Exact reproduction

`instance-negative-r121.txt` reproduces the owner's exact 112,512 > 65,536-byte
binding failure on the unpatched r185 renderer: a 1,758-matrix instance pool
with only 128 currently drawn instances selected a uniform buffer from the
draw count and bound the full pool. This establishes the root cause independently
of assumptions about the phone's driver.

The reviewed capacity calculations were compared with the official npm
`three@0.186.0` Instance.js. Only those capacity calculations are backported;
the project stays on its pinned r185 API and dependency versions.

## Final validation

- Source/assets suite: **491/491 passed** (`test-results-r121.txt`).
- Compiled public/private integration: **17/17 passed** (`integration-r121.txt`).
- Secure production build passed (`build-r121.txt`) with 252 sealed originals. Direct private URLs remain denied; authorized hashes, video ranges and absent client secrets were verified.
- Post-fix native regression (`instance-positive-r121.txt`) explicitly requests a 65,536-byte uniform limit and cycles the same 1,758-matrix pool through 128 → 1,758 → 64 → 1,024 → 1,758 drawn instances. MRT/AO/bloom/FXAA and newly introduced shadow variants also pass without validation errors.
- Actual public building/GLB/site verification (`native-startup-r121.txt`) explicitly applies the phone's 64 KiB uniform, 128 MiB storage, 256 MiB buffer and 8,192-pixel texture limits. Original portrait, phone-canvas and wide-canvas aspects, lobby walking, cached reuse and apartment section draws all pass. The phone-aspect step adds 31 prepared objects to the first 203, matching the 234 preparation objects in the owner's report. Same-view reuse requires no new compilation.
- Clean installation check (`install-patch-r121.txt`) applies the tracked patch to pristine official npm r185 source and bundle files. Reapplying is idempotent, stale Vite prebundles are removed, and both generated files exactly match the dependency bytes used for the validated production build. Atomic replacement avoids changing package-store hardlinks.

Native verification uses Dawn's null backend. It validates API calls, shader
compilation, resource limits and draw completion, not physical ARM pixels or
FPS. Reload R121 and retry on the owner's phone for final device verification.
