# R101 — entrances, shared corridors and doors in every apartment

Apartment entrance doors use dark green-grey #536c66; interior doors keep the
light satin finish. Shared corridor faces use sage plaster #cddbd2. The finish
is placed only on the common side of existing walls, with doorway gaps kept open.
The same entrance colour is applied to the saved personal apartment.

All 400 standard door motions are available throughout the eight-building
public/personal district: 43 apartment entrances, interior leaves and glazed
terrace doors. Tap a visible door in an apartment cutaway or walking tour, or
select it with a WebXR controller. Door state is independent per building and
saved locally; personal apartment changes keep their existing saved settings.

Static building geometry and BVHs remain shared. One live hinge set serves the
selected building. Whole-building doors use 16 instanced batches and compacted visible poses,
including corrected winding for reflected garden/building copies. Apartment
cutaways keep directly clickable hinges and shared geometry.
Opening a door updates its context matrices and a small per-building collision
partition. Upper floors remain indexed while visually culled. Render geometry
is not recreated per click, and collision/context resources are disposed.

Build verification checks all 43 entry doors, individual door poses, independent
building state, mirrored copies, selection, movement, storage, memory and the
public/private asset boundary. Device appearance/frame rate still needs a
compatible phone or VR headset; CPU checks do not establish GPU performance.

## R100 — usable doors and restrained interior finishes

Personal doors respond to a tap in both the apartment cutaway and the complete
building tour. Moving branches retain their actions, hinges and shared buffers
instead of being baked into selection/context geometry. Opening a door updates
the small personal collision partition and the existing display copies; it does
not rebuild the apartment. Drags, multiple pointers and canceled gestures do not
trigger doors, and nearer physical surfaces still block selection.

Interior walls use subtle matte plaster. Solid door leaves have a slightly warmer
satin finish and distinct frames, with visible hardware on both sides. Public
building replicas and the personal apartment use bounded, shared texture maps.
The personal ceiling has its own white plaster material and downward-facing
surface. The existing solar hemisphere receives a lighter ground-bounce colour
for district views, illuminating ceilings without adding lights or changing the
Sun/Moon directions; lamp-only/night behavior remains controlled by solar state.

The R99 saved design keys, authenticated personal entry, full district layout,
parking, native WebXR support and resource lifecycle safeguards are preserved.

## R99 — one district for public and personal tours

The protected personal entry now opens the same complete district viewer as the
public entry: all eight buildings, public layout, parking, roads, floor/apartment
selection, walking and WebXR. Only building 4102 receives the saved changes to
apartment 4, its garden, cameras and cars. The public entry never imports the
personal builder, plan data or editor; all personal entry pages and chunks remain
password protected and sealed in the deployment vault.

The saved HOME_STORAGE/KITCHEN_STORAGE keys and normalization are preserved.
The editor remains available through “עריכת הבית שלי”; entering a tour or choosing
a building/floor from the editor saves pending settings immediately and opens the
shared district view. Personal and public pages use separate HTML entries so the
editor CSS and heavy editing components do not load into the walking viewer.

Common building surfaces and collision data are shared. The standard apartment
slot is replaced only at 4102; other buildings retain the standard plan. A nearby
building handoff changes the detailed source without rebuilding the scene or
teleporting the walker. The personal builder omits the old full-building context
and duplicate daylight rig. Static personal surfaces are batched, while doors and
shutters retain interactive handles. Door changes refresh only the small personal
collision partition, including when distant storeys are visually culled.

On the actual scene in the CPU test environment, 1,832 static personal meshes
become 254 material batches. The complete personal district collision index is
about 4.53 MB, and the median short lobby movement query is about 0.2–0.3 ms. These
measurements do not establish frame rate or total browser/GPU memory on a phone.
The personal surface cache is bounded; optional render targets and context
recovery keep the R98 lifecycle safeguards. XR pointer queries also use the same
spatial index instead of recursively raycasting the full district.

## R98 — memory safeguards and stable tour menus

Opening Options during a walking tour now pauses navigation without running
OrbitControls against the old building-view target. Position and gaze remain
unchanged, held input is cleared, and closing the dialog resumes the same tour.

Render normals use normalized Int16 and bounded UVs use normalized Uint16;
positions and indices remain exact and tiled/world UVs retain Float32 range.
Collision instance transforms now use Float32. The procedural surface cache has
an 8 MiB LRU limit; bump and roughness share an RG8 texture with separate channels.
HDR skies use half-float storage and smaller mobile/desktop maps; astronomical
positions and the separate screen-resolution Sun and Moon meshes are preserved.

Postprocessing is allocated lazily, bounded by output pixel count, and released
for XR, backgrounding and sustained slow frames. Photo mode preflights a working
memory estimate before cloning, avoids overlapping old/new tracers, cancels BVH
waiters, and releases its renderer context during sustained movement or suspend.
Model disposal clears resource containers and CPU image references. Baseline and
surface loads can be canceled; image loading has a deadline and late-result cleanup.

Visibility/BFCache events pause and resume one render loop without changing the
camera. Graphics-context restoration reuses the loaded scene with a smaller GPU
budget, caps automatic recovery attempts, and offers reload on persistent failure.
Automated tests exercise repeated resource cycles, navigation pause, cancellation,
real district walking and apartment photo BVH generation. Device GPU/VR testing
still requires compatible hardware; CPU buffer measurements are not total browser
memory or frame-rate guarantees.

Measured on the same public-scene CPU benchmark, render attribute/index buffers
are 57,845,552 bytes (R97: 77,210,746; about 25% less), and the collision index is
4,500,104 bytes (R97: 7,306,824; about 38% less).

## R97 — walking and memory

Walking uses a spatial collision index and shared BVHs of one canonical public
building. Queries are transformed to the nearby building; district render meshes,
all distant apartments and foliage are no longer raycast for every movement step.
Instance bounds and transforms use fixed typed buffers. No collision geometry is
copied per building. Both joystick/keyboard movement and WebXR use this path.

Public geometry is compacted at build time with UV/normal seams retained. Equal
public materials share batches; reflected geometry preserves its index. Temporary
merge records are released after construction. Apartment crops are reused when
switching buildings and disposed when returning to the full view or walking.
The detailed building follows the walker without teleporting the camera; remote
interiors and interior floors outside the current floor's neighbourhood are hidden
while exterior facades and balconies remain present.

A CPU benchmark of the actual public scene reduced geometry attribute/index
buffers from 146,995,290 to 77,210,746 bytes (about 47%). The new fixed collision
index adds 7,306,824 bytes. The median pair of small entrance movement checks at
4103 dropped from about 374 ms to 0.24 ms in this environment. These are CPU
measurements, not phone/VR frame-rate or whole-browser memory guarantees.

## REV 96 — חומרים, צמחייה, רכבים וגימורי חזית

הגרסה הציבורית מקבלת חומרים מפורטים יותר בקנה מידה של מטרים, עם מפות צבע, חספוס ותבליט נפרדות. חיפוי האבן משתמש בטקסטורה חדשה שנוצרה בכלי התמונות המובנה; הקובץ והפרומפט מתועדים ב־`public-view/assets/README.md`. זהו חומר המחשה, לא סריקת יצרן. טעינת החומר נשארת בתוך שלב הטעינה הראשוני, עם חומר פרוצדורלי כגיבוי.

העצים כוללים ענפים, עלים בעלי שקיפות חתוכה ושיחים; הרכבים כוללים גוף מעוצב, חלונות, קשתות גלגלים, חישוקים, פנסים, מראות וגימורים. הגאומטריה והצללות המגע משותפות ומאוחדות למופעים, עם שלוש רמות פירוט, ספי מעבר עם היסטרזיס ועדכון קצוב. גוונים, מיקום ומידות נשמרים בכל רמת פירוט. מרחוק מוסתרים פרטי פנים בבנייני ההקשר בלבד; מעטפת, פתחים, מרפסות, גוונים ווילונות נשארים. בחירת דירה/קומה והבניין המפורט נשארים מלאים.

נוספו וילונות כלליים בחלק מהחלונות הרגילים, ספי אבן מעוגלים בתוך המידות המקוריות, חיבורי אבני שפה ורשתות ניקוז להמחשה בתוך הדרכים הקיימות. אלה אינם נתוני דיירים או מדידת תשתית. גבולות החניות, הגינות, הקומות והדירות נשמרים. סימוני הפוגות מסוננים לפי כיסוי פיקסל כדי לשמור על גוון יציב בזום רחוק.

מפת הצללים מתרחבת עם המבט על המתחם ומתייצבת על רשת הטקסלים; כיוון השמש והירח ממשיך להגיע מהחישוב האסטרונומי. הצללת המגע שופרה, ועלים שקופים מוחרגים ממעבר הנורמלים של GTAO. מצב VR ממשיך להשתמש ברינדור המקורי, עם צללי מגע גאומטריים. ביצועי המכשיר והתוצאה החזותית בדפדפן דורשים בדיקה במכשיר עם WebGL.

## REV 95 — יציבות צבעי הבניינים ומשטחי החניה בזום

בוטל ערפל המרחק בתצוגה הציבורית, שגרם לבניינים ולפיתוח להלבין כאשר מתרחקים. מישור החיתוך הקרוב של המצלמה מותאם למרחק במבט חיצוני כדי לשפר את דיוק העומק; הליכה שומרת על המישור הקרוב המקורי ו־WebXR ממשיך לשלוט במטריצות שלו.

משטחי הדשא נחתכים בזמן הבנייה לפי החניות, הכבישים והשבילים. הדשא אינו נמשך עוד מתחת לריצוף, כך שאובדן דיוק במבט רחוק אינו יכול להחליף חניה בדשא. הגינות ושטחי הגינון נשארים, וסימון הצבע מקבל הטיית עומק קטנה. המצולעים עם החורים נשלחים מוכנים בנתונים הציבוריים, ללא חישוב חיתוך נוסף בטלפון.

בדיקות משתמשות במשולשים המצוירים בפועל: תשע נקודות בכל חניה, שימור דשא בגינות, אי־חפיפה לשטחים המרוצפים ודיוק עומק בזום עד 600 מ׳. בדיקה חזותית במכשיר עם WebGL עדיין נדרשת; הסרטון המצורף משמש לתיאור התקלה ואינו מצורף לחבילת האתר.

## REV 94 — בחירת קומה/דירה ומרפסות שלמות

לאחר פריסה יש לוודא שבחלון האפשרויות מופיעה R94. לבדיקת הבחירה: בחר קומה או דירה, החלף בניין וודא שהבחירה נשמרת ושגם המרפסת והמעקה נמצאים במסגרת התמונה. יש לבדוק גם את הבניינים המסובבים והבניינים שבמראה.

בחירת בניין אחר שומרת את הקומה והדירה שנבחרו, במקום לאפס אותן לכל הבניין. בחירת כל המתחם מאפסת את החתך במפורש.

מנגנון התצוגה משתמש כעת בבקר משותף שנבדק ברצף אמיתי על המודל הציבורי בכל שמונת הבניינים. המודל המפורט, הבניין הפעיל, חתך הקומה/הדירה ומיקוד המצלמה מתעדכנים יחד. המצלמה מחושבת מהגאומטריה המוצגת בפועל, כולל המרפסות והמעקות.

לתחומי תצוגת הדירות נוספו המרפסות מתוכניות הקומות, עם שוליים של16ס״מ למעטפת ולמעקות. חלקי טרסה החוצים סוף קיר משותף נפרדים לפי קו הגבול המקורי. גבולות הסיווג להליכה נשארים עקבת הפנים המקורית. איחוד מצולעי התצוגה מחושב בזמן הבנייה באמצעותpolygon-clipping0.15.7, ונשלח כמסכות משולשות כדי להימנע מחפיפות ומחישוב איחוד כבד בטלפון. עותקי הבניין אינם נחתכים עוד לפי גבולות מרכזים קשיחים, כך שגם חלקי המרפסות החורגים מקווי הבניין נשמרים.

קריאות לנתוני המודל כוללות מזהה גרסה ובדיקת תאימות. באפשרויות מוצגתR94 כדי לזהות את הגרסה שנפרסה. בדיקות הגאומטריה והמצלמה אינן תחליף לבדיקה חזותית במכשיר עםWebGL. בדיקת הגרסה באתרVercel של המשתמש דורשת הרשאת הפרויקט הנכונה.

## REV 93 — בחירת בניין, קומה ודירה

המודל המפורט עובר לבניין הנבחר, לרבות הסיבוב והמראה שלו, והעותק המאוחד של אותו בניין מוסר מהסביבה.4102 נשאר עותק סביבתי כשבוחרים בניין אחר. בחירת קומה מציגה רק אותה קומה עם תקרה פתוחה. בחירת דירה מציגה גאומטריה חתוכה לפי תחום הדירה הציבורי, והסביבה מוסתרת כדי שלא תכסה את החתך. דירה32 כוללת את שתי קומות הדופלקס. בחזרה לסיור/לבניין מוצג המודל המלא.

המצלמה מתמקדת בגובה ובכיוון של הבחירה, ורשימת הדירות מסוננת לפי הקומה. כניסה לסיור מקומה נבחרת מתחילה באותה קומה. מקור הבדיקה הוא המודל הציבורי המיוצא עצמו; לא נוספו פרטי תכנון אישיים. בדיקות מוודאות חתך של מצולע קעור, מופעי גאומטריה, קומות, דופלקס וכל שמונת כיווני הבניינים.

## REV 92 — חניות ופיתוח המתחם

נבדקה תוכנית הפיתוח בעמוד 2 של תוכנית הבניין, מגרש1410, מול שתי הדמיות ההעמדה הרשמיות של אפי קפיטל. במודל המתחם כלולים כעת204 תאים ממוספרים ו־N1–N5 מאותו מגרש.46 התאים שברישום4102 נשמרו ללא שינוי; יתר התאים שוחזרו לפי קווי השרטוט והתוויות, בדיוק קצה משוער של כ־7 ס״מ. המספרים הם המספרים בשרטוט, ואינם קובעים הצמדה לדירה.

נתיבי החניה, רחבות התמרון, איי הגינון והמשטחים המשותפים הושלמו. תאי החניה מרוצפים באבנים משתלבות, בנפרד מאספלט הרחוב. רצועות מדרכה אינן מכסות חניות או כניסות לחניון. גישה לכל תא נבדקת, לרבות החניות הטוריות. תאי הדמיה ללא גישה הוסרו.

למגרשים1409/1346/1347 לא נמצאה תוכנית פיתוח מדודה נגישה בבדיקה זו. פריסתם היא שחזור לפי מודול1410 ושתי ההדמיות, ללא מספרי חניה או שיוך לדיירים. גם גובה המדרכות, הגינון ורוחב הכבישים החיצוניים הם המחשה. ההדמיה השנייה מכילה שגיאת כותרת4102 במקום4103; הזיהוי נשמר לפי ההדמיה הראשונה.

תיקוןR91 לממשק מובייל כלול. חבילת המקור מלאה, והתוכניות וההדמיות המקוריות נותרות מוגנות באתר. `qa/development-review-r92.json` מתעד מקורות ומגבלות.

## REV 82 — Date/location based Sun and Moon sky

Infinite equirectangular HDR sky shared by real-time, immersive WebXR and progressive photo rendering. Sun direction uses the existing NOAA calculation; Moon altitude, azimuth, illuminated fraction and bright-limb angle use SunCalc 2.1.1. Ofakim area coordinates 31.31 N / 34.62 E and the plan's 135° north bearing are approximate existing references, not surveyed GPS. Live mode follows Asia/Jerusalem with daylight saving time, updating each minute. Date/time inputs freeze the simulation to a chosen instant. Private lamp-only mode is preserved. Night skies, above-horizon Moon including in daylight, and its changing phase are supported. Atmospheric colours and stars are illustrative clear-sky artwork, not weather measurements or a star catalogue.

## REV 81 — Progressive photo renderer + immersive VR

Three.js r185 with three-gpu-pathtracer 0.0.27. Photo quality selects native WebGPU path tracing where available, or WebGL2 path tracing on float-target capable devices. 10/8 light bounces, physically transmissive glass, baked stone joints and an unfiltered HDR sky feed a progressive image while the camera and model are stationary. Press **איכות צילום** inside any 3D view. Movement immediately reveals the real-time renderer; wait briefly to refine again. Native immersive WebXR always uses the existing real-time stereo renderer with head tracking, controllers and navigation. Path tracing is not performed in the headset. Large scenes are capped with a clear fallback; select an apartment or floor if necessary. UI React remains independent from both render paths.

Photo snapshots own geometry and materials, and filter hidden scene branches. Source scene, privacy model and apartment constraints remain unchanged. 3×2 m shed is retained. No production secrets are included in this repository.

## REV 80 — תאורה וחומרים

Public viewer: HDR sky probe, GTAO contact shading with denoising and adaptive fallback, FXAA, closer walking shadows, dielectric glass, subtle distance haze. Private views use the shared sky probe and retain calibrated neutral tone mapping. Includes the REV79 2×3 shed.

## REV 79 — מחסן 3×2 מ׳

המחסן מוצב עם 3 מ׳ לאורך קיר השכן ו־2 מ׳ לרוחב החצר (מידות חוץ, שטח 6 מ״ר). המעבר המתוכנן לצד הבית גדל לכ־2.75 מ׳. הדלת לכיוון יציאת השירות; מיקום השוחה, רצועת החלון והמזגנים נשמרו. שמירות התואמות בדיוק למחסן ברירת המחדל הישן 3.5×3 מתעדכנות; בחירות מיקום/מידות אחרות נשמרות. הגבהים והמרווחים הם נתוני מודל ולא מדידת שטח. מיקומי המצלמות לא שונו בעדכון זה.

## R73 — relocate C2 to the marked service-porch return
C2 now mounts near the courtyard end of the return wall beside the service exit, facing the shed. Older C2 placements migrate once; C1/C3 and later C2 adjustments are preserved.

## R72 — fixed optical camera preview and owner parking cars
Clickable camera bodies/markers open a letterboxed 87×44 degree model view with a close control; orbit and walking do not change its optics. Two private illustrative cars occupy bays 24/25 and participate in target occlusion. Includes R71 viewport fix.

## R71 — mobile controls stay inside the viewport
The protected access banner and active simulator now share a single dynamic-viewport grid. Home and kitchen use the remaining height; short landscape screens can scroll instead of clipping controls.

## R70 — private camera planning and residents club section
Three adjustable mounts restricted to apartment 4 external walls; parking 24/25 per owner. Private Options includes plan, approximate target visibility, fixed-lens specs, 3D bodies/frusta and preview. Occlusion checks cover apartment walls, shed and pergola posts; no full-coverage claim. Original R69 club ceiling metadata fix included.

# R69 — Residents’ club visible in ground-floor section

The club's 2.85 m ceiling lacked the semantic metadata used by the public section filter. It is now explicitly tagged as a ground-floor ceiling; export also recognises existing named ceiling meshes before stripping names. The club ceiling hides in floor sections and remains present during walking. The complete model round-trip test checks this behavior after serialisation. Browser visual QA remains waived.

# R68 — Visible mobile Options dialog

The public Options button now opens a native modal dialog in the top layer instead of appending content below the viewport. The password form is immediately visible. The panel has a sticky close button, Escape/backdrop closing, viewport-limited internal scrolling and focus handling. Background scrolling and walking input pause while it is open; existing password protection is unchanged. Browser visual QA remains waived.

# R67 — Horizontal terrain and floor export

Public export now saves final BufferGeometry vertices, normals, UVs and indices rather than parametric constructor settings. This preserves baked rotations on terrain, slabs and floor surfaces after ObjectLoader reload. Equal geometry buffers are deduplicated to keep the download small. A full-model round-trip regression checks all geometry and world/instance transforms and large horizontal site surfaces. Privacy separation is unchanged. Browser visual QA remains waived.

# R66 — Public baseline and password-protected personal simulator

The root URL is a read-only public building viewer. Apartment 4 uses the audited original ground-apartment template, original L-shaped kitchen, generic neighbour furnishing, and the standard garden boundary. The owner's cabinet/island layout, office conversion, product orders, custom fence, shed, paving and outdoor kitchen are not included. Public viewing supports apartment/floor selection, walking with physical collision, speed choices and a floor map.

Options → Protected access uses the existing document password. After unlocking, open the personal simulator at `/_personal/index.html`. The complete original application and detailed kitchen remain there; existing localStorage keys, saved drafts, layouts, export/import and personal editing tools are unchanged. The public viewer never reads those keys. Locking or session expiry hides/unmounts the personal app and returns to the public root.

Security boundary: two separate Vite entrypoints. All personal HTML, JS, lazy chunks, CSS and original assets are AES-GCM encrypted during the build and served only after Worker session authorization, with `private, no-store`. The public app imports only generic viewer code and the authentication form. Its geometry is generated at build time from approved base-model builders, with a strict metadata allowlist and procedural textures. It never imports owner model modules in the browser. All material assets are protected too; no owner product samples remain public. Secrets are supplied only through server/build environment variables, never committed. `DOCUMENTS_PASSWORD` is unchanged; `DOCUMENTS_SECRET` must match the build and deployment.

Validation: `node --test public-view/privacy.test.mjs src/document-access.test.mjs`; after building, run `node --test scripts/public-build.test.mjs` with the same build key in the environment. The latter checks every protected asset anonymously, correct/incorrect passwords, direct/encoded/HEAD/range requests, preserved private JS, no public owner imports, 43 apartment destinations, and parsing of the complete exported 3D scene. Browser/mobile visual QA was not repeated, as requested. Older revision notes below describe the retained personal editor; their public-asset statements are superseded by this section.

# R57 — Mirror wall, walking speed and service access

Moved the lobby mirror to the perpendicular west lobby wall, facing the entrance. Walking speed now has Normal, ×2 and ×3 choices in the building/3D toolbar; joystick, keyboard and guided walking share the selected multiplier and existing movement collision substeps. Removed the two ground-plane service door leaves/lintels at the pump/meter stair access and their closed-door collision; these access passages remain open. Added plan-inferred northern service screen mouths to the existing south/east/west screens. Unphotographed screen registration and mirror placement remain estimates requiring visual review. This revision does not reconstruct unmeasured service-stair elevations.

# R56 — Lobby, entrance lights and service screens

Rechecked both Oct 24 lobby videos and new photographs. Added a low-resolution real reflecting lobby mirror with thin warm frame, changed the bench to cantilevered supports, and replaced remaining lobby square fixture bodies with recessed round downlights. Entry details now include two round porch lights, wall sconces, intercom and mail bank. 4000 K remains the lighting target, not a measured colour-temperature claim.

Four service-screen mouths now cover the repeated south, west and east recesses, with open horizontal slats and bottom caps instead of opaque backing sheets. Screen coordinates on unphotographed elevations remain plan-based estimates. Upper stepped floors outside the repeated recesses are retained; no claim is made that unseen sides are photographically verified. Mirror size, finish registration, lighting power and fixture heights remain estimates. Browser/mobile visual QA remains unavailable.

# R55 — Shed 3.5 m wide × 3 m deep

The default shed is enlarged to 350 cm across the yard and 300 cm along the neighbour wall, and moved rearward to end 10 cm before the chamber access reserve. Approximate clear passage beside the house is 125 cm; the neighbour-wall gap stays 10 cm, and the estimated lid-rim gap is 40 cm. The door faces the service exit and opens inward. Dimensions, roof, appliance placeholders, shelving, collision and inspector metrics share the updated footprint. Clearances depend on the photo-estimated chamber position and need field measurement. Existing individually saved yard designs remain editable.

# R54 — Waste bins, outer laundry screens and entrance courtyard

Two photographed underground-bin intake towers and flush plates are placed on the development-plan waste island. Their steel bodies, sloped tops and intake flaps are illustrative; below-ground mechanisms are not invented. Walking collision matches the towers.

Laundry/service screens move from the back of the recess (z≈7.15 m) to its exterior return (z≈11.64 m). The owner’s chamber is repositioned to [11.05,16.76] from the visible lid in 307548/307549, close to the front railing and neighbour wall. Photo registration and lid diameter remain estimates. Original plan coordinates are retained as provenance; the shed stays in its previous position and the access reserve is clipped at the property boundary. Apartment and site views share the corrected centre.

Main and secondary entrance courtyards gain planted borders and stone curbs while preserving both approach routes. The water reservoir now has a solid enclosing shell, base and pump-facing service hatch; cutaway opens its cap, and walking cannot enter the tank. Heights and hatch profile remain estimates. The plan label beside it is corrected to “Meter room · raised floor”, retaining the existing footprint. Unmeasured internal meter equipment and floor levels are not invented.

Reference photographs are included in the protected viewer. Validation covers source/scene consistency, both entrance approaches, reservoir/bin collision, chamber access and preserved shed position. Browser/mobile visual verification remains unavailable in this environment.

# R53 — Lobby video and actual facade corrections

The new lobby video and five facade photographs are available in the protected source viewer. The entrance glazing now has a complete head/lintel up to the storey above, rather than an open gap. The lobby has video-based wood-effect panels, flush service cabinet fronts, a stone bench at the window return, and ceiling details. Finish sizes and their registration remain estimates, not survey measurements. Bench geometry is shared with walking collision.

The south service recess has continuous, full-storey dark horizontal louver screens at its plan-defined returns. Artificial continuous dark balcony-frame columns inferred from marketing imagery are removed; real PDF wall piers remain. Floor 7 terrace tessellation seams no longer generate internal glass railings or collision barriers; exterior guards and separate lower-floor balcony boundaries remain.

Unresolved: the earlier screenshots identifying specific interior columns and the circled lobby hole are not attached to this session. Small isolated wall pieces sampled against the PDF proved to be real jambs/piers and were retained. The entrance-head correction addresses a confirmed gap, but cannot certify that it is the exact circled defect. Upper-apartment furnishing is not part of this revision.

Validation: scene geometry, navigation and existing automated tests. Browser/mobile visual verification unavailable because the managed preview daemon mailbox is missing.

# R51 — Residents’ club

Select **מועדון דיירים · קומת קרקע / Residents’ club · ground floor** in the destination list, then start walking. The room is reachable through its actual lobby door (`bd-0-9`). Its wide opening is now a window with a sill, not a floor-height slider, both in rendering and walking collision. Both existing window widths and structural returns remain traced from page 3. Interior plaster, neutral matte flooring, dark frames, the partly raised wide-window shutter, a split AC, a service recess with riser and four round ceiling fixtures follow the owner’s 4.24-second video. The video and three frames are accessible through the protected source viewer. Round-light layout, fixture sizes, mounting heights, AC placement and the flooring product are estimates; the video is not a measured survey. 4000 K lights follow the global lamp switch. No furniture or construction debris is added. The separate pump room is outside this club-only revision.

The selected club overview opens its ceiling; walking and full-building views retain it. The managed browser preview supervisor is unavailable; geometry, navigation, source protection and build checks substitute for browser QA, without claiming phone visual verification.

# Home Studio + Kitchen Studio

React + Vite + Three.js whole-house and detailed kitchen simulator. The house follows the attached RG1 floor plan. Kitchen geometry retains the Anise order 167968 drawings and subsequent technical/appliance sheets.

Previous revision **50**: every wall on floors 0–8 is audited against the source PDF and actual rendered volumes, alongside all four detailed ground profiles and roof/head corners. Sixty-eight wall fragments mistakenly extracted from framed annotation digits are removed. Solid corners continue through the adjoining wall thickness, including the outside quarter omitted by centre-line-only joins. Inline seams close only with continuous source wall-face evidence and never across protected openings. Door lintels use adjacent full wall faces or the PDF jamb caps rather than a fixed 13cm beam on the leaf plane. Ground-wall renderer ownership uses the original trace midpoint so completing a corner cannot hide an entire adjoining wall. The same solid corner construction is applied to the four garden apartments and roof parapets. Original source axes, opening positions, furniture and owner finishes remain independent.

The reproducible exhaustive audit is `node qa/audit-building-walls.mjs`; the full per-wall result is `qa/building-wall-audit-r50.json`. It covers 3,303 architectural source runs, 128 detailed ground-profile wall instances, 83,778 wall-volume probes, 2,920 source-supported outer-corner probes, 1,834 doorway-clearance probes, 3,042 lintel probes and 96 roof-corner probes. Browser/mobile visual QA is unverified because the managed preview supervisor is unavailable; no phone-rendering claim is made.

Previous revision **49**: selected-floor/apartment overviews now open the selected ceiling without shortening full walls. Whole-building roofs and walking ceilings remain solid. Temporary mobile WebGL loss no longer substitutes apartment4's plan; context restoration, foreground/BFCache recovery, bounded automatic retries and manual retry/dismiss controls rebuild the renderer and scene while retaining camera, floor/lift state and design. Replaced canvases explicitly release their GPU contexts. Bounded wall-face junction reconstruction fixes verified corner gaps while protecting doors, windows and lift portals. Partly exposed balcony returns, stair flights and duplex openings now have visible guards shared with walking collision. Parking paving is visible from above, uses neutral darker blocks than sidewalks, raised source-traced curbs and six instanced illustrative parked cars.

Previous revision **48**: unchecked wall-cut views close at full storey height on every floor, including ground floor. The balcony surrounds, pale stone courses, glazing, soffits and interior door hardware/trim are refined against official Efi Capital Stage-A / complex-5 imagery and the owner's actual photos. Marketing interiors do not override the owner's order or traced layout. Original source documents, photos and videos require a server session; the password and independent encryption/signing key are server environment variables. Public deployment contains encrypted source assets, while faithful floor-material samples remain available to the renderer.

Previous revision **47**: garden units 1–3 now share the original built RG1 interior with audited rotations/reflections, source L-kitchen and eight sanitary footprints. The owner's island, office conversion, ordered products, moved furniture and custom garden are excluded. Copied photo-based services remain explicitly derived. Gardens retain their separate traces, with six independent private chamber centres and five common chambers. Page-2 development geometry adds 45 numbered parking bays plus N1, tandem topology, drive aisles, surrounding sidewalks/curbs and both building entrances. The previously misclassified main entrance now opens for walking. The documented site main-meter cabinet is separate from the photographed apartment4/3 meter cabinet and from reservoir/pump rooms. No undocumented meter room or pipe network is invented. Existing wall-cut preferences, apartment4 edits, private access, lifts, joystick and source material evidence are retained.

## Run

```bash
npm ci
npm run dev
```

```bash
npm test
npm run build
```

The production build is in `dist/client/` and `dist/server/` and includes the protected document Worker. The Vercel adapter is in `api/documents.js`; preserve `vercel.json` when deploying there. Configure the server-only document variables described below before building. No external asset CDNs are used. Design choices are stored in browser localStorage; JSON import/export transfers them between devices. The site has English and Hebrew interfaces.

## Files

- `src/model.mjs`: millimetre dimensions, cabinet chains, material choices.
- `src/scene.js`: interactive Three.js geometry and procedural materials.
- `src/ModelView.jsx`: orbit controls, cabinet picking, image capture, responsive camera, WebGL fallback.
- `src/PlanViews.jsx`: metric floor plan and elevations, with SVG export.
- `src/main.jsx`: hash routes between Home Studio and Kitchen Studio.
- `src/KitchenApp.jsx`: retained detailed kitchen, independent openings and manufacturer-dimensioned hood.
- `src/HomeApp.jsx`, `src/HomeView.jsx`, `src/HomePlan.jsx`: room controls, orbit/first-person walkthrough and interactive SVG map.
- `src/home-model.mjs`, `src/home-scene.js`: traced house topology, navigation collisions/pathfinding and room furniture.
- `src/home.css`: scoped responsive whole-house UI, Hebrew/English and touch controls.
- `public/house/`: attached house PDF unchanged and its rendered preview.
- `src/styles.css`: responsive desktop/mobile layouts and Hebrew support.
- `public/plans/`: supplied drawings, oriented for viewing.

## Dimension accuracy

Directly transcribed: 5450 and 3300 wall lengths; individual base and upper module chains; 2600 overall height; 120 plinth; 754 base body; 912 worktop height; 1500 upper starting height, 900 upper body height, 320 upper carcass depth; island 2440 top and 2400 carcass length.

The handwritten 90 on the island countertop drawing is interpreted as 900 mm depth. Island origin x≈2180, z≈1600 is estimated from the scaled drawing (about 980 mm work aisle). Window dimensions/location are illustrative. Revision 04 adds the exact Siemens hob outer dimensions from its supplied sheet; underside, cutout position and hood installation details remain illustrative. These are disclosed in the simulator and need a dimensioned execution plan or site measurements before asserting a fully verified 1:1 reproduction. The 700 sink and 900 cooktop housing widths follow the source drawings.

The reference drawing establishes arrangement rather than final finishes. Finishes, floor tone, illumination, and stools are visualization choices. Cabinet fronts can be opened for exploration; appliance doors are illustrative rather than full articulated mechanisms.

## Verification

Tests cover wall-chain closure, upper run alignment, island dimensional consistency, finite Three.js geometry for multiple lighting/material/opening states, island-front orientation, and upper front depth. A successful production build checks all React and stylesheet compilation. Browser visual QA must be performed in a WebGL-capable browser; no supported browser QA tool was available in the creation environment.

## Revision 29 — full-video HVAC and electrical review

The original `277904.mp4` (32.332896 s, SHA-256 `f29792fe1aa136a45b9902e9328698468627c4c8209e6a805a462de800108d45`) was reviewed at full display resolution, 1080 × 1920 after its rotation metadata. The existing smaller portable playback copy remains available in the simulator. Four new full-resolution evidence frames at 15, 16.5, 24 and 28 s supplement, rather than replace, earlier source rectangles and photos. The original latest photo, 277903, remains byte-identical.

`src/hvac-profile.mjs` and `src/kitchen-hvac.js` now build the same HVAC in the whole-home and detailed kitchen views: a shallower work run, a deeper projection above the hall entrance, the small work-run grille, the larger hall grille and the controller between them. The detailed kitchen's former decorative ceiling strips are replaced by this shared assembly. The hall width/return follows the plan; depths, vertical dimensions, grille positions/sizes and controller appearance are photo estimates. The detailed cutaway wall context now reaches the house's assumed 2.75 m ceiling and extends under the hall projection; the documented 2.60 m kitchen order envelope, cabinet/appliance geometry, source dimensions and window opening remain unchanged. Permanent HVAC remains opaque when cabinets are hidden or translucent and hides with the room during cabinet-only inspection.

The 48 stable electrical box/cluster IDs are preserved. Window-relative positions and wall faces are corrected in both children's rooms, the office, main bedroom, safe room and hall. A/B room assignment follows the video route but remains explicitly provisional, as do the office room assignment and all metric electrical placements. Bare/unreadable fittings remain unidentified preparations. K05 stays excluded; K09 retains its proposed accessible 1.65 m position above the oven, separately from its photographed original location. No additional sockets are invented in obscured bathroom/WC views. Exterior points retain their exterior-photo evidence because this indoor walkthrough does not survey the yard.

Each room's electrical card now offers the relevant video time and annotated source, with a compact whole-home review available too. New tests check the actual transformed hall grille, shared HVAC geometry, visibility behavior, socket/window relationships, wall normals, unchanged IDs, video provenance, room coverage and source-link handlers. Browser visual QA remains unverified because the supported preview service is unavailable in this session; geometry, component interaction checks and production compilation are validated independently.

## Revision 30 — full interface hiding and mobile control layout

**Hide all controls** clears the header, sidebar, view tabs, title, tools, legends, inspectors, bottom actions, navigation map, walking arrows/crosshair and notifications. A single 44 px **Show controls** button remains at the top corner. Escape restores the interface before the walking/inspection Escape handlers run, preserving the current view. This works in whole-home overview, room orbit, walking, house plan, detailed kitchen 3D, top plan and both elevations, in Hebrew and English. Existing saved `cleanView` preferences now enable the complete behavior.

`SceneUiLayer` uses native `hidden`/`inert`, so invisible controls cannot intercept touches or keyboard focus. The canvas/plan stays outside that layer and retains its React position. Camera coordinates, walking mode, selection, independent opening states and material choices are not reset. Hidden touch movement is released. Room/device names, dimension guides and service callout rings disappear temporarily; physical fixtures remain in the model and annotation preferences return unchanged. `scene-interface.mjs` changes overlay visibility in place without rebuilding the model or fitting the camera.

The house render bar, bottom options, room actions and mobile drawer button now occupy separate rows in one flexible dock. Wrapped text increases its actual height rather than covering the neighboring bar. Tests inspect the rendered DOM for all eight views, both languages and both visibility states; verify the shared dock, Escape handling, saved preferences, and actual 3D overlay/fixture visibility. Production compilation is also checked. The supported preview supervisor is unavailable, so browser/device visual QA remains unverified.

## Revision 31 — Oculus / Meta Quest WebXR

Open the deployed HTTPS simulator in the headset's browser, enter a house 3D view or the detailed kitchen's 3D view, and press **VR · Oculus**. The button probes `navigator.xr.isSessionSupported('immersive-vr')`; it does not start VR automatically or identify hardware from the user-agent string. Only the user's click calls `requestSession`. Unsupported devices, insecure contexts, blocked spatial-tracking policy, denied permission and startup errors have localized help/retry states. PC-connected headsets additionally require a compatible WebXR browser and VR runtime. Two-dimensional plan/elevation views retain their existing controls.

Both viewers use one `WebGLRenderer.setAnimationLoop` for ordinary and immersive rendering. WebXR supplies native per-eye projection/IPD and head tracking at the model's metre scale. The session prefers `local-floor`, with a `local` reference-space fallback and a single eye-height offset. The rig calibrates to the intended standing position and heading on its first tracked frame. House VR temporarily builds full-height walls and ceilings; kitchen VR temporarily leaves isolated-cabinet inspection. Saved cutaway/inspection settings are restored on exit.

Left thumbstick moves at up to 1.25 m/s, right thumbstick snaps by 30° once per deflection, triggers operate the actual door/shutter/front meshes, and B/Y on `xr-standard` Touch-style controllers ends the session. The headset's native session menu and the page's Exit VR button also end it. The home reuses its collision boxes and doorway-closing protections; kitchen joystick navigation uses the actual cabinet/island/stool bounds. Real room-scale head movement follows the headset and is not an engineering body-collision simulation. Controller grips/rays are lightweight local geometry, without fetching a device profile from a CDN.

Immersive rendering bypasses screen-only SSAO/FXAA postprocessing and disables shadow maps for the session; the regular quality mode and shadows return afterwards. Annotation callouts/dimension guides are temporarily suppressed. Pointer feedback is sampled at 10 Hz while head tracking/locomotion follows the headset loop, and trigger selections raycast immediately against visible surfaces so walls occlude interaction. Ending, rejecting or disposing a session restores the original desktop camera transform, projection, parent and OrbitControls target/enabled state, and removes VR resources. Kitchen VR part actions change opening states without replacing the prior desktop cabinet selection/inspection.

Implementation references: [Meta WebXR overview](https://developers.meta.com/vr/documentation/web/webxr-overview/), [Meta browser specifications](https://developers.meta.com/vr/documentation/web/browser-specs/), [Three.js VR guide](https://threejs.org/manual/pages/webxr-basics.html), [WebXR permissions](https://developer.mozilla.org/en-US/docs/Web/API/WebXR_Device_API/Permissions_and_security). The installed Three.js 0.180.0 source was used to verify the actual APIs. Tests cover capability checks, synchronous user-gesture requests, session races/cleanup, floor-height calibration, head-relative motion, snap-turn hysteresis, camera restoration, real kitchen controller picking/collisions, stereo rendering bypass and localized entry states. No physical Oculus headset is attached to the execution environment; headset hardware/performance and browser visual QA remain unverified.

## Revision 02 — technical order and cabinet inspection

The added technical order is 168947 (drawing remains 167968). See `src/specifications.mjs` for a source-linked transcription and five unresolved conflicts. Confirmed details now include ZA01SM front laminate product code (no calibrated swatch), graphite-grey interior, plywood body/back, 120 mm aluminium-look plinth, Touch uppers, integrated lower profiles, two internal drawers in the 570 mm cabinet, a two-level 500 mm pull-out, three wire baskets in the island's 400 mm unit, three drawers in both 1000 mm island units, and an 18 mm rear panel.

Click a cabinet, then **Open cabinet** or **Look inside**. Each unit opens independently; multiple units can remain open. Look inside isolates the selected cabinet and positions the camera on its actual front side. Back to kitchen restores the room camera. Hinged fronts, sliding drawer trays, wire baskets, shelves, dishwasher door/racks, sink plumbing, a schematic mixer lift, and the oven compartment can be inspected. Object styling, hinge/lift travel, shelf positions, and stored props are illustrative; they are not an engineering mechanism or collision simulation.

The order's 600 mm return unit, upper item 16 width, above-fridge body size, 410 mm basket row versus 400 mm cabinet, and final pantry shelf/drawer allocation conflict or remain underspecified. The model keeps the drawing envelope and discloses these differences. Financial receipts and payment sections are not included in the source-plan gallery.


## Revision 03 — each door and drawer independently

Every movable front, internal drawer, wire basket, appliance rack and lift has a stable ID and its own saved state in `openParts`. Click that exact part in 3D to toggle only it, or use its individually labelled button. Inspect cabinet isolates the unit without opening any parts. The former cabinet-wide and Open all actions have been removed; Close open parts remains available. Materials from earlier saves are retained, while old cabinet-wide opening flags are ignored.

Internal drawers/baskets open their required access door only. They leave sibling parts unchanged. A door cannot be closed while its internal drawer or basket is extended; the UI identifies the part that must be retracted first. The 500 mm bottle carriage has one shared full-height front, so its attached levels correctly move with that front as a single mechanism.

Tests verify stable unique IDs, state independence, access prerequisites, clickable geometry for every control, and actual geometry bounds: moving one middle drawer, sink door, pantry door, upper door, oven flap, oven drawer or fridge door leaves every other independently controlled part in place.


## Revision 04 — ordered appliances and unobstructed inspection

`src/appliances.mjs` records Siemens EX875LYV1E (812 × 520 × 51 mm, two extended FlexInduction zones / four areas, 7400 W) and Elica BOXIN LX 90. Both supplied manufacturer sheets are available in the source gallery, with manufacturer links in the appliance specification cards. The cooktop now has rectangular Flex zones, two slider marks, stainless side trims, a below-counter body and an actual opening in the stone. The preview opening is 780 × 500 mm, within the range on the supplied sheet; it is not a fabrication template. The underside and ventilation are schematic.

The hood is a child of `upper-3`, the 900 mm cabinet over the hob. Its illustrated 894 × 310 mm trim includes a grease-filter grille, two LED lights and mechanical control. Opening either Touch door reveals a motor housing and Ø150 mm vertical outlet. The lower storage space is reserved for the hood; the remaining shelf and top panel have openings around the duct. The hood preview is stainless; the uploaded sheet also lists a matte-black variant. Mounting, shelf modifications and the exhaust route are schematic until a final installation drawing is provided. No cross-brand cookConnect compatibility is assumed.

The upper cabinet centre (x3920) is 40 mm right of the hob centre (x3880). This inherited offset is disclosed and no cabinets are moved. The 862 mm dimension belongs to the mounting pan, not the motor. Revision 05 replaces the preliminary hood geometry with the manufacturer-dimensioned construction described below.

The floating cabinet controls now use a 50% opacity background with opaque, readable text. In Inspect cabinet, **Minimize cabinet controls** collapses the controls into a small card; **Restore cabinet controls** brings them back. Minimizing does not change the camera, selection or individual `openParts` states. Direct 3D part clicks remain available while minimized. Switching cabinets or leaving inspection resets the panel to its expanded presentation.

Verification adds actual mesh-envelope, worktop-hole, hood/cabinet fit, duct/shelf clearance and hood-isolation tests. Browser visual QA remains unavailable in this environment.


## Revision 05 — manufacturer-dimensioned BOXIN LX 90

The Elica BOXIN LX/IX/A/90 hood is rebuilt from the official 90 cm technical PDF (Elica product 4625, PRF0114761A), pages 3–4, cross-checked against Elica’s exact 90 cm installed product photo. Both the numbered drawings and product photo are available in the source gallery; the original PDF is included unchanged. `src/hood.js` models the product separately from the installation duct.

Verified dimensions in mm: external frame 894 × 310; mounting pan width 862; pan/base height 60 with 35 mm upper section and 25 mm lower skirt; motor 305 × 269.8 × 278.8, set 16.2 mm from the rear; overall body height 338.8; height including outlet collar 361.3; Ø150 outlet with its axis 102.7 mm from the product rear. The upper cabinet depth is 320, so the modelled collar axis is 112.7 mm from the wall. The 862 mm pan fits between the illustrated 18 mm cabinet sides. The motor is a narrow central housing with space either side.

The underside now shows two independent framed grease-filter cassettes with diamond mesh, recessed release handles, two round LED bezels, a rotary selector, folded front visor and side protection. The motor has folded panel seams, cover screws and an Elica badge. Numbered dimensions are at 1:1 scale; filter/lamp/handle/screw positions and tiny manufacturing details are visually matched to the reference photo and are not a factory CAD scan. Stainless finish is retained.

In Inspect cabinet for the hood’s upper unit, **Hood underside** moves the camera below the appliance. The inspection orbit now permits views from below; Back to kitchen restores the room camera limits. The half-transparent/minimizable controls and all individual door/drawer states are retained.

The installation pipe extends beyond the real collar as a separate object. It passes through actual circular Ø160 holes in the shelf and cabinet top. The duct route and final cabinet mounting are still an installation illustration. Cabinet positions and the existing 40 mm hob/upper centre offset remain unchanged.

Tests check the actual product mesh envelope and motor dimensions against the drawing, collar and motor offsets, filter/LED counts, mounting-pan fit, circular-hole ray clearance and isolated-cabinet contents. Browser QA is unavailable in this environment; geometry and production compilation are verified independently.


## Revision 06 — whole house, individual rooms and garden

The default route is Home Studio. `#/kitchen` opens the complete Kitchen Studio; its **Whole home** button returns to the house kitchen view. The kitchen model, independent openings, half-transparent/minimizable inspection panel, Siemens hob and Elica BOXIN LX 90 are retained. Home and kitchen settings use separate localStorage keys and flush on navigation. The house kitchen proxy reads the saved kitchen finishes and preserves its cabinet and island chains; it is an alignment for visualization, not a newly verified kitchen installation survey.

The 15 navigable spaces are living, dining, kitchen, four bedrooms, safe room, main bathroom, en suite, guest WC, utility, hall, terrace and garden. The outline, master-bedroom L shape, hall opening, doors and windows were traced from the vector geometry on page 1 of the attached house plan. Living/dining/kitchen floor zones are UI divisions of one open space, not new walls. The original PDF is included unchanged. Nominal scale is 1:50: one PDF point becomes `50 × 25.4 / 72 / 1000` metres. Some vector spans exceed printed room dimensions by roughly 5–7 cm; the source does not explain this. Printed labels remain separately visible and no wall is stretched to force agreement. The dashed exterior line is the upper-floor projection, not a new wall.

**Views:** whole-home cutaway, room orbit, interactive floor plan and continuous first-person walking. In walking mode drag to look, use WASD to move, or up/down arrows to move and left/right arrows to turn. Touch direction buttons support a phone. Choose a room in the sidebar or minimap to follow a continuous grid path; only doors on that path open. Movement stops at walls, closed doors, the fixed half of the terrace slider, kitchen counters/island and large furniture. Manual movement cancels the guided route. The living slider leads to the terrace/garden; the utility exterior door leads to the service yard/garden.

Wall colors, floor finishes, furniture finishes, daylight/evening, cutaway, room labels and illustrative furniture can be adjusted. Wardrobe doors, lower drawers, vanity doors and console drawers have stable independent states and clickable meshes. Their controls can be minimized. Home designs export/import as JSON; the current 3D view exports as PNG. Furniture and lighting are illustrative. Ceiling height 2.75 m, eye level 1.62 m, window heights, planting and fence height are assumptions without a verifying building section. Door swing, glass and furniture mechanisms do not have engineering collision modelling. The home is not claimed as a fully verified 1:1 construction model.

Verification covers source topology, distinct open-plan floor zones, indoor routes to every room with furniture, step-by-step collision-aware route execution, the two exterior routes, closed doorway/window blocking, slider fixed-half blocking, independent saved part states, finite house geometry, clickable controls and retained kitchen/hood tests. A supported browser QA tool was unavailable in the managed creation environment, so no browser or mobile visual test is claimed. Run the build in a WebGL-capable browser for final visual/device checks.


## Revision 07 — owner's layout and Harash / Hercules products

The attached Harash schedule is transcribed by product code and source page in `src/home-products.mjs`. Original PDFs are preserved under `public/house/`; the in-app source viewer shows the five product pages and the Hercules sheet. Each room's **Your specified products** card and each ordered fitting's inspector link show its code, dimensions, source page and any ambiguity. Financial totals and legal pages are not transcribed into the product UI.

Defaults now use MI402439 Chic matte-white 100 × 100 cm tiles in dry rooms, YUCLCE33 grey 30 × 30 cm R10 in wet/utility rooms, EGEHDA15 Habitat Dawn 15 × 60 cm R10 on the terrace, MOZ62705 Mona grey 25 × 75 cm wet-room wall tiles and PANEL124 7 cm skirting in dry rooms. The en-suite shower has the separately listed YUCLAC33 33 × 30 cm R11 floor patch. Tile spacing is metric; shade, decor pattern, laying phase and tiling heights are illustrative because no product photos or elevations were attached.

The general bath has the HR000160 Eco Cubic 160 × 70 cm tub, one 82 cm VISION door vanity and an 80 cm model 109 aluminium-frame mirror. The en suite has its 82 cm VISION Wrangler vanity and matching 80 cm mirror. Harash lists both S2610721 Gabriel and S2512421 Wrangler against the general-bath vanity without a clear cancellation, so the model shows one cabinet of their common width and explicitly flags the unresolved model choice. All three toilets are wall-hung Harash Sky white HISK3180 with SLIM HISK8520 seats; the contractor-provided concealed cistern and plate have no specified model. The guest WC has the ST0000SO wall basin with no invented vanity underneath. The source itself lists alternative basin names and no dimensions; that shape remains illustrative.

VR008077 chrome basin mixers, the ELIX8321 / VR081770 four-way mixer, VRN00416 hand-shower rail, round outlet and the en-suite Ø20 cm VR001833 shower head with 35 cm VR000239 arm are represented. There is no separate invented floor shower in the general bath. The indoor kitchen now also defaults to the scheduled 100 cm white floor, and its tap is represented as the VR001221 brushed two-mode pull-out rather than inheriting the cabinet-handle color. The schedule credits the kitchen bowl and does not identify a selected replacement; the earlier illustrative sink envelope is retained.

Owner layout changes: indoor dining furniture and its separate zone are removed; its floor remains part of the open living area. Bedroom 1 and 2 mattresses are exactly 1.20 × 1.90 m. Bedroom 3 (stable internal ID `bedroom-c`) becomes an office with desk, task chair and office storage. The garden sofa is removed. Living sofa/TV swap to the opposite walls, with sofa back against the former TV wall. The main bed rotates 180°, with headboard against the south wall and a wall TV opposite on the existing en-suite partition. Architectural walls, windows and openings remain fixed.

The black Gusto Hercules outdoor kitchen sits against the western garden boundary directly opposite the living slider, facing the house. Its documented chain is 80 cm sink + 150 cm six-burner grill / rear burner / side hob + 80 cm fridge / storage = 310 cm, depth approximately 70 cm. It includes individual sink doors, grill doors, two drawers, adjacent storage, glass fridge door and hinged grill hood; each has its own clickable saved state. Cabinet height 90 cm, internal appliance dimensions, detailed contours and hardware travel are illustrative. `src/outdoor-kitchen.js` owns this assembly. The original terrace table remains; the cancelled dining area is the indoor one.

Home settings migrate to schema 2, replacing old illustrative floor defaults with the supplied selections while retaining other finishes and valid individual opening states. Unknown old parts are removed. Kitchen revision 7 similarly migrates its previous floor default. Explicit new finish experiments remain editable and import/export still work.

Tests verify the real mattress geometry, sofa/TV facing and wall contact, rotated main-bed headboard contact, the removal of cancelled objects, office access, product-code assignments, ordered finishes and migration, metric wall/floor tile sizes, 82 cm vanities, wall-hung WCs, the Hercules module chain and fence/slider alignment, independent outdoor openings, all continuous walking routes and the unchanged detailed hood/cabinet mechanisms. Browser visual QA remains unavailable in the managed environment.


## Revision 08 — safe-room bed, compact map and item dimensions

The safe-room sofa is replaced by a 140 × 190 cm double mattress (a chosen illustrative size because no exact size was specified). Its headboard faces the south wall and stays below the window sill; side tables are omitted to keep the room accessible. The guided-walk destination moves into the clear aisle between bed and storage, with existing doors/windows unchanged. The plant at the northern/right end of the Hercules kitchen is removed; four other garden plants remain.

The collapsed **Your location** control is now inside a shared navigation dock beneath the walking arrows. Its reserved slot keeps the arrow controls stationary when the map expands; the expanded map keeps its existing opposite-side position. The dock uses the existing desktop/mobile offsets and supports RTL/LTR.

Click any main room furniture or sanitary fitting to see width, depth/length and height immediately in the translucent inspector. `src/home-measurements.mjs` returns nominal dimensions in cm in the object's own axes, so rotating a desk or opening a door never swaps or inflates its listed size. Beds show mattress width/length and approximate platform height; wall basins identify mounting height. Cabinet body sizes exclude attached mirrors and accessories. Explicitly supplied bedroom mattress sizes and documented bathtub/vanity/outdoor widths are distinguished from assumed dimensions. The ≈ marker identifies an unsupplied real-life size; outdoor depth is also marked approximate as in the sheet. `src/ItemDimensions.jsx` renders these details above existing product and independent-opening controls. Previously untagged furniture meshes now inherit their furniture selection, while exact door/drawer click targets retain their independent actions.

Regression checks cover the double mattress's actual mesh size, window/headboard clearance, safe-room walking route, remaining plant locations, measurement provenance, rotated-object dimensions and selection coverage. The existing house navigation, source products, individual openings and detailed hood tests remain in place. Browser visual QA remains unavailable in the managed environment.

## Revision 09 — bedroom wardrobes beside the entrance doors

Bedroom 1 and 2 wardrobes now sit beside their respective doors along the continuation of the east entrance wall, facing west into the room. Their original body sizes remain 180 × 55 × 230 cm and 170 × 55 × 230 cm. The first wardrobe follows the existing wall jog above the door; the second sits below its door. Bedroom 2's computer desk moves to the former wardrobe area on the north wall, with a small sideways offset to clear the entrance door swing. Bedroom 1's desk shifts about 30 cm west along its existing south wall to keep the entrance walkable. Both 120 × 190 cm mattresses keep their positions.

Guided-walk destinations move to the clear central aisles. Geometry checks cover the actual closed/open wardrobe meshes, entrance-door sweeps, room containment and separation from other furniture, in addition to all existing continuous walking routes. Individual cabinet doors/drawers, the inspector and item dimensions retain their stable IDs. Walls, windows and door openings are unchanged. Browser visual QA remains unavailable in the managed environment.

## Revision 10 — corner beds, close all and RG/RG1 construction specification

The new apartment specification numbers the main bedroom 1, the two children's rooms 2 and 3, the office 4 and the safe room 5. Existing simulator room names stay stable. Per the owner's clarification, the two 120 × 190 cm children's mattresses in simulator bedrooms 1 and 2 (`bed-a`, `bed-b`; specification rooms 2 and 3) now sit in their north-west room corners, with about 2 cm of frame/headboard clearance for skirting on both walls. The previously converted office stays an office. Wardrobes remain beside the entrance doors, and the room 2 computer/wardrobe swap from revision 09 is retained.

**Close all** is available in every home view and in the detailed kitchen. It clears all home door states and furniture parts (including outdoor appliances), as well as the detailed kitchen's individual door/drawer states. `src/studio-state.mjs` preserves finishes, language, source metadata and the active app's unsaved choices while updating both browser saves. In a walking view it cancels a guided route and held controls; when the camera is in a doorway, `clearStandingPosition` finds a nearby clear position before the doors close. Selection and inspection remain available, and individual opening controls work again immediately.

The supplied originals are included unchanged as `public/house/apartment-spec.pdf` (47 PDF pages) and `public/house/building-plan.pdf` (12 PDF pages). The source viewer offers selected pages with their actual PDF page numbers, plus links to both complete originals. The building's ground-floor sheet (page 3, building 4102 / plot 1410 / apartment 4) confirms the existing apartment outline; it does not justify moving walls.

`src/home-building-spec.mjs` transcribes the **RG/RG1** opening schedule only (pages 16–17): bedroom and kitchen window heights 125 cm, en-suite window 90 cm, safe-room window 100 cm, utility window 125 cm; standard door heights 210 cm, safe-room steel door 200 cm and service exit 230 cm. Opening x/z coordinates and construction widths continue to follow the apartment plan, with scheduled approximate widths retained as reference data. The two tilt windows use a single-frame layout, and steel entrance/service doors use a metal finish. Sill heights remain assumptions. The additional inner wooden safe-room door is documented but is not modeled separately.

Bathroom cladding now stops at the nominal door-frame height (210 cm); guest WC cladding stops at about 120 cm (specification pages 11–12), with painted walls above. The source permits completing a full tile, so final tile-course height is not an installation claim. The listed **minimum** ceiling heights of 250 cm / 205 cm for services and hall are shown as minima; the displayed 275 cm ceiling remains explicitly assumed. The constructor's baseline does not replace the later Harash selections or the custom Anise kitchen schedule. Existing ordered tile sizes, product codes, independent cabinet parts and manufacturer hood dimensions remain intact.

Checks cover actual bed/frame corner placement, preserved office use, entrance-door sweeps, all walking routes, closure transforms for both full Three.js scenes, cross-simulator save persistence, nearby clear standing positions, rendered opening heights, bounded cladding heights, unchanged original PDF digests and preview assets. Browser visual QA remains unavailable in the managed environment.

## Revision 11 — drawn door swings, two safe-room doors, shutters and services

The resupplied apartment and building PDFs are byte-identical to the originals used in revision 10. A deeper review adds the mechanisms and applicable six-room garden-apartment service clauses rather than changing the traced apartment outline or the owner's furniture/kitchen layout.

`DOOR_HANDINGS` records hinge endpoints and opening directions from the apartment drawing. Bedroom 1 hinges at the south jamb, the guest WC opens into the WC, the bathroom hinges at its south jamb and opens east, the utility door opens into the utility area, and the safe-room steel door hinges at the east jamb and opens outward. The actual Three.js pivots and handles follow those sides. The safe room also has a separate 70 × 200 cm wooden inward-opening leaf from specification page 16. Both leaves share one construction opening and retain independent saved/clickable states. Its inner hinge side and 13 cm frame offsets are illustrative; the drawing only shows the outer steel leaf. Guided walking opens both leaves and a closed one blocks passage.

The six electric aluminium roller shutters specified on page 16 are now modeled at the living slider, kitchen window and four bedroom windows. They have separate sidebar and 3D click controls, animated curtains and saved `closedShutters` states. There is no invented electric shutter in the wet rooms, utility or safe room. Box profiles, curtain slats and roll-up representation are illustrative. A closed terrace shutter blocks passage even when the glass slider is open. Guided routes raise that shutter when necessary while retaining other shutter states. **Close all**, from either simulator, now lowers all shutters as well as closing all home and kitchen doors/drawers. Existing schema-2 saves/imports remain compatible and invalid shutter IDs are removed.

Exterior living/bedroom/kitchen glass now uses two glass layers following page 26 note c; wet-room, utility and safe-room glass retain their separate single-pane illustration. Thickness, inter-pane gap and detailed profiles are assumed, and no certification of the protected window assembly is implied.

The room-design panel and source facts now report the specific garden-apartment electrical supply (3 × 40 A), the included mini-central air-conditioning exception for six-room apartments (excluding bathrooms/utility), specified mechanical ventilation in the main bathroom and guest WC, included safe-room air filtration, minimum 150-litre hot-water storage and the private garden's delivery without landscaping/irrigation. Sources are specification pages 16, 30, 33 and 34. Locations/capacities/models not given in the documents are not placed as invented measured service fixtures. The existing planting remains a clearly labeled design proposal. Source preview tabs add pages 26 and 30–34, including the electrical-point tables on pages 31–32, and the full PDFs remain unchanged.

Geometry/state checks verify real hinge endpoints and swing sides, independent safe-room leaves and their shared wall opening, both-leaf route requirements, individual shutter meshes and state isolation, shutter passage blocking and guided reopening, glazing-layer counts, legacy-save sanitization and global closure of all shutters. All prior bed/wardrobe layouts, selected products, detailed kitchen mechanisms and manufacturer hood geometry remain covered. Browser visual QA remains unavailable in the managed environment.


## Revision 12 — real house photographs and walkthrough

The nine owner photographs and the 32-second video are now usable references inside the source viewer. The header camera button opens **House photos & video**; each photograph has its own caption and the video has native play, seek, volume and fullscreen controls, with no autoplay. Local JPEG previews and a fast-start H.264/AAC 540 × 960 video preserve the original audio while keeping the complete preview set around 4 MB. `public/house/photos/provenance.json` records each original attachment filename and SHA-256; these are viewing derivatives, not replaced source photographs or a calibrated scan.

`src/home-photo-reference.mjs` separates visible observations from estimated dimensions. Dark anthracite window profiles now have two sliding sashes on distinct tracks, with two glazing layers in each sash. The four bedroom shutter access covers and the living slider cover face the interior above the opening, in the photographed dark finish. The earlier white exterior headboxes are removed. The kitchen access cover is concealed at its photographed bulkhead. Opening positions, schedule heights, independent electric-shutter states and close-all behavior are preserved. The safe-room window gains the exterior slats seen in its photograph; this is a visual illustration, not a certified protection assembly.

Permanent architecture added in `src/home-observed-scene.js`: the kitchen work-wall bulkhead with two differently sized horizontal HVAC grilles, the lowered hall ceiling, the ceiling drop at the main-bedroom entrance beside the en-suite partition, and the white filtration unit above the safe-room window. Their presence/relative placement is observed; dimensions, exact grille positions, construction thicknesses and equipment model details are estimated. The main 275 cm ceiling and window sill assumptions remain; photo perspective does not establish a new height. Kitchen bulkhead underside is provisionally 242 cm, hall 246 cm and main-bedroom entrance 242 cm; the safe filter body is provisionally 48 × 22 × 40 cm with its bottom at 217 cm. These are clearly marked ≈ in the new translucent, minimizable building-element inspector, available by clicking the feature or its Room design reference card.

Ceiling drops and high fittings are visible in **Walk through** or with **Cutaway** disabled; they are omitted from the low-wall overview so the plan remains readable. They stay present when illustrative furniture is hidden. The HVAC bulkhead clears the existing 240 cm kitchen tall/upper cabinets; the safe filter is above the protected-window opening and mounted just inside the actual wall face. The lower ceilings remain above doors and eye height and do not modify 2D walking routes.

Bedroom photographs lack numbered labels. Their common window/profile treatment is used, while room-specific outlet positions are not guessed. The existing measured plan, Harash finishes, owner furniture placements, independent doors/drawers, exact kitchen hood and appliance geometry are retained. The source and accuracy panels explain which additions are photo-observed and which sizes remain estimates.

Verification includes actual Three.js feature placement, ceiling footprints and clearances, two grille assemblies, safe-filter/window separation, permanent-fixture visibility independent of furniture, inward shutter covers versus exterior independent curtains, separate window tracks, all local media previews and fast-start video packaging, plus all prior navigation, layout, kitchen and global-close regressions. Browser visual QA remains unavailable in the managed environment; no browser/mobile visual test is claimed.


## Revision 13 — terrace-width paving, pergola and privacy fence

The new paving carries the original terrace side lines straight west to the existing garden boundary. The original terrace remains intact; the added rectangle is approximately **4.34975 × 3.559175 m = 15.4815 m²**. The total finished paving is about **29.8352 m²**. Its ordered Habitat Dawn 15×60 cm finish and world-origin joint grid continue across the original/new seam at the same displayed level. Changing the terrace floor finish updates both surfaces. Room view now fits the complete finished terrace and walking recognizes the added strip as terrace.

The cream pergola begins at the upper-floor edge (PDF x=498.3) and ends at the existing west boundary (x=273.84), spanning only the existing paving's z=42.88…289.48 side lines. Its plan-derived footprint is approximately **4.34975 × 3.959225 m = 17.2216 m²**. It does not use the roughly 7.4 m full balcony frontage. The original paving already projects about 40 cm beyond the upstairs edge. Plan scale remains nominal 1:50, not a field survey.

`src/home-garden-layout.mjs` keeps footprint derivation and planned-versus-existing element metadata separate from rendering. `src/home-garden-scene.js` models a cream 150×50 mm perimeter, 120×50 carrier, 80×80 dividers/posts and 11 cm shade profiles from the example. Four illustrative corner supports avoid the actual Hercules kitchen; they also block the walking camera when furniture is hidden. Height is provisionally 3 m. The attached 5×4 m / three-post example is a style reference, not a structurally approved support layout or quantity schedule for this different footprint. Connections, clearance, drainage, substrates and slopes need a measured installation design.

The existing upstairs balcony front line follows the plan, with slab/fascia/glass railing suggested by the four exterior photos. Its 275 cm soffit and 20 cm slab thickness remain assumptions. In cutaway, the new slats are translucent and the existing balcony reduces to its edge. **Hide pergola roof** removes the new shade profiles and existing balcony slab/railing so the space is inspectable; posts and frame remain. The setting survives local saves, JSON import/export and Close all.

The boundary follows exactly the same four modeled runs as before, now with horizontal 11 cm textured-grey-1200-style Modolina panels. Overall modeled height is **150 cm from paving**, consisting of the quoted 120 cm panel on an explicitly assumed 30 cm stone base. This overall-height interpretation is shown in the inspector. The quote's 37 m does not resize or certify the full plot perimeter. Listed colors are screen approximations.

Click a frame, fence run or new paving for estimated dimensions and relevant source; controls remain translucent and minimizable. **Room design** for Terrace/Garden and the accuracy dialog include a compact outdoor summary. The SVG plan/minimap show the exact paving extension, pergola outline and post positions. The exterior-photo/design-reference gallery includes four existing-condition photos and five separately labeled example screenshots. Local portable previews and SHA-256 provenance are included in `public/house/garden/`; original attachments are unchanged.

Validation: 60 automated tests pass, including actual mesh envelopes, requested terrace-only strip, source-line/area calculations, original/new paving seam and level, fence overall height and slat direction, post/kitchen clearance and walking collisions, route from living slider, roof visibility, saved-state/global-close preservation, source provenance and all existing room/kitchen regressions. Production compilation is checked through the Sites packaging workflow. Browser/mobile visual QA remains unavailable in this managed environment; no browser visual verification is claimed.


## Revision 14 — rear service-yard chamber and proposed 2.5×3 m shed

The large grey rear-yard circle is identified by the RG1 legend as a **sewage/drainage inspection chamber**, not a tree. Its centre is traced from the outer ring at PDF bounds `[1183.97, 868.17, 1240.81, 925.01]`, giving centre `[1212.39, 896.59]`. The new flush cover is placed there in both the 3D scene and interactive plan. The owner confirms a sewage chamber outside the utility room. The nominal 100 cm cover diameter illustrates the roughly 1 m plan symbol; it is not a measured lid or chamber diameter. A dashed **160×160 cm access reserve** is a clearly labeled design allowance, not a claimed statutory maintenance distance. Source/legend crops and unchanged-PDF SHA-256 provenance are included in `public/house/service-yard/`.

`src/service-yard-layout.mjs` derives the proposed shed outside the home-office wall, to the **left of the chamber in plan view**, with its door facing back toward the service yard. External footprint **2.5×3 m = 7.5 m²**; assumed total height **2.2 m**; assumed 6 cm walls leave approximately **238×288 cm** inside. The footprint starts 20 cm outside the office outline and its rear edge aligns with the house rear outline. This leaves approximately **2.15 m** to the fence on the chamber side and **1.66 m** behind the shed to the rear boundary. These are nominal plan-derived dimensions, not verified installation setbacks. The nearest shed side is about 50 cm from the illustrated cover rim and about 20 cm outside the marked access square. Shed base, walls, roof, shelves, open leaves and appliance bodies do not overlap that square.

Two upright appliance placeholders each reserve a **65×70×185 cm nominal body**, with 10 cm behind and 15 cm between bodies, plus a 90 cm shed doorway, 40 cm shelves and a central aisle. Models, actual dimensions, handles, door-hinge clearance, temperature suitability, electrical requirements and ventilation requirements are unknown. The shown vents are illustrative rather than an airflow calculation. The UI links official Beko ventilation and Liebherr climate-class guidance as examples; the actual two appliance manuals govern their installation. No retail model, guaranteed shed temperature, permit or construction approval is implied by this layout.

Click the chamber, shed or appliance in the SVG plan/3D model for dimensions and sources. Room design for Garden or Utility contains **Shed & chamber access**; its item cards also focus the 3D camera. The shed door, refrigerator door and upright-freezer door open independently using stable `openParts` IDs. Existing Close all also closes them and preserves finishes/roof settings. Shed roof visibility has its own control; cutaway automatically opens the view from above. Walls, shelves and appliance bodies block walking; the flush chamber cover remains walkable. Routes can leave an already-open shed. The original house outline, rooms, existing garden/pergola, kitchens and prior furniture placements remain unchanged.

Validation adds chamber-centre/source identification, shed/house/plot fit, actual open/closed mesh clearance from the access reserve, utility-to-chamber routing, shed doorway collision/open-state behavior, navigation out of an open shed, appliance allowances and independent transforms, roof/import/global-close persistence and portable crop provenance. Browser/mobile visual QA remains unavailable in this managed environment.


## Revision 15 — neighbour-side shed with clear safe-room frontage

The two new owner photos (`273512.jpg`, `273513.jpg`) were reviewed at full size and with ground-detail crops. Neither reveals a chamber lid with enough certainty to locate it. Sand, shadows and the foreground railing obscure the ground; no photographed circle is invented or asserted as the lid. The chamber retains the RG1 symbol centre and illustrative 100 cm diameter from revision 14. Its actual centre and cover size still require field confirmation. Both photos are now in **Service yard — chamber & shed**, with original-file SHA-256 provenance and explicit `lidVisuallyConfirmed: false` metadata.

The previous 2.5×3 m office-side footprint is replaced by a narrower proposal: **3 m along the neighbour boundary × 2 m toward the house = 6 m²**. The shed sits 10 cm from the right-hand plot boundary in plan and ends 10 cm before the marked 160×160 cm chamber access square. With the illustrated 100 cm lid, this leaves about 40 cm between the shed's rear side and the cover rim; the access square remains uncovered. These are plan-based design allowances, not verified installation clearances.

The shed is laterally outside the full safe-room window opening: about **1.63 m** separates its house-facing side from the opening's right-hand end in plan. The narrowest passage alongside the safe-room exterior wall is about **1.25 m**. A translucent blue strip in the 3D scene and interactive plan shows a proposed 150 cm-deep clear area projected across the actual opening width. The shed and its complete door swing stay outside that area. This tests plan geometry and does not certify window protection, ventilation, daylight, opening operation or construction compliance.

Assumed 6 cm walls leave about **188×288 cm inside**, retaining two upright **65×70×185 cm nominal appliance bodies**, 10 cm rear and 15 cm inter-appliance allowances, 40 cm shelves, a 90 cm entrance facing the service yard and independent doors. Actual refrigerator/freezer models remain unspecified. Source captions, dimension labels, plan labels and Garden/Utility design cards now distinguish the 3 m along-fence length from the 2 m perpendicular depth. The existing shed roof toggle, per-item inspection, saved opening states and global closure remain available.

The neighbour-side boundary is now a pale rendered wall with stone coping, matching the new photo, while its existing plan line remains fixed. Its displayed 150 cm height and 12 cm body/16 cm coping width are visualization assumptions. Other boundary runs retain the requested grey horizontal Modolina design. The house walls, window positions, chamber plan coordinates, kitchens, furniture and terrace/pergola footprints are unchanged.

Validation covers the new footprint, boundary offset, access-square separation, complete open/closed shed and appliance geometry, preserved utility-to-chamber and all-room routes, guided exit from an open shed, appliance spacing, roof/save/global-close persistence, safe-room opening alignment and full shed-door swing outside its clear frontage, photographed-wall rendering and four portable service-yard source assets. Browser/mobile visual QA remains unavailable in this managed environment.


## Revision 16 — recessed exterior spaces and two outdoor AC units

The owner’s exterior photos distinguish two different spaces: the covered service-exit porch and a deeper open-air court ending at the kitchen window. The previously missing east return of the porch is restored from the RG1 linework. Its nominal clear plan dimensions are approximately **1.60 m wide × 2.00 m deep**. The adjacent kitchen-window court is approximately **1.49 m wide × 3.30 m deep** to the external window-wall face. This 3.30 m dimension describes the court, not the frame reveal. Original room boundaries and existing opening coordinates are preserved.

The service porch now has stone-clad returns, an illustrative 2.50 m ceiling underside and 15 cm slab, dark wood-look paving and a left downpipe. The existing exterior steel door is dark and remains independently outward-opening; no second exterior doorway is invented. The court remains open to the sky, with the neighbour’s low wall on one side. Stone jambs and sills respect the existing kitchen and utility window apertures. Cladding and porch ceiling disappear or reduce appropriately for cutaway, while their geometry is available in Walk through and the exterior inspection camera.

The second service-side photo clearly shows **two bracket-mounted condensers**: large toward the safe-room corner, small toward the exit. The large unit’s horizontal station follows the RG1 AC symbol near PDF (1104.48, 660.94); the small unit’s station is estimated from the photographed order. Approximate bodies are 94×40×115 cm and 80×35×60 cm, with an assumed 30 cm underside and 8 cm wall gap. Models, capacities and exact installation dimensions are unknown. Fan guards, rear coils and brackets are illustrative. Both units remain visible and block walking when illustrative furniture is hidden.

Amber front markings reserve a proposed 120 cm facing area with 20 cm lateral extensions. These are planning allowances, **not verified manufacturer ventilation requirements**. To avoid those markings, the neighbour-side shed is shortened from 3×2 m to **2.5 m along the fence × 2 m toward the house = 5 m²**. With assumed 6 cm walls, the internal footprint is 188×238 cm. The 90 cm door now opens inward on its right hinge, clearing shelves, both AC frontage markings and the appliance bodies. The two existing upright appliance placeholders, independent doors and shed roof control remain. The shed retains its 10 cm boundary gap and the same rear termination before the unverified chamber access reserve. The wall-to-shed width of 1.25 m is not labelled as a clear aisle across the projecting AC units.

Garden, Utility, Kitchen and Safe room offer the relevant exterior detail cards. Selecting a card opens a full-height exterior camera and a translucent, minimizable dimension/source inspector. The porch inspector operates the existing service door; the court inspector operates the kitchen shutter independently. Both features and condensers are selectable in the SVG plan and 3D scene. The exterior photo gallery includes the three new photos, the earlier photo showing both condensers and an original RG1 crop, all locally packaged with SHA-256 provenance. Photographs do not establish measured AC dimensions or a confirmed chamber lid.

Validation includes nominal plan spans, return-wall collision and routes around its mouth, utility-to-chamber access, ceiling/door clearance, preservation of both window openings, two distinct condenser bodies and permanent collision, proposed AC-frontage separation from all shed meshes and the complete inward door sweep, shelves/appliance swing separation, exterior camera directions and portable source provenance. Existing whole-house, detailed-kitchen, independent opening, roof and global closure checks remain required. Browser/mobile visual QA is unavailable in this managed environment.


## Revision 17 — observed outlet / switch annotations

A visual survey reviews the nine owner interior photos, exterior photos and the 32.33-second walkthrough at one-second intervals, with eight independently extracted exact-time source frames. **49 box/cluster locations** have stable IDs, normalized source-image rectangles and traceable photo/frame references. Repeated views of the kitchen short wall, office-window group and safe-room points share the same observation IDs. This is not a count of socket modules, an electrical circuit schedule or a measured installation drawing.

Blue means a visually identifiable power socket, purple a possible switch/control, and amber an unidentified opening/preparation. Bare boxes are not assigned amperage, phase, circuit, wiring or a definite purpose. Existing water/gas outlets, drainage, ceiling lamps, ventilation covers and cistern flush plates are excluded. No points are invented in the doorway photo where none can be identified. No new points are added to rooms merely because outlets are expected there.

All 3D wall assignments, heights and distances are estimated from the visual evidence and fitted to existing walls without placing a point in a window/door aperture. Numbered assignments for the two children’s rooms and office are explicitly provisional: the photos are unnumbered. These points have dashed outlines and can be filtered independently. Accurate source-image rectangles remain available regardless of the model assignment. The default electrical layer is on; its toggle and provisional-room filter survive saved designs, imports and Close all.

The floor plan uses separate callout pins and leaders so adjacent boxes and high/low boxes at the same horizontal station remain independently selectable. Model anchors are unchanged by callout spacing. In 3D, small faceplates follow estimated wall positions; colored annotation halos remain visible through existing furniture. Electrical annotation hit targets take precedence only where their visible pin is clicked. These are display annotations, not additional walking obstacles or electrical controls. Clicking a point opens the existing translucent, minimizable inspector with its assumed height and source photo. No sofa, TV, cabinet, window or device is relocated with the electrical annotation.

The Electrical button toggles the layer in every view. Click its legend for the source gallery, or use Room design → Outlets, switches & preparations for the room’s IDs and evidence. The gallery offers all nine interior photos, eight video frames and three exterior references with natural-aspect CSS overlays and source links. Video evidence can open at its source timestamp. All new frames and the terrace photo are packaged locally with provenance and SHA-256 hashes; original attachments remain unmodified.

Validation covers identity/evidence/uncertainty, wall-span and aperture constraints, separated SVG callouts, visibility/import/global-close persistence, 3D point placement/picking and permanent architecture, source deduplication and portable source assets. Source-image rectangle alignment was visually reviewed using internal contact sheets. Browser/mobile QA is unavailable in this managed environment; source overlays and the 3D integration have not been exercised in a browser here.


## Revision 18 — outlets in the detailed kitchen

Kitchen Studio now has **Show outlets / הצגת שקעים** in its toolbelt and a matching option under Details. It displays the same ten kitchen observations K01–K10 from revision 17 in 3D, the floor plan and both wall elevations. No points are added or reclassified. Source IDs, photo rectangles, estimated heights and evidence limitations are shared with Whole home.

The whole-home kitchen uses an anchor and a 180-degree rotation. The detailed view applies that placement’s exact inverse to the ten observed positions, retaining metres for annotations and adapting the existing millimetre-based scene helpers. These are estimated visual positions rather than measured installation locations; the house-plan/detailed-window alignment limitations still apply. Blue means a visible power socket, amber an unidentified preparation. No circuit, phase or precise installation clearance is inferred.

The optional layer defaults off and survives browser saves, design JSON export/import and Close all. A colored annotation halo stays visible through cabinetry, and its hit target opens electrical evidence without opening a cabinet. 3D labels and plan/elevation IDs match the photographs. A point panel shows assumed centre height, wall and a source button; it can be minimized. Source photos open directly inside Kitchen Studio. All ten points are also listed under Details, with a focus action. Activating the layer from isolated cabinet inspection returns to the full kitchen; isolated cabinet mode otherwise retains its prior cabinet-only behavior.

Validation adds inverse-coordinate/evidence consistency, metric 3D faceplates and annotation targets, unchanged independent cabinet transforms, preserved cabinet isolation, floor-plan and elevation projections, and saved visibility/global closure checks. Browser/mobile QA remains unavailable in this managed environment.


## Revision 19 — selectable electrical labels and real-photo comparison

Electrical IDs in the detailed kitchen are now real 64 × 44 CSS-pixel buttons in 3D, floor plan and elevations. Leaders connect separated screen-space labels to unchanged physical anchors. The active ID is highlighted; a named point selector remains available when a small viewport cannot fit every projected label. Pointer presses on annotations do not reach the canvas or operate a cabinet.

**Compare with photo / השוואה לצילום** opens a responsive comparison of the selected model-wall elevation and the actual attached photograph. Model pins, photo pins, the point selector and previous/next controls share one selected ID. Photo-page changes retain the ID only when that photo actually contains its evidence. The source viewer has a defined aspect-ratio frame, separate exact source outlines and large callout buttons, original-file links, point zoom, and visible load/retry errors. It is reused by the house source gallery, which now starts on the inspected point. Original JPEGs and rectangle coordinates are unchanged.

The owner clarified that **K05 is not an electrical point**. Its marker is removed everywhere and its ID is retired without renumbering. **K06, K07 and K08 are sockets**, recorded as owner-confirmed identifications. The kitchen now contains nine observations: eight socket/cluster locations plus K09, whose exact fitting remains unspecified. The whole-house inventory has 48 observations.

K09 additionally has an owner-requested **proposed relocation** to the right inner side of the lift-up compartment above the oven. Its proposed centre is **165 cm** above the floor, at local `[5.422, 1.65, 0.25]` metres, with its face directed into the cabinet. The plate clears the illustrated oven, shelf, side panel and HL lift arms; the selected camera sees it through the open flap. Show access opens only `oven:lift-up`, preserving all other door/drawer states. The original estimated 115 cm wall location and exact photo rectangle remain separate evidence. The comparison shows a dashed original-position marker and a leader to the proposal. This is a visualization proposal; actual cabinet split heights, appliance requirements, cable reach and installation must be resolved with the electrician/cabinetmaker from the real equipment.

Validation includes the existing geometry/navigation checks and new compiled-React rendering/handler tests: real source JPEGs, synchronized identities, usable nonoverlapping phone-size photo targets, original-source zoom, corrected classifications, K05 removal, cabinet-side placement, mechanism clearance, an unobstructed ray from the access camera, and independent flap opening. Browser/mobile visual QA remains unavailable in this managed environment.


## Revision 20 — quiet labels and physical electrical fixtures

The detailed kitchen now starts with **Outlet names / שמות השקעים** off. The electrical layer renders white wall-mounted device bodies with recessed three-hole socket faces; K04 has two socket faces, possible controls use rocker geometry, and K09 remains a generic, unspecified connection cover. Device appearance is illustrative. The corrected observation IDs, source rectangles, estimated coordinates and K09’s 165 cm proposed relocation are unchanged. Physical mode has no all-point coloured halos or visible hit cylinders; only the selected point receives a fine outline. Optional labels paint only a small ID chip inside a transparent 44 × 44 pixel touch target, with names in tooltips/details. Source-photo IDs use the same quieter style.

**Cabinets / ארונות** has Normal, Translucent and Hidden modes. The detailed kitchen’s cabinet bodies, fronts, contents, appliances, worktops, island, stools, accessories and cabinet lighting form a separate furnishing set. Room walls, the window, floor and electrical fixtures stay intact. Translucent mode clones furnishing materials, reduces opacity, disables their depth writes and shadows, and leaves socket materials opaque. Hidden mode removes furnishings from rendering and picking. Neither mode moves geometry, changes any door/drawer state or affects finishes. Isolated cabinet inspection remains solid and usable. Plan/elevation furnishing layers follow the same viewing preferences while their device symbols remain available.

Electrical controls now sit above the model rather than over it, including a point selector for keyboard/touch use. With names off, screen-distance picking selects the nearest actual visible device; opaque cabinets/walls occlude it, while translucent and hidden furnishings allow selection. Saved designs, imports and global Close all preserve the two viewing preferences. Opening K09 access still opens only its flap.

Validation adds actual normal/translucent/hidden rendering and picking checks, unchanged opening transforms, separate room/fixture materials, ghost-material disposal, opaque-wall occlusion, independent nearby-point selection, double-socket geometry, default label-free React views, viewing-control handlers, diagram visibility and actual saved-state restoration. The complete test suite and production build are run. Browser/mobile visual QA remains unavailable in this managed environment.


## Revision 21 — service colours and more realistic surfaces

The same service palette is used throughout the whole-home model, room views, detailed kitchen, plan/elevations, source-photo outlines and legends: **red sockets, green possible switches/controls and blue water connections**. Actual model faceplates carry the category colour, including the kitchen with names switched off. Unidentified preparations retain amber; K05 remains excluded and K09 retains its proposed 165 cm cabinet-side connection and independent access flap.

The services layer adds 12 blue water markers in the kitchen, bathrooms/WC, utility and garden. Two clusters are visually identified in the supplied kitchen/service-porch photos, with source rectangles. The other ten follow the existing modeled sanitary/appliance fixtures and are explicitly identified as **assumed fixture connections**, rather than photographed or measured wall preparations. The dryer receives no water supply marker. No gas or drainage feature is relabelled as a water supply. Water visibility has a separate saved preference inside the services layer. Each marker opens details; photographed points display their actual source image. The detailed kitchen uses the inverse of the same home coordinates, retains optional names and cabinet ghost/hidden modes, and supports label-free selection of its water valve.

Shared metre-scaled surfaces now supply colour, fine bump and roughness maps for plaster/paint, porcelain, cement, wood, fabric, exterior limestone, terrace paving and ground. Mapping respects physical surface dimensions and the continuous world grid of the original/extended paving. Texture resources are cached within a scene and disposed when it is replaced. Product codes, selected finish colours, scheduled tile sizes, room geometry and independent openings are unchanged. The patterns are procedural illustrations, not manufacturer texture scans. The home and kitchen now also use a prefiltered room-light environment for metal/glass reflections, softer shadow bias and more neutral sky/ground fill.

Validation covers service colours on actual device meshes, photo-versus-layout water provenance, independent visibility/persistence, water picking with hidden cabinets and wall occlusion, metric texture mapping/resource disposal, actual React controls and source panels, plus all existing layout, opening, hood and appliance checks. Supported browser/mobile visual QA remains unavailable; no photorealistic or exact-photo-match claim is made.


## Revision 22 — corrected plumbing registration and material rendering

W01 previously overlapped the K07 electrical source box and was placed about 1.37 m away from the modeled sink. Its source rectangle now identifies the dark water loop beneath K06 and above the sink drain in photo 1. Its model anchor is derived from the sink cabinet centre (local x=1.91 m), not an unrelated plan coordinate. Both illustrated supply pipes and the blue two-valve marker share this anchor, 55 cm assumed centre height and 8 cm spacing to either side. The whole-house coordinate is the exact inverse of the detailed kitchen transform. No change revives K05 as an electrical point. K09's requested 165 cm proposed cabinet-side location is preserved.

All 48 electrical observations and 12 water markers were checked against their existing wall spans/openings and source references. The ten fixture-based water estimates now register to the actual back wall of the modeled fixture, where one exists, avoiding door/window apertures. The outdoor kitchen retains a fixture-back plumbing entry because no house wall hosts it. These estimates remain visibly distinct from photographed supply points; their exact rough-in coordinates are not measured. No additional gas/drain fitting becomes a water point. The selected water marker now participates in the same photo/model comparison as the kitchen electrical points, and source galleries include the two photographed water clusters.

The rendered materials now load the actual raster asset `public/materials/interior-atlas-r22.png` for quartzite, oak, porcelain and linen detail. Bitmap luminance supplies albedo variation, fine relief and roughness while preserving user-selected finish colours. The generated illustrative atlas is not a product scan; its exact prompt and production method are in `public/materials/README.md`. There is a procedural fallback during loading or if the image is unavailable. Scene disposal guards asynchronous updates.

Both renderers add contact occlusion and antialiasing before tone mapping, with bounded pixel density. Transparent cabinet mode bypasses ambient occlusion; glass, invisible pick targets and service annotations do not become solid occluders. Camera projection changes are synchronized with the AO pass. A shared **Materials & depth / Light rendering** selector and **Clean view / Show controls** button are available in both simulators. Clean view expands the canvas and keeps the return control available. Preferences persist in saved designs and Close all. Image exports use the same rendering path as the display.

Validation checks the kitchen supply geometry against the cabinet and source region, all service wall/opening placements, photo/model water comparison, real control handlers and saved app restoration, material atlas availability/runtime extraction, postprocessor sizing/fallback/disposal, and all existing layout/opening/appliance tests. Browser/mobile visual verification is still unavailable in this managed environment; these checks do not certify a photographic match.

## Revision 23 — use the owner's ordered floor models

Rechecked the attached Harash order, including the 100/100 MI402439 matte-white lines on pages 1–2, YUCLCE33 R10 and EGEHDA15 Habitat Dawn on page 2, and the distinct YUCLAC33 R11 shower line on page 4. Previously the model stored those product IDs but the dry floor and terrace could still receive generic generated porcelain/oak detail. All four now have isolated product material profiles linked to the schedule. Their albedo/relief/roughness maps have separate cache entries, physical tile-sized repetition and explicit SKU/source metadata. Generic asynchronous atlas loading cannot overwrite an ordered floor. The home and detailed kitchen use the same MI402439 definition. Existing and extended terrace paving still share one material and a continuous grout grid.

The floor controls now identify the selected product, SKU, size and order source. A targeted **Apply ordered floors throughout home** action restores the documented dry/wet/terrace choices after finish experiments, preserving every other setting and opening state. Experimental finishes remain editable. Saved-design schemas and migrations are unchanged.

Exact SKU/name searches did not yield an authenticated MI402439 product image. The supplied order has text specifications, not tile photographs; the installed-floor photos have construction dust and uneven lighting. Therefore screen shade and fine surface pattern remain labelled as illustrative. No substitute manufacturer image or generated scan is presented as the exact ordered tile. Validation covers real scene material assignments, SKU-specific map separation/scale, shared home/kitchen rendering, terrace continuity and targeted floor restoration. Browser visual QA remains unavailable.


## Revision 24 — actual photographed MI402439 and Vegas 70 Casablanca

The new owner attachments directly resolve the main-floor appearance and selected replacement sink. The first tile photo visibly identifies MI402439, 100/100 matte white, matching the order. The second shows the real varied, speckled surface. All three inputs are retained byte-for-byte in `public/materials/owner-products`, with original filenames, SHA-256 hashes and source dimensions in `owner-product-references.mjs`.

MI402439 now loads a label-free 880×880 region at original pixel coordinates (210,80) from `MI402439-tile.jpg` and samples it at 1024² in the renderer. Its colour map retains the actual photographed RGB; it is neither generated nor converted to a nearly white generic material. The material tint is white so it does not multiply the source by an assumed floor colour. The earlier small procedural pattern has been removed for this product. During loading only a flat mean-photo-colour placeholder is shown. Height is flat: no unmeasured surface relief is inferred from the photo. Matte roughness is an illustrative rendering parameter. Tile joints stay at 100 cm in both simulators, and the other ordered flooring products keep their separate schedule-derived definitions. The photo is not a calibrated material scan; photographed lighting and estimated grain scale are explicitly disclosed.

The floor controls now show the same sampled photo area with links to the full original and photographed SKU label. A new original-product gallery covers both tile photos and the selected sink screenshot. Product source links work for both PDF schedules and image-based sources. The earlier revision 23 absence-of-product-photo notes describe the prior state and are superseded for MI402439.

The sink is now SCHOCK / Aquatop Vegas 70, Casablanca 98, CRISTADUR composite, replacing the generic stainless basin. Nominal 690×520 mm envelope follows the owner's screenshot; 220 mm depth, 700 mm cabinet and flush installation are confirmed by Goma's product page. Casablanca 98 is explicitly selected by the owner and listed in Avivi's Vegas product page. Current Goma colour listings differ and do not silently replace the owner's chosen legacy colour.

- Goma: https://www.gome1981.co.il/catalog-id.aspx?StoreProductId=204&storeSubCategoryId=13
- Product drawing link: https://www.gome1981.co.il/images/vegas1.jpg
- Casablanca reference: https://avivi-e.com/vgas

The drawing image URL is retained for review, but direct asset download returned HTTP 403 and its dimensions were not transcribed. Undimensioned bowl radii, slopes, inner opening and 680×510 mm visual cutout are therefore labelled as approximations, not factory cutting data. No exact CAD claim is made. A shared hollow rounded bowl, rear ledge with tap hole, overflow and perforated metal strainer now appears in both kitchen views. Both countertops have real openings; the whole-home sink cabinet is hollow where the basin sits. The cabinet centre and photographed water-supply anchor are unchanged, while the illustrative waste trap connects below the new deeper bowl and the tap sits on its rear ledge. Two sink doors remain independent.

Validation checks exact attachment hashes, label-free photo sampling, retained coloured RGB, actual material-map assignment and 1 m repeat, shared home/detailed sink geometry, nominal envelope, open bowl depth and real countertop cutouts, source/control rendering and all prior house, appliance and opening behaviours. Supported browser visual QA remains unavailable; source/geometry/React checks do not substitute for a calibrated photographic match.

## Revision 25 — cross-check every apartment product against the Harash catalogue

The owner's 41-page `file2742.pdf` is retained byte-for-byte as `public/house/harash-catalog.pdf`. Every one of the 19 existing product records now has an explicit catalogue outcome: exact SKU, named model, family/partial match, unresolved selection, unidentified, or an independent owner/Hercules source. Native embedded product images, PDF object numbers, image/PDF SHA-256 hashes, and source dimensions are recorded in `public/materials/harash/manifest.json` and the source registry. Original transparency masks are reconstructed with MuPDF for four product cutouts; their unchanged native image bytes are also retained. No generated texture is substituted for a matched product.

- Classico Cement R10/R11: actual catalogue image, page 13. Ordered 30×30 and 33×30 cm tile sizes remain distinct, with separate finish roughness and shared source colour. The catalogue names products without order SKUs, so these are named-model matches.
- Habitat Dawn: page 16 native wood-look plank image on original and extended paving, with its grain rotated to the 60 cm tile axis. The physical 15×60 cm grid and continuous paving material are preserved.
- Mona Grey Decor: page 19 broad-banded grey image replaces the generic cement wall shader, at horizontal 75×25 cm repetition. Cladding stops at the existing RG/RG1 specification heights. Relief is flat because no measured height map exists.
- Sky Rimless: page 26 confirms 52 cm depth. All three wall-hung WCs resize toward the room while retaining their back-wall anchors; ceramic bodies and slim closed seats are refined from the photo. Width/height stay explicitly estimated, and the contractor's unspecified flush plate remains generic.
- Eco Cubic: page 27 square 160×70 bath with a real recessed bowl and molded rim. Hidden support and automatic fill/waste are not falsely identified from the different waste fitting pictured nearby.
- Caspi/Sonic/Amon guest basin: page 27 groups these names under one 33×29 cm wall basin with a rear tap deck. The actual model is resized, its wall anchor is preserved, and the width/depth inspector now identifies catalogue-derived dimensions. Mounting height and trap details remain estimated.
- Gabriel / Wrangler: page 31 Gabriel is suspended with doors; page 32 Wrangler is suspended with two drawers. Both bathroom vanities are wall hung with recessed bowls. The main-bedroom Wrangler now has two independent drawer motions. Old saved `ensuite-vanity:left/right` states migrate to `drawer-0/1`, and global Close all still clears everything. The general bathroom order lists both models beneath a “doors” heading without a clear cancellation, so Gabriel is an explicitly unresolved representative, not an asserted final selection. Its ordered white finish is preserved even though the reference photo is graphite.
- VR001221: the exact SKU is printed on page 39. Both kitchen scenes share a refined brushed gooseneck tap with pull-out head, side control and upright lever. The catalogue has no body dimensions, so height/reach remain estimates. The selected Vegas 70 Casablanca 98 sink, countertop holes, cabinet centre and supply plumbing are retained.
- Premium basin/mixer, Dror rail and round outlet are family-level references only (pages 35–38); ordered chrome/nickel are preserved rather than replaced by graphite variants. Only the round 35 cm arm matches the shower-head line; the ordered round Ø20 chrome head stays unchanged. Model 109 mirror and PANEL124 skirting are not falsely matched to similar catalogue photos. MI402439 continues using the owner's actual tile photograph and SKU label because no exact catalogue match was established.

The home now has a direct **All products & Harash catalogue** entry. Product cards show every match level, native source thumbnail, explanation and original order link. Each **Compare catalogue** button opens the relevant portable page preview and highlights that product's actual image rectangle. The full original PDF is linked at its page. All products remain accessible from any selected room/item, and the detailed kitchen also shows its exact tap catalogue reference.

Validation: 132 automated checks passed, including byte identity/provenance, physical texture repeats and plank direction, actual coloured RGB loading, wall cladding assignments, anchor-preserving size changes, open-bowl ray casts, independent drawer migration and closure, shared kitchen tap geometry, real React source-navigation handlers and highlighted catalogue pages, and all prior house/opening/service/appliance checks. Production build is verified by the Sites build helper. Browser/mobile visual QA remains unavailable in this managed environment; these checks are not a calibrated photographic certification.

## Revision 26 — room-specific flooring audit and dry-wall cladding correction

Re-read and visually reviewed the actual Harash order pages 1, 2, 4 and 5. Each of ten order-line rectangles was checked with MuPDF text extraction: both the SKU and printed tile dimensions occur inside its own highlighted rectangle. The source is still the unchanged original full order PDF.

`home-finish-schedule.mjs` now records the product, physical finish ID, page and normalized source rectangle for each scheduled space:

| Space | SKU | Tile size | Order page |
| --- | --- | --- | --- |
| Living room and kitchen | MI402439 | 100×100 cm | 1 |
| Main bedroom | MI402439 | 100×100 cm | 1 |
| Bedrooms 1, 2 and converted home office | MI402439 | 100×100 cm | 1 |
| Safe room | MI402439 | 100×100 cm | 2 |
| General bathroom | YUCLCE33 R10 | 30×30 cm | 2 |
| Main bathroom outside shower | YUCLCE33 R10 | 30×30 cm | 4 |
| Main shower area | YUCLAC33 R11 | 33×30 cm | 4 |
| Guest WC | YUCLCE33 R10 | 30×30 cm | 4 |
| Utility room | YUCLCE33 R10 | 30×30 cm | 5 |
| Terrace | EGEHDA15 Habitat Dawn R10 | 15×60 cm | 2 |

There is no different bedroom tile in this supplied order. The hall is explicitly identified as a continuation of the public floor, not a separately documented order line. Quantity, waste and spare lines are not used as room dimensions. The R11 shower remains a separate actual geometry/material overlay within the R10 bathroom floor; its unusual printed 33/30 size is preserved.

Previously saved finish experiments could survive the earlier floor updates. Both real app loaders and JSON import paths now perform a one-time finish-schedule migration: pre-revision-26 floor settings restore the reviewed room-specific products and kitchen MI402439 floor. Independent doors/drawers/shutters, services, lighting, render quality, wall colours and furniture choices are preserved. The separate finish-schedule marker allows newly chosen explicit experiments to persist normally. The home kitchen proxy uses the same kitchen-floor migration. Model-save schemas remain unchanged.

Mona wall cladding is now restricted at the control, normalization and renderer levels to the three documented spaces: general bathroom, main bathroom and guest WC. A legacy or manually supplied living-room Mona value cannot create tiled living walls. Ordinary walls use restrained painted-surface detail; the existing ivory display shade remains an illustrative colour, not a specified decorative product. The room design panel says when no wall cladding is ordered for a room.

Every room's floor card now opens its own highlighted order line: utility opens page 5 rather than the generic R10 page 2, safe room opens page 2 rather than the generic dry-floor page 1, and main bathroom shows separate R10 room and R11 shower cards. The product inventory includes a complete flooring-by-room table with working source buttons. The full order PDF remains accessible at the selected page; catalogue and owner-photo references remain available independently.

Validation: all 138 automated checks passed, including actual React app restore, old/current finish migration, per-room source-button handlers and highlighted PDF rows, dry-room cladding guards, actual scene SKU assignments and shower overlay, preserved openings/services, and every earlier geometry/material/appliance check. Browser/mobile visual QA remains unavailable in this managed environment. The production build is run by the Sites packaging helper.

## Revision 27 — photographed flooring with physical joints and neutral rendering

The former mirrored repeat produced symmetrical copies of the photographed pattern; one-pixel guide lines exaggerated joints at distance. Ordered floors now use a shared physical-material shader. Square tiles rotate in quarter turns; rectangular Classico R11 and Habitat planks use half turns only, preserving their ordered dimensions and the terrace grain axis. No mirrored faces or invented tile patterns are generated. Source sampling uses continuous UV derivatives for mipmaps and 16× requested anisotropic filtering, clamped to the device's supported limit.

The owner's original MI402439 JPEG and label are unchanged. Runtime preparation removes only a fitted broad linear lighting slope, bounded to a 0.85–1.15 gain in linear light. It retains the actual small flecks and mottling without blur, sharpening or colour replacement. This is an estimated photo-lighting correction, not a calibrated manufacturer albedo. Catalogue colour pixels remain unchanged. Printed flecks have no invented bump height.

Joints are shaded on each floor surface instead of drawn with screen-space lines: estimated 2 mm indoors and 3 mm on terrace planks, with shallow 0.4–0.6 mm recessed edges. Analytic pixel coverage keeps distant joints proportionally thin. Grout colour, width, bevel, optical roughness and reflectance are rendering estimates; the order supplies tile dimensions, not these installation measurements. Matte dielectric reflections have no clearcoat. Wall-decor mapping and trial finishes retain their existing behaviour. Original/extended paving still shares one material and world grid.

Both viewers use Three's neutral tone mapping at the same unit exposure, reducing the former filmic lift of photographed midtones. The floor card includes an expandable original-photo versus prepared-texture comparison, with the exact same cached pixels used by the renderer. It labels the prepared view as before room lighting and retains the full original and SKU-label links. All per-room products, furniture, services, navigation and independent opening states are preserved.

Validation: all 141 automated checks passed. Added checks exercise broad-light correction, fine-fleck contrast, colour ratios, immutable input pixels, actual physical material wiring, and both viewers' colour pipeline. Native EGL/GLES3 compiles and links the full patched Three physical shaders with shadows, both with and without the room environment. Pixel readback verifies 2 mm joint coverage and non-mirrored square/rectangular rotations. The native shader test is optional when Python/EGL is unavailable. Browser/mobile visual QA remains unverified: the managed preview supervisor is unavailable in this environment. Technical checks do not certify a calibrated photographic match. The production build is run by the Sites packaging helper.

## Revision 28 — additional kitchen/hall electrical evidence

Reviewed the newly attached `277903.jpg` and the 32.33-second `walkthrough.mp4`. The uploaded video is byte-identical to the portable video already supplied with the simulator; it is not counted as new point observations. The original photo is copied unchanged to `public/house/electrical/kitchen-hall-277903.jpg`, with dimensions, SHA-256 and provenance recorded.

The photo identifies existing locations K06 (beside sink preparations), K08 (red work-wall box/cluster), K09 (upper preparation near the end of the work wall), K10 (low socket below K09) and H02 (high socket to the right of the hall entrance). K07 is obscured by people in this view and receives no invented source rectangle. No new IDs or circuits are inferred; there are still 48 electrical box/cluster locations. Existing photo/video evidence remains accessible.

H02 was incorrectly hosted on `wet-north`, the kitchen work-wall line. The additional angle and video show it on the separate public/living-facing wall to the right of the hall mouth. Its host is now `bed-a-north`, at estimated plan station 876 and on the living side, with room assignment `living`. The former 220 cm assumed centre height is retained as an estimate, not presented as a measurement. Its stable ID is unchanged and its inspector explains the correction. K09 remains a separate unidentified preparation with original observed height and position preserved, plus the owner's existing 165 cm proposed oven-compartment connection.

The detailed kitchen comparison now derives its photo tabs from actual point evidence and includes **Additional view**, with synchronized source selection, original-file links, zoom and a note distinguishing the exterior-to-kitchen H02 location. The whole-home gallery marks all five locations; the kitchen comparison marks the four kitchen locations. Photo tabs wrap on small screens. Quiet service colours and all independent cabinet/door/drawer states are unchanged.

Validation: 144 automated checks passed, including exact new-photo/video hashes, five non-overlapping source rectangles, retained earlier evidence, unchanged point counts, corrected H02 host/normal/actual clickable geometry, preserved K09 access and relocation, actual React source-tab handlers, gallery selection and all earlier material/navigation/appliance checks. Browser visual QA remains unverified because the managed preview supervisor is unavailable. The production build is run by the Sites packaging helper.

## Revision 32 — clean walking arrows and safe-room wardrobe placement

Hide all controls retains the four walking arrows in first-person mode and the existing Show controls button. The same direction pad stays mounted outside the hidden interface layer; the map, WASD caption and other controls remain hidden. Clean-view arrows have 44 px touch targets and sit above the device's bottom safe area. Pointer release, cancellation and capture loss stop movement. Other home and kitchen views retain their existing clean-view behavior.

The safe-room wardrobe slides approximately 1.13 m south along its existing west wall, with its end panel next to the bed/headboard wall and approximately 20 mm clearance for skirting. Its dimensions, orientation, independent doors/drawers and the bed placement are unchanged. Walking collision bounds and the plan use the same updated furniture position. Checks cover both safe-room door swings, wardrobe openings, bed/window clearance and the route into the room.

Browser/mobile visual QA remains unverified because the managed preview supervisor is unavailable. React visibility/handler checks and actual Three.js geometry/navigation checks cover these changes; the Sites workflow runs the complete suite and production build before publication.

## Revision 33 — kitchen controls, corrected window, VR aisle and movable room furniture

Kitchen controls reserve separate grid rows above and below the model in all four views. Title/fullscreen, wrapped tools, services options, display/VR controls, zoom and view tabs no longer depend on overlapping absolute offsets. On phones, names and water options occupy separate columns, while cabinet visibility, point selection and colour key take complete rows. Short screens can scroll the viewer rather than clip its controls. Inspectors stay within the model row. Hide all and Show controls still work without unmounting the scene. A CSS cascade regression check matches the real rendered ancestor tree at 320, 393, 768 and 1280 px in both languages and all views; it does not claim browser pixel verification.

The detailed kitchen window now follows the architectural opening and apartment opening schedule: 900 × 1250 mm instead of the former 390 × 1000 mm placeholder. Its approximate 100 mm offset from the inside corner follows the RG1 plan stations, and the 1100 mm sill remains an estimate. Plan, elevation and actual wall opening share the same data. Two dark, double-glazed sliding sashes replace the opaque coloured panel; frame and sill remain within the wall plane. Frame colour is independent of the cabinet handles. The existing upper-cabinet origin remains 1090 mm, beyond the window's approximately 1000 mm right edge.

VR navigation previously used the bounding rectangle of the L-shaped countertop, incorrectly blocking the clear working aisle. The countertop now supplies two physical collision boxes matching its two legs. Joystick walking traverses the space between the island and work run. A controller pointed at an accessible floor shows a green ring; pressing its trigger teleports there while preserving tracked eye height. Occupied surfaces and opaque obstructions cannot become destinations. Door/drawer selection and normal desktop camera restoration remain independent. The same floor-target feature uses current home walking obstacles in the whole-home viewer.

Beds, desks and wardrobes in the bedrooms, converted bedroom/home office and safe room have Move and rotate controls. Select furniture in 3D, the floor plan, or Room design → Arrange furniture. Arrows move in plan directions by 5, 10 or 25 cm; Rotate turns 90° and Original position restores the revision-32 default. Moves stay inside the room and reject overlaps with other furniture or the doorway reserve. Overrides save in the existing home settings, survive export/import and Close all, and update the 3D scene, floor plan, minimap and walking/VR obstacles together. Open-front states and ordered finishes are retained. These room-fit checks are illustrative and are not a construction or full door-swing clearance certificate.

Browser/mobile visual QA and physical-headset testing remain unverified because the managed preview supervisor and a headset are unavailable. Automated checks cover actual Three.js openings, source-to-window dimensions, joystick/floor-target movement, furniture persistence/collisions, component controls and the existing regression suite. The production build is run through the Sites workflow.


## Revision 34 — one home panel and direct furniture dragging

The home interface has a compact header, room/view selectors and three primary actions: Rooms, Move furniture and Options. The default view has no floating title, inspector, map, legend or render/VR bar. Secondary settings, source photos, save/export, lighting, language, services and VR remain available in Options. Room-name buttons now start hidden under a separate saved Show room names preference, without changing old label settings.

Only one panel can be open: rooms/design, options, furniture editing or item details. It reserves a grid row below the model on phones and a separate column on wider screens. The panel scrolls within its own height; its close button remains reachable. The walking pad is hidden while a panel is open and walking keys/routes pause, so the map, inspector and walking arrows no longer stack. Hide all still leaves the four walking arrows and Show controls available.

Move furniture selects an editable bedroom or safe room and opens that room's enlarged plan. Select Bed, Wardrobe or Desk, then drag its highlighted footprint directly with a finger or mouse. Alternatively use the four 10 cm arrows, Rotate 90° and Original position. Done editing returns to a 3D room view. Selecting an editable item elsewhere offers the same explicit action; dimensions remain collapsed in item details.

Dragging transforms screen coordinates through the actual SVG view matrix, remains stable when React replaces handlers, captures the pointer, and stops on release/cancel/capture loss. The previous room-fit, furniture and doorway checks reject blocked destinations; the last valid placement remains. Error space is reserved so feedback does not resize the plan during a drag. The existing local save/import/export and shared plan/3D/walking/VR obstacle updates are retained.

Validation covers the rendered default controls, single-panel states, focused editor choices/handlers, CSS cascade at 320, 393, 768, 932 and 1280 px including a short landscape viewport, scaled pointer dragging, cancellation and saved positions. These checks are not browser pixel verification. The supported managed preview service is unavailable in this session, so phone/browser visual QA remains unverified; the complete automated suite and production build run before publication.


## Revision 35 — furniture sizes, fronts/services and yard planning

In **Furniture & sizes**, select a bedroom/safe-room bed, desk or wardrobe, then expand **Edit dimensions**. Width/depth/height are entered in centimetres and applied together. The existing room/furniture/doorway checks reject invalid results, retaining the last valid arrangement. Sizes update actual meshes, plan footprints and walking/VR obstacles. **Reset dimensions** restores the original size while retaining the current placement; **Original position** resets the item entirely. Bed width/length refer to the mattress, and changing a small bed's width does not add bedside tables. User sizes remain explicitly marked as planning choices, survive local saves, JSON import/export and Close all, and never modify the original furniture specifications.

The room plan marks each item's local positive-Z front/access edge and arrow, transformed with its actual rotation; for a bed this is the foot end. Red sockets, green possible switches/controls and amber unidentified preparations are projected from that room's existing source inventory with leaders to unchanged wall anchors. IDs are not written over the plan. Selecting a device shows its estimated height/classification and opens the annotated original source; an expandable native selector provides an alternative to tapping small plan glyphs. The electrical layer appears in furniture editing even if the general service layer is hidden, without changing that saved preference. Hide all removes these guides and interactions.

Select Garden/Terrace and **Plan yard**, or use **Options → Plan yard**. The same one-panel workspace shows a focused plan and choices for Shed, Pergola or Fence. Drag the selected shed/pergola or use 10 cm arrows; edit outer width/depth/height and apply. Resize keeps the far shed corner / balcony edge in place. The shed stays in the rear planning area and rejects overlap with the fixed chamber access square, safe-room window strip, both condenser bodies/front reserves, exit recess/window court, house or plot limits. Its two upright 65×70×185 cm appliance placeholders and shelves adapt within its new body, and its actual door/walls/appliances use the updated navigation bounds. The pergola stays inside the previously selected paving-extension strip; its posts cannot intersect the purchased outdoor kitchen. The new fence's total height and colour can change while boundary runs, assumed stone curb and existing neighbour wall remain fixed. **Done editing** returns to the relevant 3D object. Each element has its own reset.

The chamber location remains plan-derived and not photo-verified. The 160×160 cm access square, window strip and AC clearances are estimated planning aids, not certified installation requirements. Shed appliance models remain unknown. Edited dimensions and colours are simulated choices rather than verified construction measurements. Original source photographs, catalogues, kitchen geometry, fixed architectural openings and source layout objects are retained. The shared settings resolver feeds the yard plan, whole-home plan, 3D builders, item facts and walking/VR obstacles, including imported designs.

Checks cover centimetre form handlers, actual resized furniture meshes/obstacles, persistence/reset, front rotations, room-specific electrical IDs and clean-view behavior, one-panel yard UI and CSS across phone/tablet/desktop widths, fixed source geometry, rejected reserve overlaps and actual shed/pergola/fence meshes. The managed preview supervisor is unavailable in this session, so browser/mobile visual QA and physical-headset testing remain unverified. The complete regression suite and production build run through the Sites packaging workflow before publication.

## Revision 36 — restored source and photographed lighting

Continues the saved revision-35 commit `3232b23a69d2f68e7339e0d89bec644d59b4f511` of the same existing Site. Furniture dimensions/front guides, room-specific electrical editing, yard design, fixed chamber/window/AC reserves, materials, mobile controls and VR navigation are retained.

Options → Lighting from source photos, or Rooms → Design → Lighting, lists 12 observed luminaires/lamp holders: four in the public/kitchen space, one in the provisionally assigned second bedroom, one in the main sleeping area, one in the provisionally assigned office, one in the safe room, and four exterior facade lights. This is an evidence inventory, not a complete electrical plan or purchase count. Multiple photos of the same holder are not counted twice. Red ceiling caps, vents, sprinklers and neighbouring apartment lights are not treated as this apartment's lighting. Extra fixtures cannot be placed reliably in bedroom 1, the hall, bathrooms, laundry or guest WC from the existing ceiling-cropped views.

Each point opens its original photo with a small source rectangle and optional zoom. Available room/video timestamps are provided for context; the still photo establishes the identified fitting. Point locations, numbered room assignment where flagged, ceiling/fixture heights, cable drops and fixture dimensions remain visual estimates. The generic disk fixtures previously added at every room's walking position are removed. Lighting now follows only this source inventory in daylight, evening, room, overview and walking/VR scenes; evening illumination is illustrative. Small gold markers and plan glyphs have no floating names. Hide all removes annotations and leaves physical fittings; the separate Show lighting points setting is persisted and can hide the layer altogether.

Kitchen Studio renders its two observed ceiling holders at the inverse of the whole-home kitchen transform. Its pre-existing assumed room ceiling remains 260 cm (whole-home ceiling 275 cm), and its source inspector discloses the local estimated connection height. The points also appear on the kitchen plan, with source-photo comparison available in the existing services sidebar. No new floating toolbar or overlapping inspector is introduced.

Validation covers source existence/rectangles, unique identities, within-room ceiling placement, uncertainty, 3D picking, visibility, clean-save restoration, kitchen/home horizontal transforms and retained furniture geometry. Managed browser preview remains unavailable (`sites-previewd mailbox is unavailable`), so mobile/browser visual QA and physical-headset checks could not be completed in this session.


## Revision 37 — immediate fence colour updates

Choosing a fence or pergola colour now immediately updates the saved yard design, yard plan and 3D material instead of waiting for Apply changes. Dimensions retain their explicit Apply action. Changing colour no longer changes the form key, so the native picker stays mounted and unsaved dimension fields are retained during colour selection. The input stays controlled by the current selected element, including reset. Fixed boundary runs, stone base and existing neighbour wall retain their original materials.

Regression coverage exercises the actual colour-input handler before any form submission, saves/reloads the result and checks the rendered plan stroke and actual fence slat/post materials. It also verifies that colour selection keeps the form identity stable and that resetting restores the original colour.


## Revision 38 — planning workflow improvements

1. **Live yard editing:** the existing yard plan now shares its scene row with an isolated live 3D view of the selected shed/pergola/fence. Both consume the same yard settings. Desktop/tablet use columns; portrait phones use rows, with the optional preview toggle inside the workspace. No toolbar floats over the model. Hide all presents the yard model only, with the existing restore control.
2. **Undo/redo:** both studios keep up to 50 in-session design steps, including furniture/yard edits, colours, finishes, lights, openings, resets, imports and alternative loading. Continuous drag/colour/light changes within 700 ms coalesce. Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z (or Ctrl+Y) work outside form fields. View, selected item, interface visibility and language changes are not recorded as design edits. A new edit clears redo. Full alternative loads restore the companion studio state on undo/redo, including Close all. History is session-local; named alternatives are the durable browser-local snapshots.
3. **Furniture assistance:** drag snapping suggests 2 cm from modeled room boundaries or 5 cm from adjacent footprints within 12 cm. Every candidate passes the original room/furniture/door-reserve validator; blocked targets do not bypass it. Disable snapping in the room editor. Directional guides and an expandable panel show approximate plan-view gaps to walls/adjacent furniture and nearest door/window opening. They use the same rotated footprint used by navigation, including modeled bed-frame/accessory allowances. Window height and door swing are not certified by these gaps.
4. **Alternatives:** Home Options or Kitchen Details → Alternatives saves up to 12 named home+kitchen snapshots in local storage. Load, rename/update, confirm removal, compare two mini-plans and changed categories, export and merge JSON backups. Storage errors are shown without claiming successful saves. Import does not replace existing IDs or exceed the limit. This is browser-local storage, not cross-device cloud synchronization.
5. **Evidence:** inspectors distinguish plan/specification basis, photo-observed identity, estimated coordinates/sizes and user choices. Photographed services do not acquire measured coordinates. Fixed fence boundaries retain plan provenance when colour/height are edited. Furniture changes identify selected dimensions separately from unchanged illustrative positions.
6. **Per-light controls:** the existing lighting/source panels now expose enable, 0–100% brightness and 2700/3000/4000/6500 K for each observed light. Actual point-light output and emissive materials use each selected value independently. Default fixtures illuminate in evening mode; a manually edited enabled light can also be previewed in daylight. Hidden lighting is revealed for manual previews. Shared light IDs synchronize between Home and Kitchen Studio. No physical wiring/circuit mapping is inferred.
7. **Planning sheet:** download an offline HTML document with inline home/kitchen SVGs, optional current 3D capture, furniture sizes/coordinates/rotation/door gaps, proposed yard sizes/colour, all service points and their evidence/uncertainty, and light settings. The document has a print / save-as-PDF button, RTL Hebrew and landscape A4 print CSS. The browser performs PDF saving; the download itself is HTML. Source files and measured on-site coordinates are not invented. Text values are escaped before export.

Validation covers history branching/grouping, paired snapshots and persistence, alternative storage/update/backup/error handling, actual snapped footprints/clearances and collision rejection, source-vs-estimate badges, actual per-light Three.js colours/intensities, print/export contents, real JSX event handlers, split yard rendering and clean-view control visibility. The existing JSX test harness now writes all generated chunks because printable exports are lazy-loaded. Managed browser preview remains unavailable (`sites-previewd mailbox is unavailable`); browser/mobile visual QA, print-dialog pagination and physical-headset checks remain unverified.

## Revision 39 — repeat electrical audit and uniform photographed flooring

Reviewed the complete available 32.33 s portable walkthrough at half-second intervals, with quarter-second follow-up around the hall entrance and office. The uploaded `walkthrough.mp4` is the existing 540×960 portable derivative (SHA-256 `f7326c3dd4f89d954a961f9e2f537a91a6d84d9acf118144579437e5a79e74a3`); no new full-resolution original was available in this turn. Existing full-resolution references remain unchanged. New exact-seek frames at 5.25 and 30 seconds are linked from each observation and recorded with their hashes in electrical provenance.

Three missed box/cluster locations are added, bringing the inventory from 48 to 51: O06 (visible low socket) and O07 (unidentified adjacent box) on the office's opposite/east side wall, and H05 (unidentified box) on the hall face of the guest-WC partition near the hall entrance. O06/O07 retain the existing provisional room assignment. The partly obscured low utility fitting cannot confidently be separated from plumbing and is not invented as a socket. No new fitting is claimed in the guest WC or en suite. K05 remains excluded; K09 retains the owner's proposed oven-compartment relocation.

The continuous pan and owner's new screenshot `01-302046.jpg` show that existing L01–L03 belong on the south living-facing partition between the slider and hall mouth, not on the north wall. Stable IDs are retained, side/normal corrected, and the additional screenshot is included byte-for-byte with three source rectangles. L01/L02 lateral order follows the photo. Horizontal offsets/heights remain estimates, not field measurements. All 51 fixtures use the existing shared 2D/3D layer and source inspection; no new floating controls are introduced.

Rechecked the web using the exact MI402439 code and the photographed “שיק גרניט לבן מט” name. No authenticated exact-SKU manufacturer/product image was found. The supplier root `https://harash.co.il/` returned 403; the indexed Harash housing catalogue `https://greenbook.co.il/content/pcard/file2742.pdf` lists related Chic products without establishing this SKU. These are not used to substitute another tile. The unchanged owner photograph and label remain authoritative.

The prior plane-only lighting correction left a centre hotspot and dark perimeter baked into every repeated tile. The shared material preparation now estimates a quadratic illumination field plus a broad smoothed residual, with neutral linear-RGB gains bounded to 0.4–2.5. Only the illumination estimate is smoothed; photographed output pixels retain their small real flecks and colour ratios. No dark border, artificial grain, bump, or external lookalike image is added. Original files, metric 100×100 cm tile grid, thin physical joints, distinct wet/shower/terrace products and home/kitchen material sharing remain intact. This produces uniform material colour before scene illumination; it is still an uncalibrated photo-based estimate. The source comparison displays the exact cached material pixels used in both scenes.

Validation: all 202 checks passed with two test workers, including exact source hashes/rectangles, all real wall spans/openings, independent clickable 3D fixtures, retained K09 access, shared home/kitchen material loading, actual photographed-tile brightness uniformity, preserved fine flecks/colour ratios, and native EGL/GLES3 shader compilation. The unconstrained parallel run exhausted the native shader subprocess time allowance; the isolated shader run and complete two-worker rerun passed without changing its timeout. Browser/mobile visual QA remains unverified: the managed preview supervisor is unavailable. The Sites helper runs the production build and source packaging.

## Revision 40 — entrance service cabinets from the owner's new recordings

The new originals `298243.jpg`, `298242.jpg`, `298241.jpg` and the complete 5.644729-second `298240.mp4` are retained unchanged under `public/house/entry-services`, with SHA-256 hashes and display sizes. The video shows the closed-door sequence beside apartment door 4, not the inside of every bay. Still photos show the blue/grey vertical pipes with capped inspection fittings and clamps, and a white tank marked 4 with black insulated pipework and lower connections. Model/capacity, pipe function/diameters, hidden connections, and contents behind unopened doors are unverified. No water meter, filter, non-return valve or hidden valve assembly is invented.

The public/common side of the existing entrance is added as context beside the kitchen return. The ground-floor building plan, page 3, supports the shared-shaft location, while the photo/video support its relative cabinet order: the nearest pair and a wider four-leaf bank. The three visual bays/six independently hinged leaves are an estimated subdivision; internal partitions in unopened bays are unknown. The common context extends beyond the private plot outline for visibility and does not enlarge the apartment/garden polygon. Cabinet positions, width/depth/height, tank shape, pipe/cap dimensions, support details, ceiling and finishes are explicitly estimated, not surveyed installation data.

Each leaf is clickable in the actual Three scene and saves independently in the existing `openParts`. The existing inspector offers open/close both, individual leaves, camera focus, a collapsible actual-photo comparison and full original-source links. The entrance video has its own 5.6-second title/note rather than inheriting the old indoor walkthrough's title. A small collapsible section under Options and the living-room detail panel provides direct access without floating toolbars. Plan symbols show each cabinet and leaf state, and select the same inspector/3D focus. Hide furnishings does not remove permanent service cabinets; Hide all retains the established restore behavior.

The existing apartment entrance is the only crossing into the common context in walking mode. Closed entry, cabinet bodies and open service leaves block movement; cabinet closure near the walking/VR position is refused until the viewer steps clear. Inspection actions do not operate or simulate opening actual plumbing fittings. Undo/redo, alternatives, import/export and global Close all retain the same state model and include all six leaves. Existing room topology, private plot outline, kitchen fixtures, K09 relocation, finishes and service inventories remain unchanged.

Validation: all 208 automated checks passed with two test workers. New checks cover immutable source hashes, explicit unknown contents, estimated evidence badges, six independent imported/saved leaves, global closure, actual Three hinges/picking/visible equipment with furnishings hidden and cutaway on/off, closed-entry and public-corridor walking collisions, and the real React inspector/plan/source handlers. The entrance UI check was repeated after the final hot-water facts copy update. Production build and source packaging use the Sites helper. Browser/mobile visual QA remains unverified because the managed preview supervisor is unavailable.

## Revision 41 — garden wall clears the entrance

The east neighbour wall previously followed the entire rectangular plot bound, including the public entrance notch. Its north endpoint now stops at RG1 coordinate (1277.82, 159.1), aligned with the kitchen return. Both the rendered wall and its stone coping, and the inspector's run length, use that corrected shared layout. The original plot, apartment walls, entrance and estimated service cabinet positions remain fixed; saved fence colour/height choices retain this corrected endpoint.

Validation: 19 targeted entrance, garden, yard-editing and home-model checks pass. The new spatial regression checks actual Three mesh bounds against both the original entry notch and complete cabinet alcove in overview, room and walking scenes, with cutaway on/off, closed/open cabinet leaves and a saved fence design. It also checks the walkable route in front of open cabinet doors across the former wall line. Production build/package uses the Sites helper. Browser visual QA remains unavailable because the managed preview supervisor is missing.

## Revision 42 — last water cabinet photo

The owner's new 298252.jpg identifies the last cabinet's interior: an upper water meter with tag 4 and closed blue cover, a lower meter with tag 3 and open blue cover, two visible valve handles per meter, left vertical pipework, exposed connecting pipes and a round floor drain. The original photo is preserved byte-for-byte with SHA-256 provenance and a new page 4 in the entrance gallery. The cabinet inspector compares directly to this photo, replaces the previous unknown-contents message and focuses the camera on the lower equipment. Both language variants and the plan identify the meters. The original cabinet ID `entry-unseen` and its two leaf IDs remain stable so existing saved opening states continue to work.

The equipment is rendered as inspectable Three geometry inside the existing cabinet envelope, including hanging numbered tags, differing cover states, pipe joints and drain grille. Positions/dimensions remain illustrative; unreadable meter readings, brands, diameters, hidden routing, filters and non-return valves are not invented. Dial ticks are marked illustrative and contain no reading. Clicking equipment inspects the cabinet; it does not operate plumbing. The other two cabinet interiors, entrance/garden coordinates, shared wall fix and access rules are unchanged.

Validation: 18 targeted checks passed across entrance geometry/evidence, garden and home-model navigation, plus the real React inspector/plan/gallery handlers. These cover cabinet-fit bounds, actual upper-meter picking behind the opened doors, correct meter order/cover states, four handles, drain, source image hash, saved leaf IDs and source comparison in Hebrew/English. The production build/package uses the Sites helper. Browser visual QA remains unavailable because the managed preview supervisor is missing.

## Revision 43 — time of day, installed lamps and darkness

Both simulators have a single Sunlight and home lighting card within their existing options/lighting panel. It provides a date, Israel civil clock, continuous day slider, quick hour presets, a plan-relative compass and azimuth/elevation readout, natural-by-time and lamps-only modes, a master lamp switch and a one-action 4000K reset. Manual location/bearing overrides are tucked into source details. Settings survive home/kitchen import, alternatives, history and transfers between both studios.

The original apartment PDF identifies plot 1410, building 4102, apartment 4 and has a north arrow pointing down-left. Its diagonal symbol supplies the default plan-top bearing of approximately 135 degrees; the crop and original-source link are shown in the control. `public/house/solar-reference.json` records the PDF hash, crop coordinates and basis. Latitude/longitude 31.31/34.62 are an Ofakim regional reference, not surveyed GPS coordinates from the plan. Solar direction uses NOAA's approximate fractional-year equations (https://gml.noaa.gov/grad/solcalc/solareqns.PDF) and the Asia/Jerusalem timezone database for winter/summer time. The model remains an illustrative lighting study: no measured lux, calibrated photometry, weather, reflected-light transport or unmodelled neighbouring buildings/upper floors are claimed.

Dragging the time changes the existing daylight rig and environment in place, retaining the camera, open-door animation, textures and geometry. The detailed kitchen uses the same direction through its existing 180-degree coordinate transform. Window and slider panes no longer cast opaque shadows; the frames and shutters still do. The walking ceiling now casts shadows. A non-rendered ceiling shadow blocker keeps full-height overview/detailed-kitchen sunlight from entering through an invisible open roof. The cutaway view intentionally remains open, and the control advises using the walking view for window-light inspection.

Lamps-only mode sets sun/sky to zero and removes the PMREM environment illumination in both renderers; the same happens naturally after sunset. Emissive installed bulbs and actual fixture lights illuminate the scene. Eight photographed ceiling holders receive generic simulated bulbs, four photographed facade luminaires remain, and two recessed common-entrance fixtures are added from 298241.jpg with separate source rectangles. Six further rooms without placeable photo evidence (bedroom 1, hall, bathroom, utility, guest WC, ensuite) receive explicitly temporary simulator ceiling fixtures with no fabricated evidence. Their purple/dashed marks, inspector, source inventory and printable report state that real future documentation will replace them. Clean view removes annotations while retaining installed geometry and illumination.

Defaults are 4000K for each lamp; under-cabinet/hood and illustrative outdoor-kitchen LEDs also use 4000K and obey the master lamp switch. Existing explicit per-point colour choices remain editable and preserved; the global 4000K button updates temperatures together without resetting brightness or enabled state. Ceiling fixtures use broad downward spotlights and wall fixtures point lights. Detailed shadows are limited to the six lit points nearest the selected room to bound mobile shadow samplers/cost; all visible enabled fixtures emit. Intensities, fixture models and shadow quality are illustrative.

Validation includes solar season/DST behavior, the independently published NREL Appendix A.5 reference within 0.5 degrees (the simpler NOAA approximation omits refraction/seconds), actual dark-mode light inventories and environment removal/restoration, global-off emissive fixtures, in-place sun movement and the home/kitchen coordinate transform, transparent glazing shadows, temporary-vs-observed evidence, per-point 4000K defaults, state round trips, and real React time/dark/reset/source/temporary-inspector handlers. Browser/mobile visual QA remains unavailable because the managed preview supervisor is missing.


## Revision 44 — building 4102 around apartment 4

The original twelve-page building PDF is retained unchanged (SHA-256 `17b91da71d113f1ef3f8bbb2fd9a472354c357c59ff0046422451a3857022f73`). Its title blocks establish ground, 1, 2, 3–4, 5, 6, 7, 8 and roof sheets, on PDF pages 3–11. The file contains floor plans, not height sections or facade elevations. All these sheets are now available in the existing source gallery. Page 12 contains signatures and is not added as a preview.

`src/building-trace.mjs` contains separate horizontal traces for every occupied level, balconies, stepped penthouse terraces, the shared core and roof heads. `scripts/trace-building.py` documents/reproduces the manual centre-line traces and uses the PDF's thick architectural wall strokes to identify opening spans. The ground sheet is deskewed and registered to three finished-wall controls of the unchanged RG1 apartment; upper sheets share the two-lift shaft datum. Floor 6 includes the continuation of duplex 32 from floor 5, without inventing a second independent apartment. The source contains 43 distinct numbered apartments.

The attached actual exterior photographs, especially `/house/exterior/reference-3.jpg` and `/house/garden/reference-2.jpg` / `reference-3.jpg`, support limestone courses, dark window profiles, glass balcony guardrails, grey balcony fascias and the service screens. Design-example fence/pergola images are not treated as building facade evidence. Facades outside the photographs remain illustrative reconstructions. No neighbour furniture, interior product selections, extra AC equipment or installed roof solar collectors are invented. Neighbour units are context shells; the original detailed apartment, real service equipment and all existing edits remain intact.

No section establishes vertical dimensions. Floor spacing **3.10 m**, 2.75 m illustrative clear height, 25 cm slabs, window sills, railing/profile dimensions and roof-head heights are explicitly estimates, not as-built measurements. Horizontal centre-lines are traced for visual reconstruction, not a construction survey. These limits and original source comparisons are available in Options → Building 4102.

The home opens in **Whole building** view. The two top selects choose the view and full building / cutaway up to a floor. A small **My apartment** action occupies its own layout row, without covering the scene; apartment view retains the original room, furniture, garden and walking controls. Clicking a context facade selects its floor and opens the same optional Options panel. All controls and the apartment outline hide in clean view, with the existing restore button. Perspective fitting includes the complete building volume on portrait and landscape displays.

With **Building shadows when focusing the apartment** enabled (default), the visually hidden context still casts physical shadows in apartment and detailed kitchen views. The kitchen context is transformed into its existing 180° local coordinate system. Invisible context writes neither colour nor depth and has no picking targets or navigation surfaces. Turning the setting off supports an isolated-apartment comparison. A floor cut removes upper floors from both the visible model and its shadows; it is not a whole-building illumination analysis. The expanded daylight frustum includes the complete building. Time-of-day updates still change the light rig in place. Lamps-only mode retains zero sunlight, sky and environment illumination. Unmodelled neighbouring buildings are excluded.

The new context uses shared cube geometry and instanced batches for facade walls, windows, rails, screens and core/stair geometry. Instance GPU resources are disposed when rebuilding. Source-document previews and building settings persist through export/import and the shared home/kitchen design history.

Validation includes original-PDF hashing, multi-control registration against RG1, floor/duplex/source-page mapping, opening spans on their host walls, finite instance matrices, cutaway removal, non-occluding shadow-only materials, no new wall through the original common entry/service cabinets, preservation of the original apartment outline, full-volume camera fitting, kitchen coordinate alignment, saved settings, clean-view behaviour, single-panel UI and native GLES3 compilation/linking of the actual instanced facade stone shader. The full suite has 226 tests. Managed browser preview is unavailable (`sites-previewd` mailbox absent), so browser/device appearance and interactions remain unverified; no browser screenshot is claimed.


## Revision 45 — apartment destinations, building tours and mobile joystick

Choose a floor or apartment in the first top selector, then Start walking. While already walking, selecting a destination explicitly relocates to a clear point in that floor/unit. Walking through an apartment entrance uses its actual source opening; doors can be closed/opened independently. Other apartments use neutral illustrative finishes, without assigning apartment 4’s product specifications or inventing furniture. The original detailed apartment and its yard remain editable.

The original building PDF remains unchanged. All four ground units, service-room steps and distinct garden/plot polygons are traced separately. Black 1.26pt architectural face pairs supply neighbouring interior walls; measured leaf/jamb quads supply door portals. Per-page inside top-left lift-shaft controls correct the upper floors’ former 20cm registration offset. Source path IDs and repeatable extraction/audit data are in `scripts/building-*.json`, `scripts/trace-building.py` and `scripts/trace-building-interiors.py`. Apartment 32 has its only common-hall entrance on floor 5 and an internal L-shaped stair to its upper floor 6 portion.

Two independent cars close their doors, travel at a simulated speed, and open at the requested landing. Walk into a car before choosing a floor. Hall/cabin controls also have 3D pick targets. Absent cars and closed landing doors block the shaft. Passenger stops are floors 0–8; the source roof sheet contains a lift head, not a passenger landing. Common stair flights and the duplex stair use their source footprints; all vertical rise remains the disclosed 3.10m-storey assumption. Elevator cabin finishes/equipment and all motion are illustrative.

Mobile/coarse-pointer walking replaces the arrow pad with a captured analog joystick: radial dead zone, variable speed, diagonal clamp, release/cancel/capture-loss/blur reset. Drag the scene independently to look. The desktop pad/WASD remain available. Hide all controls retains movement and the restore button; contextual elevator controls occupy their own layout row.

Verification covers every unit destination, all 43 entry crossings, both elevators at all 18 landings, blocked shafts, door-before-motion/arrival transitions, independent cars, source registration, stair landings, analog movement and actual moving Three.js cabin/door meshes. Existing home/kitchen/lighting tests and production compilation are retained. Browser/device visual QA remains unverified: the managed preview supervisor mailbox was unavailable; no alternate preview server was started.


## R47 source audit

`ground-base-source-audit.json`, `ground-transform-audit.json`, and `building-site-source-audit.json` under `scripts/` retain source coordinates, drawing indices, SHA256 and registration controls. Runtime geometry uses `ground-base-source.mjs` and `building-site-trace.mjs`. Two garden units require reflection, not rotation alone; maximum footprint control residual is 22.4mm. No loose furniture is specified on the baseline plan. The original kitchen supplier is responsible for its detailed modules; generic source-positioned appliances/counter heights remain illustrative. Chamber glyph diameters are not installed lid measurements. Parking outline dimensions do not establish ownership. Site heights, paving profile, cabinet height and unphotographed neighbour service placements remain inferred.

## R48 document access and deployment

Server-only environment variables (never use a `VITE_` prefix):

- `DOCUMENTS_PASSWORD`: the owner's chosen document password. It is never committed or sent to the browser.
- `DOCUMENTS_SECRET`: an independent random 32-byte base64 key. It encrypts source assets during the build and signs temporary sessions. The same value must be present at build time and runtime.

Copy `.env.example` to an ignored `.env.local` for a local build, and fill in both values. Generate the encryption key locally with `node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64'))"`; do not put the generated value in source or logs. Run `npm run build`. Missing/invalid encryption keys fail the build before any public output is generated. `.env.local`, `.site-private`, `dist` and all secret values are excluded from the source ZIP and git.

The existing Sites project uses its native secret environment settings and a Worker build. The existing owner-private audience is preserved. `server/worker.mjs` authorizes every source URL before decrypting the original bytes. Source roots `/house/`, `/plans/`, `/materials/owner-products/` and `/materials/harash/` are absent from the public output. Source assets in `/_vault` are AES-256-GCM ciphertext with per-file IVs and authenticated original paths. `public/` retains originals in the private source repository for auditability and full-source export. Material crops in `/materials/runtime/` contain only the rendering sample and remain public so document access does not replace the real floor with a fallback texture.

For the independent Vercel deployment, import this source and configure **both environment keys** for Production (and Preview when used), then redeploy. `vercel.json` sets `dist/client`, includes the encrypted files in the Node function and rewrites source URLs to `api/documents.js`. Do not use the former static-only build or publish the source `public/` directory. Vercel secret values are not synchronized by a Sites deployment.

A successful login creates a two-hour Secure, HttpOnly, SameSite=Strict cookie. PBKDF2 verifies the submitted password server-side; HMAC authenticates the cookie and password changes invalidate prior sessions. Responses use `private, no-store`. Login/logout require a same-origin POST. Eight failures per 15 minutes are limited per process/isolate and IP; this is not a distributed account-lockout service. Direct HTML source links show an unlock form; original bytes, HEAD and video/PDF ranges require a valid session.

Validation: `npm test`, `npm run build`, then `node qa/check-document-build.mjs` exercise the compiled Worker and Vercel adapter with actual encrypted files, compare decrypted SHA-256 hashes to originals, deny unauthenticated direct requests, test byte ranges and verify no password/key appears in public code. The Source helper packages the tested build and the exact source commit.

Visual references are recorded in `public/house/efi-reference/provenance.json` and exposed through the same protected source viewer. The labelled official complex-5 aerial identifies building 4102. Balcony frame horizontal positions follow repeated exposed plan edges; thickness, colour and vertical dimensions remain inferred. Unspecified neighbouring-apartment finishes remain illustrative.

## R49 floor visibility, mobile recovery and source geometry

- Floor/apartment overview: remove only the selected storey's closing ceiling and all higher floors. Preserve full-height walls unless the user explicitly enables Cutaway. Keep lower closing slabs, walking ceilings and the complete-building roof.
- `scene-lifecycle.mjs` owns context-loss/restoration, visibility and bfcache events. Hidden pages pause drawing. Foreground lost contexts retry automatically at most twice per 30 seconds. Manual retry remains available, and the notice can be dismissed. Renderer recreation restores the matching camera/controls and walking/lift pose, rebuilds all model effects and leaves saved settings alone. GPU contexts are explicitly released on replacement/unmount.
- The former automatic full-apartment fallback is removed from both 3D viewers. An actual unsupported device keeps a dismissible retry notice; it does not claim the requested floor is apartment4.
- `building-geometry.mjs` reconstructs bounded perpendicular wall junctions from immutable paired-face runs, protecting known entry thresholds, door spans, lift openings and facade gaps. Original PDF page8 confirms the connected corner near world `[4.949,11.695]` in unit39/floor6. Wall thickness is not enlarged and parallel runs are never joined across an opening.
- Exposed balcony intervals are split at envelope crossings and shared by rendering and walking. The previously omitted floor6 return from `[-.1477,4.4094]` to `[-.7492,4.4094]` is now guarded. Common flights, duplex flight sides and the upper duplex opening have visible handrails. Rail style/height are illustrative, and the stair entrance/exit remain open.
- The actual source45+N1 parking polygons, tandem topology and numbering remain unchanged. Paving remains interlocking blocks, consistent with the owner's actual photo, with a darker neutral tone and subtle anti-aliased joints informed by the official complex5 render. Sidewalks are lighter; source-traced curbs have an illustrative12cm height. Six instanced generic cars are visual props, without ownership or make claims; their source-bay-contained footprints also block walking. Planting is restricted to source-free strips; no cars or landscaping are placed in the owner's garden, pedestrian routes or accessible bay.
- Flat garden-neighbour and site surfaces use both visible face directions so an overhead camera can see the actual paving instead of the green base behind it.

Validation includes all source/navigation tests, overhead surface rays, actual instanced corner/rail coverage, portal protection, immutable traces, shared guards/collision, parked-car containment, native GLES material shader linking, lifecycle visibility/context/BFCache event simulation, camera/lift-state retention, retry/dismiss handlers and the compiled protected-document Worker/Vercel checks. The managed preview supervisor is unavailable in this workspace, so mobile-browser GPU restoration and visual screenshot QA are unverified; no unsupported preview workaround was used.

## R58 — full wall audit, apartment furniture and open service descent

Re-read the complete 32.059-second original `307562.mp4`. The entry service cabinet bank is split by an open descending stair portal. Move its flush panels east of the complete stair mouth, retain the long wood-panel wall, reconstruct seven descending steps and a bottom landing, lower the pump/meter floors and pump equipment together, and remove the overlapping floor/site surfaces above the descent. Walking height follows the service floor. Both original service door portals remain open and reachable from the lobby. The source plan fixes horizontal extents; the 1.05 m descent, step profile and finish dimensions are illustrative estimates from the video, not a surveyed section. Upper slabs and the existing duplex stair aperture remain intact.

The repeatable CAD wall extractor now excludes FLAT-NUM, SALETXT, NOTIS and FRMTEXT annotation layers. This removes 32 short number/annotation fragments that had become false column-like walls. All genuine architectural runs remain: 3,271 source wall runs over nine floors, plus 128 runs in the four detailed ground profiles. The full rendered-mesh audit includes 82,914 wall samples, 2,920 source corner samples, 1,834 door samples, 3,042 lintel samples and 96 roof corner samples, with zero failures. Original removals and the audit are in `qa/annotation-wall-removals-r58.json` and `qa/building-wall-audit-r58.json`.

Add 39 proposed kitchens, one for every independent upper apartment, and 138 beds in the upper-floor bedrooms/safe rooms registered on the original PDF. The duplex has one kitchen on its entry floor. Native PDF room seeds, a repeatable wall/door-aware placement generator and its zero-failure report are included. Kitchens back onto real wall runs and include cabinets, worktop, sink and hob. Fifteen proposed beds furnish the five sleeping rooms of each of the other three garden apartments; their existing source-positioned kitchens remain. Apartment 4 retains its detailed editable kitchen, bedroom furniture and office. These generic layouts are proposals, not documented installed furniture. Add the two previously omitted penthouse safe-room footprint portions without moving their source walls. Furniture rendering and walking collision use the same placements; the existing furniture visibility control applies to all new items.

Validation: all automated tests, including room/door/wall clearance, all service-route waypoints, actual mesh cabinet bounds, downward stair rays and ceiling/aperture rays. The managed preview now loads and its controls were checked, but its cloud browser reports WebGL disabled and cannot create a Three.js context; in-browser 3D appearance and device performance remain unverified. No successful 3D browser render is claimed. Production compilation and encrypted-source checks use the existing Sites workflow.

## R59 — classify and repair the marked facade voids

The owner's marked simulator captures `309108.jpg` and `309105.jpg` are retained byte-for-byte under protected `public/house/facade-review-r59`, with SHA-256 provenance. They identify model defects, not real-site geometry. Original CAD floor sheets and real exterior photos remain the geometric/appearance evidence.

Three separate omissions caused the visible slots. The wall extractor's former 42.5 cm limit excluded actual 45/50 cm safe-room concrete face pairs. The two corrected upper safe-room unit polygons had not propagated into the building envelope, slab or wall-extraction mask. Some genuine near-corner windows were absent from the opening list. The extractor now retains the thick walls; penthouse envelopes are rebuilt from the corrected units/core; page 10's western utility/balcony boundary follows its concrete face pair; ten missed windows are restored only where actual OPENING-layer CAD strokes cover an architectural wall gap. Real windows retain glazing, sill/head walls and clear apertures.

All six laundry-screen stacks now have per-floor CAD registration. The two north stacks turn onto their actual side-facing mouths. The east and west stacks gain their documented L-shaped side returns. The two south shafts retain their photographed outer return plane at z=11.64 m, rather than moving back to the recessed AC platforms. The resulting 48 screen/return panels cover floors 1–6; upper terraces and real balconies remain open. Individual slats have physical ventilation gaps, without opaque backing plates, and share screen footprints with walking collision. Slat pitch, member dimensions and vertical rise remain illustrative. Existing door IDs stay mapped to their source paths, and proposed furniture is refitted against the corrected walls.

Reproduce the registered repairs in order:

```sh
python scripts/repair-facade-trace.py
python scripts/trace-building-interiors.py
python scripts/extract-facade-edges.py
node scripts/repair-facade-openings.mjs
node scripts/place-laundry-screens.mjs
node scripts/place-apartment-furniture.mjs
```

The independent rendered-wall audit now covers 3,522 source runs plus 128 ground-profile runs, with 89,313 wall samples and 3,228 corner samples; all source doors, lintels and roof corners remain checked. `qa/building-wall-audit-r59.json` retains the full result. New spatial regressions check the actual screen meshes and open gaps, both upper safe-room slabs/envelopes, thick facade sections, and glass/sill/head coverage at all ten restored windows.

Four depth-buffer geometry views were rendered from the actual transformed Three.js scene through native GLES3 and inspected; `qa/facade-geometry-review-r59.jpg` contains the views. Reproduce them with `node qa/export-building-review.mjs /absolute/output/prefix` followed by `python qa/render-building-review.py /absolute/output/prefix` (NumPy/Pillow and native EGL/GLES3 required). These use simple lighting and flat material colours to inspect geometry; they are not browser screenshots or a validation of the final material/reflection effects. Browser WebGL/device performance remains unverified. Production build, protected originals, compiled Worker and portable adapter use the established checks.

## R60 — real balcony exits and attached laundry screens

The five marked simulator screenshots 309163, 309161, 309159, 309157 and 309165 are retained unchanged under protected `public/house/balcony-review-r60`, with SHA-256 provenance. All marked terraces are present as balconies on the original floor sheets; they are retained rather than removed as inaccessible roofs.

The earlier source-door extraction accepted closed quad leaves and missed three-line U-shaped exterior leaves. Recover these only with their actual CAD swing arcs, two parallel leaf faces and a threshold aligned to a source balcony. Thirteen source records yield twelve additional unique runtime doors, preserving existing stable IDs. The exterior leaves render with dark frames, glazing, handles and separate open/closed picking; their source positions, widths and swing directions are retained. Door height and glazed-leaf styling are illustrative because elevations and installed door schedules have not been supplied. Thirteen former window records are classified as balcony doors, including previously known exits. Their lower sill barriers are removed and the existing door controls/collision apply. Exterior heads receive facade stone instead of an unrelated white patch.

Floor 2's two side balconies now reach the actual living-room wall/slider. Floor 6's north corner terraces are excluded from the enclosed apartment/envelope mask, restoring their exterior guards. The source southern AC-platform side walls continue to z≈9.096 m; their former extraction mask stopped at z=7.317 m and omitted four actual wall runs. Extending the registered platform mask retains those walls.

R59's photo-inferred southern screen plane at z=11.64 m was beyond the actual PORCH mouth and left the inner posts detached. Both frames now use their exact per-floor CAD endpoints at z≈9.045 m. Every southern post meets a genuine wall within 1 cm in the model. The original side returns and physical slat gaps remain. This corrects the earlier inferred placement rather than adding invented opaque walls, deep ledges or platforms.

`qa/audit-balcony-access.mjs` checks actual walking collision, rendered wall clearance at foot/body/head heights, sliding and hinged exits, and clear links between contiguous terrace pieces. All 58 upper-floor balcony surfaces are reachable through 61 tested portal crossings; `qa/balcony-access-r60.json` retains the zero-failure result. Eleven targeted regressions passed, including closing/reopening a real glazed exit, all southern post attachments, the corrected terrace guards, and the full nine-floor source-wall audit (3,526 source runs). Proposed furniture refits with 138 upper beds and 39 kitchens without wall/door conflicts.

The repair sequence after the existing trace is:

```sh
python scripts/repair-facade-trace.py
python scripts/repair-balcony-trace.py
python scripts/recover-balcony-doors.py
python scripts/trace-building-interiors.py
python scripts/extract-facade-edges.py
node scripts/repair-facade-openings.mjs
node scripts/classify-balcony-openings.mjs
node scripts/place-laundry-screens.mjs
node scripts/place-apartment-furniture.mjs
```

Native geometry review supports `--balcony-closeups` on the export command to add five targeted views. The managed preview loaded, but its cloud browser again reported WebGL disabled. At the owner's request further browser checking was skipped; final browser rendering and device performance are unverified. The production build remains required for publication.

## R61 — the marked west terrace and the apparent door above it

Screenshot 309179 is retained unchanged with its SHA-256 under protected `public/house/balcony-review-r61`. It identifies a model defect; it is not elevation or construction evidence. The original floor-7 and floor-8 sheets establish the geometry.

The western en suites of apartments 40 and 42 had been omitted from their enclosing polygons. The bedroom's recessed bathroom doorway was mistaken for the outside boundary. This left an internal door and window exposed in an artificial vertical slot. Restore each room through its actual paired common wall against the next apartment's safe room, at z=-3.655 m and -3.678 m. The unit finish, structural floor, ceiling, exterior return, extraction mask and walking domain now include the entire bathroom. Its existing real internal door, ID and swing are preserved.

The west bedroom sliders were also split into window records by the facade extraction. Restore each full 1.90 m gap from the two independently located CAD glazing tracks, including their separate sliding-panel strokes. The floor-7 terrace now has a full-height bedroom exit. Both actual narrow bathroom windows retain glazing, sill and head. Reject 27 false wall blocks formed by pairing opposite window-jamb caps across their 50 cm gaps; actual OPENING-layer members must independently span the disputed void before such a pair is excluded. Source wall faces remain unchanged for provenance and corner/lintel construction. `qa/window-cap-rejections-r61.json` retains the rejected pairs and exact source path IDs; `qa/facade-restored-openings.json` describes the current recovered glazing. The historical R59 report is retained.

Run `python scripts/repair-upper-ensuite-trace.py` after the existing facade/balcony trace repairs and before `trace-building-interiors.py`; then run the existing facade-edge/opening, door-classification, screen and furniture generation commands. The base trace definitions also include the missing bathroom depth; the repair aligns their final common boundary to the paired original source wall. `qa/upper-ensuite-trace-r61.json` records that evidence.

The source-to-mesh wall audit covers all nine floors, 3,501 source runs, the four detailed garden profiles and roof corners, with 88,827 wall samples and zero failures. The balcony audit reaches all 58 balcony surfaces through 62 tested crossings. All 293 tests pass, and the production build protects 178 original source files. New regressions verify the internal bathroom door's open/closed walking behavior, real room floor and ceiling support, the exterior enclosure, the full-height terrace exits and the narrow window apertures. The actual scene geometry was reviewed from two matching west-side closeups with `--upper-ensuite-closeups`; these native flat-colour views do not validate browser materials. Browser checking remains skipped at the owner's request. Storey rise, vertical opening sizes and finishes retain the existing illustrative assumptions.

## R62 — neighbour beds, living rooms, materials and walking location

Rearrange all 153 neighbour beds: 138 on the upper floors and 15 in garden apartments 1–3. The source room labels identify closed room components; they no longer act as bed centres. Search all four headboard directions, require an actual backing wall, keep the complete door sweep and balcony-slider approach clear, and retain a standing approach at the foot plus an accessible side. All 42 master beds retain a proposed 155 × 202 cm footprint; the 111 single beds retain 100 × 202 cm. The actual rendered walls support every headboard, and every saved foot approach passes runtime walking collision with furniture enabled.

Each of the 42 other independent apartments receives a proposed sofa, coffee table, TV cabinet and rug. The original 39 upper kitchens and the three source-base garden kitchens remain separate from the living sets. Apartment 32 has one living set on its lower duplex level. Furniture stays within the actual open living/kitchen room component, clears source walls and door/slider reserves, and retains routes between that room's portal approaches. Apartment 4's own furniture, personal kitchen, edits and ordered products remain independent. Neighbour furnishing dimensions, materials and arrangements are illustrative proposals, not a measured neighbour furniture inventory.

`scripts/arrange-neighbour-apartments.mjs` and `scripts/neighbour-furniture-tools.mjs` generate the revised records and `qa/neighbour-furniture-r62.json`. Run the arrangement script after the original `place-apartment-furniture.mjs` when rebuilding from source geometry; it retains the generated kitchens and adds the revised beds and living sets. Ground furnishings have their own `GROUND_APARTMENT_FURNITURE` export, rigidly registered to units 1–3 without importing the owner's movable furniture.

Neighbour walls, floors and furniture now use the existing physical surface palette: limestone/mineral detail, plaster, neutral porcelain, timber grain and woven cloth, with independent colour, micro-relief and roughness maps. Rounded shared geometry softens mattress, cushion and sofa edges. `building-surface-uvs.mjs` accounts for actual instance/mesh scale so grain and fabric do not stretch with a large wall or small cushion. One palette shares the neighbour furniture maps across storeys. Facade courses, source geometry and the owner's own material selections are retained.

Walking now shows a compact location card at the physical right of the scene. Its floor and apartment come from the live pose, including null apartment values on common landings and private garden ownership. The Map button opens the current floor without leaving walking: source wall runs, balconies/gardens, apartment numbers, active unit, position and look direction. Static floor geometry is memoized while the position marker moves; the source-plan button opens the protected original. The card follows the existing hide-controls setting.

All 298 tests pass, including actual headboard/wall intersections, standing access at all 153 beds, rendered/collision living-set coverage for all 42 units, shared material detail, changing floors/units and map-toggle handlers. Native geometry review covers typical unit 5, penthouse 40 and garden unit 3 via `qa/export-building-review.mjs <prefix> --unit=40:7`. These flat-colour geometry renders do not validate browser materials or device performance. Browser checking remains skipped at the owner's request.

## R63 — private duplex circulation and the single hall entrance

`building-duplexes.mjs` records apartment 32 as the same dwelling on floors 5–6, with its only hall entrance on floor 5. This is the repeated apartment number and L stair on original PDF sheets 7–8. The upper apartments 40–43 retain their separate source entrances. Both duplex destinations remain available for inspecting the two plans; starting a walking or VR tour from either destination uses the real lower entrance. The floor summary, destination labels and walking card identify the duplex and entrance floor; the mini-map marks its internal stair in both plans.

The previous upper-landing guard acted as an invisible barrier across the bottom of the descending flight. Guard collision now uses its physical vertical range, and both floors include the actual sloping flight rails. A private-stair journey starts only at the bottom or top stair entrance; approaching from an unrelated upper-floor edge cannot bypass a guard or drop down a storey. Movement updates position, height and floor together in 4 cm substeps, so fast frames at all three walking speeds cannot skip the small landing transition. Rebuilding the scene preserves the current stair height during collision clearance. Public stairs were also checked on a complete floor-3-to-4 round trip with runtime collision.

The private stair cuts only the slab between floors 5 and 6. The base under the lower flight and the ceiling over the upper rooms are closed. The short-flight treads use the next three risers after the corner landing, with the upper floor completing the final riser. Original wall traces and apartment 4's layout are unchanged.

All 304 tests pass. New tests walk the furnished duplex up and down at normal, double and triple speeds, require the upper rooms to stay disconnected from the common hall with every real door open, prevent entry over upper guards, raycast the real slabs/ceilings and hall wall, and verify the actual bilingual React destinations and map. The production build protects the same 178 source files. Browser rendering remains unverified because the owner requested that browser checking be skipped. Storey rise and vertical stair details retain the existing illustrative assumptions.

REV 74: public full-building view retains ceilings; floor sections remove only the selected floor ceiling. Public snapshot restores shared stone-course/tile shaders and metric texture mapping after JSON loading. Private design and assets remain encrypted.

REV 77: touch joystick in public and personal walking views; proportional movement and release-to-stop.

REV83: photo quality controls occupy a wrapping header slot; stronger daytime sky fill/environment and softer contact occlusion preserve solar direction and night modes.

REV84: noon on opening (live time opt-in), analytic Sun/Moon disks at screen resolution with calculated direction and lunar phase; disks stay behind geometry and share sky orientation in VR.

REV84 also adds real loading indicators during bootstrap, access checks, lazy kitchen imports, initial scene rendering, photographic materials, public building/texture parsing and photo renderer preparation. Failures leave the spinner and show recovery/errors.

REV85: eight-building public district (4102 default), copies built exclusively from sanitized public snapshot with shared instanced batches. Layout and rotations estimated from owner aerial render, public park, roads, sidewalks, parking and green promenade are illustrative pending a dimensioned development plan. Sources: https://efficapital.co.il/Effi-Afikim/ and owner labelled aerial rendering.

REV86: default building and district cameras view the street corner beside ground apartment 1 (negative local X/Z); preserve the source-plan geometry and 4102 street-corner registration.

REV87: rotate building geometry 90 degrees around each plot centre per owner orange-to-blue annotation. Apply same world rotation to solar/lunar north mapping. Keep original apartment IDs, polygons, floor numbers and entry records; inverse transform walking/map coordinates. Private plan coordinates remain unchanged.

REV88: 4103 and 4091 quarter-turn relative to 4102; 3461 and 3471 true reflected copies, with corrected triangle winding and positive instance matrices. 4101 and 4093 shifted 8m toward street (estimated from supplied image) relative to aligned 4102/4092. 4102 solar frame and plan apartment numbering unchanged.

REV89: reconstruct all eight building centres using plot-1410 plan anchors and a perspective fit of the official aerial. 3461 is set back from 4103, 3471 is between 4093 and 4091 along the block, and the previous uniform 65m grid is removed. See scripts/district-layout-calibration.json for manual controls, alignment assumptions and uncertainty. Shared roads/parking/promenade follow the revised extents and avoid the building envelopes. HOME STUDIO public header text is 12.5px instead of 25px (50% smaller), with less header padding and unchanged touch targets.

REV90: add standard garden lawns and complete perimeter fences to all 32 ground apartments, with facade-clipped shared dividers. Preserve all 46 source-traced adjacent parking bays of 4102, including 13 tandem pairs and N1, in a separate sanitised public site snapshot. Reconstruct the other parking courts with 2.5m x 5m bays, access aprons, representative cars and a continuous connected drive network. Replace the earlier generic grid with clipped sidewalks, open driveway kerbs, zebra crossings and landscape islands. Additional parking counts, street geometry and fence heights remain illustrative, not a surveyed allocation.
