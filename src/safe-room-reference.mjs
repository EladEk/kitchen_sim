// Owner-identified safe room, video 338866.mp4, received 2026-11-11.
// Appearance and wall relationships are observed; offsets and sizes are estimates.
export const SAFE_ROOM_VIDEO_SOURCE={
 id:'safe-room-video',kind:'photos',he:'ממ״ד — הסרטון שלך',en:'Safe room — your video',
 pages:[1,2,3],videoPage:3,video:'/house/safe-room/walkthrough.mp4',poster:'/house/safe-room/door.jpg',
 videoLabelHe:'סרטון ממ״ד · 7 שנ׳',videoLabelEn:'Safe-room video · 7s',
 videoNoteHe:'סרטון 338866.mp4 שזוהה על ידך כממ״ד. המידות והגבהים שלא מופיעים בתוכנית משוערים.',
 videoNoteEn:'Owner-identified safe room in 338866.mp4. Dimensions and heights absent from the plan are estimates.',
 references:[
  {page:1,image:'/house/safe-room/window.jpg',he:'חלון הממ״ד',en:'Protected window',noteHe:'מסגרת כהה ושתי כנפיים במסילות נפרדות. מידות הפתח נשמרו לפי התוכנית.',noteEn:'Dark frame with two sashes on separate tracks. The plan opening is retained.'},
  {page:2,image:'/house/safe-room/door.jpg',he:'דלת ופתחי אוורור',en:'Door and ventilation fittings',noteHe:'דלת ומשקוף לבנים ושני פתחים עגולים מעל הפתח: אוגן משמאל וגריל מימין. קטרים, עומקים וגבהים משוערים; אין זיהוי דגם.',noteEn:'White door and frame, with a flanged circular opening on the left and a round grille on the right. Diameters, depths and heights are estimates; no model identification.'}
 ]
};

export const SAFE_ROOM_VENTS={
 id:'safe-door-vents',roomId:'safe-room',kind:'safe-door-vents',source:SAFE_ROOM_VIDEO_SOURCE.id,page:2,
 he:'פתחי אוורור עגולים מעל דלת הממ״ד',en:'Circular ventilation fittings above the safe-room door',
 dimensions:[.815,.085,.34],bottom:2.25,
 noteHe:'לפי סרטון הממ״ד: פתח עם אוגן משמאל וגריל עגול מימין, בצד הפנימי של קיר הדלת. המיקום היחסי נראה בסרטון; המידות והגובה נאמדו. הפתח החלקי בקיר הצדדי אינו ממודל ללא צילום מלא.',
 noteEn:'Video shows a flanged opening on the left and a round grille on the right, on the inside of the door wall. Relative placement is observed; sizes and height are estimated. The partly visible side-wall fitting is not modelled without a complete view.'
};
