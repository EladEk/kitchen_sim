# R118 verification

Source changes were committed before each test batch.

- Production build: passed; 252 source files sealed, no plaintext originals in public output (`build-r118.txt`).
- Broad suite: 480/481 passed on first full run. The sole failure was a case-sensitive SSR assertion for React's `readOnly` attribute; corrected to a case-insensitive HTML attribute assertion and committed. The complete affected test file then passed 47/47 (`ui-final-r118.txt`). No application code changed after the successful build.
- Compiled public/private integration flows: 17/17 passed (`integration-r118.txt`). Actual server checks also passed for encrypted assets, denied direct URLs, authorized original hashes, video ranges, absent client secrets and floor rendering.
- New unit coverage: original error and cause chain, timeouts and preparation budget details, capability inspection, device loss, bounded/redacted persisted data, console filtering/restoration, forced-engine support errors and accessible dialog markup.

Browser check used the actual DistrictViewer via `graphics-failure-r118.html`, Chrome 155, 1363 × 936. This cloud browser cannot create a WebGL context. The failure button opened the actual original context error and stack; switching to forced WebGPU on the HTTP preview recorded `WEBGPU_UNAVAILABLE` and the precise secure-context reason while retaining the previous attempt. Options > graphics log also opened the viewer. The layout was visually checked; clear and Escape worked. Clipboard access was unavailable on HTTP and the fallback selected the report with a manual-copy instruction. TXT download succeeded and its 6,746-byte contents included R118, last failure and the event timeline. These are test-environment failures, not a reproduction of the owner's device-specific WebGPU error.

The owner's next WebGPU attempt after reloading R118 is needed to capture their original failure cause. No claim is made that logging resolves the underlying driver or shader failure.
