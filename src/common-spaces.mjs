import {RESIDENTS_CLUB} from './residents-club.mjs';
// Horizontal boundaries checked against page 3, paired vector wall faces.
export const PUMP_ROOM={id:'pump',he:'חדר משאבות',en:'Pump room',walk:[17.4,-6.25],yaw:Math.PI/2,polygon:[[13.95,-8.05],[17.199,-8.05],[17.199,-8.9],[18.249,-8.9],[18.249,-5.35],[13.95,-5.35]],doorId:'bd-0-5'};
export const LOBBY_POLYGON=[[12,-7.7],[13.75,-7.7],[13.75,-5.16],[18.45,-5.16],[18.45,-5.7],[21.74,-5.7],[21.74,-2.25],[17.45,-2.25],[17.45,-.45],[12.55,-.45],[12.55,-6.2],[12,-6.2]];
const rect=(x,z,w,d)=>[[x-w/2,z-d/2],[x+w/2,z-d/2],[x+w/2,z+d/2],[x-w/2,z+d/2]];
export const COMMON_SPACES=[
 {id:'entrance',he:'כניסה לבניין',en:'Building entrance',walk:[22.9,-4.2],yaw:Math.PI/2,polygon:rect(22.1,-4.2,4,4)},
 {id:'lobby',he:'לובי הכניסה',en:'Entrance lobby',walk:[16.3,-3.7],yaw:Math.PI/2,polygon:LOBBY_POLYGON},
 {id:'lift',he:'המעליות',en:'Elevators',walk:[12.6,-9.1],yaw:Math.PI/2,polygon:rect(12.6,-9.9,3.8,5)},
 {...RESIDENTS_CLUB,id:'club'},PUMP_ROOM,
 {id:'parking',he:'חניה ומדרכה',en:'Parking & pavement',walk:[11,25.5],yaw:0,polygon:rect(11,25.5,14,8)}
].map(s=>({...s,destination:`common:${s.id}:0`,floor:0}));
export const commonSpace=value=>COMMON_SPACES.find(s=>s.destination===value||s.id===value);
export const PUMP_OBSTACLES=[{minX:14.15,maxX:15.18,minZ:-7.8,maxZ:-5.65,pumpEquipment:true}];
export const PUMP_SOURCE={id:'pump-room-photo',kind:'gallery',he:'חדר משאבות — צילום מקור',en:'Pump room — original photo',pages:[1],references:[{page:1,image:'/house/pump-room/298244.jpg',he:'שלוש משאבות ומכל לחץ',en:'Three pumps and pressure vessel',noteHe:'הרכיבים לפי הצילום. קנה המידה, כיוון ההצבה וחיבורים שאינם נראים אינם מאומתים. התאורה היא הצעת סימולטור.',noteEn:'Visible components follow the photo. Scale, placement orientation and concealed connections are unverified. Lighting is a simulator placeholder.'}]};
