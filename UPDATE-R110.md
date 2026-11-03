# HomeStudio R110

## Shared main-water-meter placement

The page2 cyan main-meter symbol is shared plot1410 infrastructure above the
neighbouring4101 block in that drawing. Its cabinet was retained inside the
residential baseline, so district instancing incorrectly repeated it eight times.
The baseline now excludes it. A single fixture is rendered in the shared site,
with the same location in the public and personal district.

The source trace remains unchanged in building-site-trace.mjs and the audit.
site-utility-layout.mjs retains its source position separately and reconciles
the displayed location to the outside edge of the reconstructed neighbour
garden fence. That adjustment is an estimate, not a site survey. It keeps the
perimeter footway centre, every numbered parking bay and private plot clear.
The legacy building view, inspection feature and collision bounds use the same
reconciled position. The reservoir beside the pump room is a separate facility.

## Education area behind4092/4091

The official opposite aerial shows an L-shaped building, a separate long
rectangular annex and three smaller low-rise blocks across the south street.
These external forms, clerestories, window bands, forecourt parking, footpaths,
trees and the connecting crossing are now present in the shared district.
There are no new apartment interiors or invented official institution names.
Parking inside this illustrative campus is unnumbered and carries no allocation.

Primary visual source:
https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/08/104187-5_effi_hadmaya_c_press_-1.pdf

Source pixels and placement limits are recorded in
public-view/district-context-r110.json. Relative forms and street adjacency
follow the aerial and the user's identification of the education area.
Dimensions, facade details and landscape are estimates; no as-built survey is
available. Estimated placement uncertainty is15–30m. The supplied oblique view
does not establish ground footprints with survey accuracy.

Municipal sources checked on3November2026 establish education projects on
plots1717 (18-class elementary, tender34/2024),1709 (18-class elementary,
tender28/2026) and1704 (Agro-Tech secondary, tender80/2025). A reliable spatial
match to this particular campus was not found, so none of those parcel IDs or
school names is assigned in the simulator.

## Install and checks

The full-source ZIP is complete. The update ZIP replaces full changed files in
R109 beside package.json; dependencies are unchanged. Preserve the existing
document password and session signing secret. Build and runtime must share
DOCUMENTS_ASSET_SECRET, or DOCUMENTS_SECRET if no separate asset key is set.

Checks cover the single shared fixture, source/inspection/collision consistency,
private plots and measured parking, education-ground holes, finite batched
geometry and resource disposal, plus actual walks from the residential promenade
across the street around the campus. Existing apartment, parks, common/service
stairs and document authorization checks are retained. Browser WebGL is
unavailable in this environment; phone/VR appearance and frame rate are unverified.
