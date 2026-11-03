# HomeStudio R107

The supplied master-room photograph and kitchen/hall photograph show white
painted ceilings and gypsum drops. R107 uses a shared subtle matte white
(`#f4f4f2`, high roughness, no metal) for the home ceiling, standard ground
apartments, upper-floor ceilings/soffits, entrance ceiling, residents-club
ceiling and photographed hall/master/kitchen drops. The standard apartment's
ceiling is now a separate material from its warmer wall plaster.

The brown cast was also reinforced by ochre/brown ground-hemisphere lighting,
which directly illuminates downward-facing surfaces. The public tour's local
bounce, shared astronomical fill and personal daylight rig now use neutral
ground-bounce colours. The sky's outdoor colour, sun's time-dependent colour,
lighting intensities, shadows, night gating and gentle exposure transitions
retain their behaviour. Ceilings are still lit materials rather than glowing
or unlit white panels. Geometry, the R106 bed orientation and stairs stay intact.

This is an appearance match to photographs under available light; no exact
manufacturer paint code or calibrated colour measurement was supplied.

The full-source ZIP contains the complete project. The update ZIP targets
R106: extract beside package.json and replace matching files. No dependency
changes are required. Keep existing environment variables and document password.
Build and runtime must use the same DOCUMENTS_ASSET_SECRET (or DOCUMENTS_SECRET
when a separate asset key is not configured).

Checks cover existing ceiling/drop geometry and clearance, surface/resource
ownership, solar/night transitions, stable interior colour, compiled material
colours, public/personal district navigation and the document authorization and
encryption boundary. Final phone appearance is not visually verified here:
the available browser cannot run WebGL.
