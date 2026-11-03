# HomeStudio R108

## Public landscape

The official labelled aerial places a large park across the road beyond the
4102–4103–3461 row. A smaller landscaped recess is visible beside 3461/3471.
The shared landscape now includes those two green spaces, curving footpaths,
three polygonal shade pavilions, the amphitheatre, trees and illustrative seating.
The ground extends north to include the park. No playground equipment is assigned
without a verified match to a specific plan.

The previous generic eastern street crossed the small garden. Its reconstructed
alignment moves outward, and the adjacent court exit turns around the garden.
The accepted building centres, all private garden plots, the 209 documented
plot1410 parking bays/labels and tandem arrangements are preserved. Park paths
are clipped at streets, bays and private plots; grass has matching real holes.
The landscape is shared once by public and personal tours, including VR.

Sources checked on 3 November 2026:

- [Developer's labelled aerial, June 2024](https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/06/104187-5_effi_hadmaya_c-1-1.pdf).
- [Opposite aerial, August 2024](https://efficapital.co.il/Effi-Afikim/wp-content/uploads/2024/08/104187-5_effi_hadmaya_c_press_-1.pdf).
- [Municipal landscape presentation, 21 October 2026](https://hcl-ofaqim.co.il/wp-content/uploads/2026/10/%D7%9E%D7%A6%D7%92%D7%AA-%D7%A9%D7%A6%D7%A4%D7%99%D7%9D-%D7%9C%D7%9E%D7%AA%D7%A7%D7%A0%D7%99%D7%9D-211026.pdf).

The municipal parks could not be matched reliably to this block, so no statutory
park number is asserted. The aerials describe intended appearance, not verified
completed construction. The new ground registration uses parking/drive controls,
not roof centres; estimated uncertainty is 12–25 m for the large park and 8–18 m
for the small recess. Heights, furniture construction and reconciled road edges
remain estimates. Trace points, controls and the rejected unstable projective
fit are explained in scripts/landscape-source-r108.json. The interface links the
developer's source and describes these limits.

## Vehicles

Original generic sedan, hatchback and SUV meshes replace the repeated body.
They have separate windscreens/side glazing, visible pillars, curved wheel arches,
shaped tyres, alloy rims/spokes, mirrors, door seams/handles, bumper grilles,
daylight lenses and blank yellow plates. Paint uses a restrained physical clear
coat; tyres are matte and glazing retains subtle environmental reflection.
These are generic body styles, not licensed reproductions or exact owner models.

The three distance tiers keep placement, colour and envelope stable. All vehicle
styles plus the tree templates remain below 20,000 template triangles and 70
draw batches. Cars and contact shadows stay within their bays. Daytime lenses
are not emissive. The personal cars retain their two private assignments and
dimensions; those assignments do not enter the public app.

## Install and verification

The full-source ZIP contains the complete project. The smaller update targets
R107: extract beside package.json and replace matching files. No dependency
changes are needed. Keep existing environment variables and document password.
Build and runtime must share DOCUMENTS_ASSET_SECRET, or DOCUMENTS_SECRET when
no separate asset key is configured.

The private app is staged outside the deployment tree before encryption. This
prevents delayed build writes from recreating plaintext public asset paths;
the protected URLs and existing password/session behavior stay the same.

Checks cover actual park/pocket walking routes and canopy clearance, road/garden
separation, parking access, vehicle envelopes and tier transitions, visible glass,
resource disposal, public/personal isolation, the existing home/building suite,
service/common stairs, and the compiled document authorization/encryption gate.
Native GLES depth-buffer reviews inspect the actual vehicle geometry with simple
lighting. They do not reproduce the browser's reflections or establish phone/VR
appearance or frame rate. Live browser WebGL is unavailable in this environment.
