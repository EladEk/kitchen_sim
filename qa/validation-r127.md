# R127 validation

- 525 source, renderer, furniture and state tests passed; none skipped.
- 18 built-site flow tests passed, including the exported white kitchen party wall in the source, walking batch and all eight registered buildings.
- Interior ray audit: zero stone-facing room hits in the personal scene and public export (R126 had 13, concentrated beside the kitchen/living room).
- Actual patched Three.js physical floor shaders compile/link on native GLES3. The photographed colour and roughness now use the same rotated per-tile UVs and derivatives.
- Every home cabinet motion was compared with its fully opened editable counterpart, then synchronized through the real walking motion copy after static batching.
- Dawn null: six living/bathroom/outside transitions, no GPU validation errors and no resource ownership failure. Two room probes remained bounded. The harness emits framebuffer format warnings on HDR reflection/canvas changes; this is not a pixel test and does not establish correct reflections on physical hardware.
- Secure build: 252 encrypted originals, authorized original hashes verified, unauthorized direct requests rejected, video ranges and the actual floor runtime image checked.
- Live cloud browser: this environment cannot initialize the 3D renderer. Pixel appearance, device-specific colour and phone/Intel FPS could not be verified here.

All source changes were committed before their tests. The owner's original photographs, chosen product identity, dimensions and existing password/session secret remain unchanged.
