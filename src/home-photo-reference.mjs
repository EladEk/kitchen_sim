// Observations from the owner's nine photographs and 32-second walkthrough.
// Photographs establish appearance and relative placement, not measured sizes.
// The document-derived walls, opening dimensions and owner's layout stay authoritative.
export const PHOTO_REFERENCES=[
 {page:1,file:'01-277867.jpg',he:'המטבח והנמכת המיזוג',en:'Kitchen and HVAC bulkhead',noteHe:'הנמכה לאורך קיר העבודה ושני גרילים מלבניים בגדלים שונים.',noteEn:'A bulkhead along the work wall and two rectangular grilles of different sizes.'},
 {page:2,file:'02-277869.jpg',he:'הכנות בקיר המטבח',en:'Kitchen wall preparations',noteHe:'מיקום יחסי של הכנות החשמל והחלון הצדדי. אין מידות מדודות בצילום.',noteEn:'Relative locations of electrical preparations and the side window. The photo has no measured dimensions.'},
 {page:3,file:'03-277875.jpg',he:'חלון חדר — מבט מהדלת',en:'Bedroom window from the doorway',noteHe:'מסגרת כהה ומכסה גישה פנימי לתריס מעל החלון. מספר החדר אינו מסומן בצילום.',noteEn:'Dark frame and an interior shutter access cover above the window. The room number is not identified.'},
 {page:4,file:'04-277878.jpg',he:'חדר — חלון וארגז תריס',en:'Bedroom window and shutter cover',noteHe:'חלון הזזה עם שתי כנפיים ומכסה כהה מעליו; ללא שיוך ודאי למספר חדר.',noteEn:'Two sliding sashes and a dark cover above; the numbered room is not confirmed.'},
 {page:5,file:'05-277877.jpg',he:'שקעים והכנות בחדר',en:'Bedroom outlet preparations',noteHe:'נקודות החשמל נראות, אך ללא זיהוי חדר ומידות לא שונו מיקומי הריהוט לפיהן.',noteEn:'Electrical points are visible, but without a room ID and dimensions they do not change the furniture layout.'},
 {page:6,file:'06-277882.jpg',he:'חדר הורים — מחיצה והנמכה',en:'Main bedroom partition and ceiling drop',noteHe:'המחיצה ליד הרחצה והנמכה באזור הכניסה מאשרות את המבנה בצורת ר׳.',noteEn:'The en-suite partition and entrance ceiling drop confirm the L-shaped arrangement.'},
 {page:7,file:'07-277886.jpg',he:'חדר — פרטי החלון',en:'Bedroom window details',noteHe:'מסגרת, מסילות ומכסה תריס כהים. גובה האדן נשאר משוער.',noteEn:'Dark frame, tracks and shutter access cover. Sill height remains assumed.'},
 {page:8,file:'08-277887.jpg',he:'תקריב חלון ושקעים',en:'Window and outlets close-up',noteHe:'תקריב גוון הפרופילים והפנל בתחתית הקיר. הגימורים שנבחרו במפרט נשמרו.',noteEn:'Profile color and wall skirting close-up. The ordered finishes are retained.'},
 {page:9,file:'09-277893.jpg',he:'ממ״ד — חלון ומערכת סינון',en:'Safe-room window and air filter',noteHe:'יחידת סינון לבנה מותקנת מעל החלון; נראים שלבי חוץ. הדגם והמידות אינם קריאים.',noteEn:'A white filtration unit is mounted above the window; exterior slats are visible. Model and dimensions are unreadable.'}
];
export const PHOTO_SOURCE={id:'site-photos',kind:'photos',he:'תמונות וסרטון הבית',en:'House photos & video',pages:[1,2,3,4,5,6,7,8,9,10],imagePrefix:'/house/photos/photo-',video:'/house/photos/walkthrough.mp4',poster:'/house/photos/video-poster.jpg'};
export const SHUTTER_COVERS={
 'bed-a-window':{height:.26,page:3},'bed-b-window':{height:.26,page:4},
 'master-window':{height:.26,page:7},'bed-c-window':{height:.26,page:7},
 patio:{height:.22,page:10,second:3}
};
export const OBSERVED_ELEMENTS=[
 {id:'kitchen-hvac',roomId:'kitchen',kind:'kitchen-bulkhead',he:'הנמכת מיזוג ושני גרילים',en:'HVAC bulkhead & two grilles',dimensions:[5.45,.55,.33],bottom:2.42,page:1,noteHe:'ההנמכה והגרילים נראים בצילום. גובה, עומק, מידות הגרילים ומיקומם לאורך הקיר נאמדו; אין תוכנית מיזוג מדודה.',noteEn:'The bulkhead and grilles are visible. Height, depth, grille sizes and positions are estimated; no measured HVAC plan is available.'},
 {id:'hall-ceiling',roomId:'hall',kind:'hall-ceiling',he:'הנמכת תקרת המסדרון',en:'Lowered hall ceiling',dimensions:[2.25,6.2,.29],bottom:2.46,page:10,second:5,noteHe:'הסרטון מציג תקרה מונמכת במסדרון. המתאר עוקב אחרי המסדרון בתוכנית; גובה התחתית ועובי ההנמכה משוערים.',noteEn:'The video shows a lowered hall ceiling. Its outline follows the plan; underside height and depth are assumed.'},
 {id:'master-ceiling',roomId:'master',kind:'master-ceiling',he:'הנמכה בכניסה לחדר ההורים',en:'Main-bedroom entrance ceiling drop',dimensions:[1.7,1.9,.33],bottom:2.42,page:6,noteHe:'מעל אזור הכניסה שליד רחצת ההורים. תחום ההנמכה וגובהה נאמדו מהתמונה ומהסרטון.',noteEn:'Above the entrance beside the en suite. Its extent and height are estimated from the photo and video.'},
 {id:'safe-air-filter',roomId:'safe-room',kind:'safe-filter',he:'מערכת סינון מעל חלון הממ״ד',en:'Air filter above the safe-room window',dimensions:[.48,.22,.4],bottom:2.17,page:9,noteHe:'המיקום מעל החלון מאומת בצילום. הגוף מוצג להמחשה במידות משוערות, ללא זיהוי דגם או פרטי התקנה.',noteEn:'Placement above the window is photo-confirmed. Body dimensions are illustrative; model and installation details are unknown.'}
];
export const observedElement=id=>OBSERVED_ELEMENTS.find(e=>e.id===id);
