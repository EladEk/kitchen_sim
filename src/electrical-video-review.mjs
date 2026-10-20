// A review interval does not mean every fitting is visible in every frame.
// The individual source rectangles still identify the actual visible evidence.
export const ELECTRICAL_ROOM_REVIEWS=[
 {roomId:'kitchen',second:.5,page:21,he:'הצלבה לקיר העבודה ולצילום 277903; K09 נשאר הכנה והעברתו הצעה.',en:'Work wall cross-checked with 277903; K09 remains unidentified with a proposed relocation.'},
 {roomId:'living',second:3,page:15,he:'H02 על הקיר בצד הסלון; סדר הבקר והקופסה לצד הוויטרינה תוקן.',en:'H02 on the living-facing wall; control/box order beside the slider corrected.'},
 {roomId:'bedroom-a',second:15,page:22,he:'החדר הראשון ברצף: קבוצת B שויכה לכאן. מספור החדר עדיין משוער.',en:'First room on the route: B group assigned here. Numbered-room assignment remains provisional.'},
 {roomId:'bedroom-b',second:16.5,page:23,he:'החדר השני ברצף: קבוצת A, בצד הנכון של החלון. המספור משוער.',en:'Second room on the route: A group on the correct window side. Numbering is provisional.'},
 {roomId:'bedroom-c',second:28,page:25,he:'מיקומים ביחס לחלון תוקנו; הקופסאות הגבוהות על הקיר המשותף לחדר ההורים.',en:'Window-relative positions corrected; high boxes are on the shared main-bedroom wall.'},
 {roomId:'master',second:24,page:24,he:'השקע סמוך לפינת החלון ושלוש ההכנות על הקיר האחורי; המחיצה נפרדת.',en:'Window-corner socket and three preparations on the rear wall; the partition is separate.'},
 {roomId:'safe-room',second:19.5,page:13,he:'הקבוצות הצדדיות על הקיר המזרחי; שקע נפרד מתחת לחלון.',en:'Side groups are on the east wall; separate socket below the window.'},
 {roomId:'laundry',second:9.5,page:12,he:'שני השקעים לצד החלון נבדקו ונשמרו.',en:'The two sockets beside the window were reviewed and retained.'},
 {roomId:'hall',second:17.5,page:14,he:'H01 תוקן לקיר בצד חדרי השינה. נקודות ליד הדלתות נשמרו בנפרד.',en:'H01 corrected to the bedroom-side wall. Doorway preparations remain separate.'},
 {roomId:'bathroom',second:7.5,page:17,he:'הכנות ליד הדלת נבדקו; לא זוהה מהסרטון שקע נוסף בתוך החדר.',en:'Doorway preparations reviewed; no additional in-room socket identified.'},
 {roomId:'powder',second:12.5,he:'לא זוהה שקע ודאי; לוח ההדחה וחיבורי המים נשארו אביזרי מים.',en:'No definite socket identified; flush plate and plumbing remain water fixtures.'},
 {roomId:'ensuite',second:26,he:'לא זוהתה נקודת חשמל נוספת שניתן למקם בביטחון.',en:'No additional electrical fitting can be confidently placed.'},
 {roomId:'terrace',page:19,he:'שקע החוץ מבוסס על צילום החוץ; הסרטון הפנימי אינו מאמת אותו מחדש.',en:'Exterior socket relies on the exterior photo, not the indoor walkthrough.'},
 {roomId:'garden',page:18,he:'נקודות החוץ נשמרו לפי צילומי היציאה והמזגנים; החצר אינה נסרקת בסרטון.',en:'Outdoor points retain exit/AC-photo evidence; this yard is not surveyed in the video.'}
];
export const electricalRoomReview=id=>ELECTRICAL_ROOM_REVIEWS.find(r=>r.roomId===id);
