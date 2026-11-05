// Keep edits to the shared exported bundle strictly ordered. Static imports
// with top-level await may otherwise read and overwrite each other's changes.
await import('./apply-three-instance-capacity.mjs');
await import('./apply-three-compilation.mjs');
await import('./apply-three-shader-cache.mjs');
await import('./apply-three-transparent-preparation.mjs');
await import('./apply-three-shadow-bindings.mjs');
await import('./apply-three-target-bindings.mjs');
