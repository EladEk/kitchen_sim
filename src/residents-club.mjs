// Ground-floor page 3: surveyed horizontal wall faces stay in building-interiors.
// Video 298245.mp4 documents finishes and fixtures, not metric elevations.
export const RESIDENTS_CLUB={
 id:'residents-club',destination:'common:club:0',he:'מועדון דיירים',en:'Residents’ club',floor:0,page:3,doorId:'bd-0-9',
 polygon:[[0,-9.649],[5.85,-9.649],[5.85,-7.5],[6,-7.5],[6,-3.75],[5.75,-3.75],[5.75,-3],[0,-3]],
 walk:[4.85,-4.65],yaw:Math.PI/2,ceiling:2.85,
 cabinet:{minX:.01,maxX:.34,minZ:-6.04,maxZ:-5.10},
 lamps:[[1.7,-8.4],[4.25,-8.4],[1.7,-4.4],[4.25,-4.4]],
 noteHe:'הקירות, רוחבי החלונות והכניסה לפי תוכנית הקרקע. גמר לבן, מזגן עילי, חלונות כהים, ארון שירות ותאורה עגולה לפי הסרטון. גבהים, פריסת התאורה, מיקום המזגן ודגם הריצוף משוערים.',
 noteEn:'Walls, window widths and entrance follow the ground plan. White finishes, wall AC, dark windows, service cabinet and round lights follow the video. Heights, light layout, AC position and floor product are estimated.'
};
export const isClubDestination=value=>value===RESIDENTS_CLUB.destination;
export const inResidentsClub=([x,z])=>x>.0&&x<5.85&&z>-9.65&&z<-3||x>=5.85&&x<6.2&&z>-7.5&&z<-3.75;
export function clubWindowProfile(level,opening){
 if(level!==0||Math.abs(opening.a[0]+.1492)>.04||Math.abs(opening.b[0]+.1492)>.04)return null;
 const lo=Math.min(opening.a[1],opening.b[1]),hi=Math.max(opening.a[1],opening.b[1]);
 if(lo<-9.3||hi>-3.2)return null;
 return {kind:'window',sill:1,height:1.3,source:'residents-club-video',heightInferred:true};
}
export const CLUB_SOURCE={id:'residents-club-video',kind:'gallery',he:'מועדון דיירים — תיעוד מצולם',en:'Residents’ club — recorded reference',pages:[1,2,3,4],videoPage:4,video:'/house/residents-club/298245.mp4',poster:'/house/residents-club/frame-1.jpg',videoLabelHe:'מועדון דיירים · 4 שנ׳',videoLabelEn:'Residents’ club · 4s',videoNoteHe:RESIDENTS_CLUB.noteHe,videoNoteEn:RESIDENTS_CLUB.noteEn,references:[
 {page:1,he:'מזגן ותאורת התקרה · 0.4 שנ׳',en:'Air conditioner and ceiling lights · 0.4s'},
 {page:2,he:'החלון הרחב והבליטה בקיר · 1.4 שנ׳',en:'Wide window and wall return · 1.4s'},
 {page:3,he:'החלון הקטן וארון השירות · 2.6 שנ׳',en:'Small window and service cabinet · 2.6s'}
].map(r=>({...r,image:`/house/residents-club/frame-${r.page}.jpg`,noteHe:RESIDENTS_CLUB.noteHe,noteEn:RESIDENTS_CLUB.noteEn}))};
