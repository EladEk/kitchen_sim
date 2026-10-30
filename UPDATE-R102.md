# Home Studio R102

Living areas in the north apartments on floors 1–8 were reviewed against the
living/dining/kitchen labels and openings on the original building-plan PDF.
Their sofa, coffee table and media cabinet now occupy the living area by the
balcony. The three standard ground apartments use the corrected seating zone;
the public standard apartment 4 derives from the same corrected template.
Saved personal apartment furniture remains the source for the personal scene.

During a walking tour, entering an apartment automatically opens its floor plan
with internal walls, openings, furniture, moving doors, a live blue position
marker and a look-direction arrow. The map follows the actual building,
apartment and floor, including rotated and mirrored buildings. The map button
can close it or show a floor overview from the common corridor. A new apartment
opens its plan again. The personal apartment map uses its supplied layout.

Map geometry is projected once during export or personal-scene creation. The
static SVG structure is reused while only the position/heading changes at 5 Hz;
it creates no second WebGL scene, renderer or collision index.

Validation covers source-zone clearance and routes, 153 existing bed approaches,
344 building/apartment destination combinations, all 400 standard door map
poses, personal door state, public/private separation, construction/disposal,
selection, movement and the production build. Plan SVGs were rendered and
inspected locally. Phone and headset display and GPU frame rate remain untested.

## Install

The full source ZIP includes the complete project. The smaller update ZIP is
for an existing R101 checkout: extract its contents beside package.json and
replace matching files. No dependency changes. Preserve your environment
variables and document password, then commit and push your own GitHub repository
to update your Vercel site. The ChatGPT-hosted Site is updated separately.

If the full ZIP is difficult to download, download all four numbered parts,
concatenate them in numeric order as a single ZIP, then extract the joined ZIP.
The part files are not separate archives.
