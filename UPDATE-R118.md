# HomeStudio R118 — inspect why graphics failed

The failure screen now offers View error log, with the same log available from
Options > graphics engine. The dialog contains the original exception/cause
chain, stack, failure code, current preparation stage, timestamped events,
requested/active backend, browser and available GPU capabilities. Copy, TXT
export and clear actions work without the 3D canvas. Opening it pauses tour
input, and Escape/close restore the existing UI state.

The log captures Three/WebGPU compiler warnings/errors, device-lost reasons,
uncaptured GPU errors, initialization timeouts, loading/draw failures and warmup
budget details. It retains failure history through retry or switching engines
in sessionStorage. Collection is bounded and local; it does not send telemetry.
Secret-like fields and URL credentials, queries and fragments are redacted.
Console hooks preserve original behavior and are removed on viewer disposal.

R118 records new attempts. Original details already discarded by R117 cannot
be reconstructed: reload R118 and retry WebGPU, then open/export the log.
This update exposes diagnostics; it does not claim to fix every driver failure.

Full changed files in the update ZIP apply to R117 source commit
c9ea47c8cddc41c2d049f4ea2d6c36adb884828a. Geometry, furniture, movement,
private access and progress percentages retain their existing behavior.
