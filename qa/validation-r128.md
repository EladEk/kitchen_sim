# R128 verification

Source changes were committed before running checks. This release keeps the pinned Three.js r185 fixes and the existing password-protected personal entry.

## Behaviour and geometry

- 532 source/unit tests passed, with no failures or skips (`test-results-r128.txt`).
- After the final physical-wall projection change, all 8 appearance checks passed (`appearance-results-r128.txt`). Corner gradients attach to actual wall faces and omit open-plan boundaries.
- Both neutral-lighting checks passed (`reference-lighting-results-r128.txt`): persisted preference, day/night invariance, repeated toggles, stable targets and restoration of natural room environment maps.
- All 18 compiled-scene flows passed (`compiled-results-r128.txt`). These cover public apartments, private partitioning, bounded collider buffers, entrances, doors, navigation, stairs, service-room descent and mirrored/rotated buildings.
- The actual exported exterior corner is stone while its inward face is plaster. The kitchen party wall remains white in source, walking batches and all eight buildings. Construction bounds remain unchanged.
- Interior ray audits found no stone-facing-room hits in either the personal or exported public model (`interior-audit-r128.json`).
- Facade builders share the private facade's existing colour, roughness and grain. Decorative stepped frames are merged per door and excluded from structural walking colliders; the existing collider memory limit passes without increasing the limit.

## GPU/resource replay

- The full native WebGPU replay completed six living-room, outside and bathroom transitions without captured GPU validation errors or device failure (`reference-quality-r128.txt`).
- The final short replay completed four transitions, including both reference-lighting states, a return indoors and a natural bathroom probe (`reference-quality-r128-short.txt`). `errors` is empty and `failure` is null.
- The replay retains live shadow-target identities through toggles and preserves mirrors. It uses Dawn's null backend: this validates commands, shaders and ownership, not pixels, device frame rate or phone appearance.
- Pre-existing `copyFramebufferToTexture` source/destination-format warnings (`rgba16float` / `bgra8unorm`) remain in the native console logs. Reflection pixels are not visually verified by this backend.

## Build and access protection

- The final secure build succeeded after the error-state checkbox adjustment (`build-r128.txt`). All 5 public-build/security tests passed (`public-security-results-r128.txt`).
- The compiled worker and Vercel adapter checks passed (`security-results-r128.txt`): 252 encrypted originals, direct-URL denial, authorized original hashes, ranged video delivery and no client secrets. The public rendering floor remains available.
- The lighting preference can be changed in the options panel even when graphics initialization fails, and takes effect on retry. It remains disabled during an active load/preparation operation.

## Limits

The available cloud browser cannot initialize a usable 3D graphics context. Browser checks can verify revision, controls and preference persistence, but not the rendered scene. Real-device appearance and performance require checking the published version on a phone or desktop GPU. The corner contact gradient is an approximation, not a baked global-illumination lightmap.
