# R119 verification

All source changes were committed before test batches.

## Confirmed cause

The owner's R118 ARM log reported failed 1023 × 1024 ASTC4x4 and ETC2
allocations, followed by repeated invalid-texture writes. The checked-in
cotton-jersey color/normal/roughness KTX2 headers all matched that size. Their
original JPEG scans are 1024 × 1025; the previous proportional thumbnail step
produced the unaligned base size. R119 aligns the thumbnails before encoding.
Only the three affected KTX2 binaries changed; the other 11 are byte-identical.

## Checks

- Production build passed and sealed 252 source files (`build-r119.txt`).
- Broad source/assets suite: 483/484 passed initially. The only failure was the new test's incorrect assumption that the original JPEGs had the same dimensions as their thumbnails. Corrected the source-size assertion to 1024 × 1025, committed, then both tests in the affected file passed (`texture-final-r119.txt`). No application change followed the successful build.
- Compiled integration flows: 17/17 passed. Compiled server checks confirmed encrypted originals, denied direct URLs, authorized original hashes, video ranges and no client secrets (`integration-r119.txt`).
- Native API validation used Dawn null (`mobile-textures-r119.txt`). Both ASTC4x4 and ETC2 rejected a 1023 × 1024 negative control as expected. All 14 actual shipped Basis maps transcoded and uploaded all 11 mip levels on both an ASTC-normal/ETC2-color configuration and an ETC2-only configuration. Actual Three WebGPURenderer fabric normal/color/roughness material compiled and drew in both configurations. No GPU validation errors occurred on the corrected maps.
- Regression checks cover KTX2 dimensions read from actual headers, complete mip pyramids, original/encoded dimensions, hashes, misaligned response views, preservation of the initial error through a long cascade and reload, retry and clear.

The null backend validates APIs, formats, bindings and mip uploads. It does not
verify physical ARM rendering, pixels, frame rate or the owner's phone driver.
Reload R119 and retry forced WebGPU on that phone for that final device check.
