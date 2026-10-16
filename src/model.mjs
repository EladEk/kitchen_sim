// All dimensions in millimetres, transcribed from Anise order 167968, 15.10.2026.
// x follows the 5450 wall; z follows the 3300 return; y is height.
export const ROOM = { long: 5450, short: 3300, height: 2600, depth: 590, counterDepth: 620, plinth: 120, body: 754, worktop: 912, upperBottom: 1500, upperHeight: 900, upperDepth: 320 };
export const LONG = [
 { id:'corner', name:'Corner return', he:'פינה', w:660, type:'corner' },
 { id:'drawers-90', name:'Three-drawer cabinet', he:'שלוש מגירות', w:900, type:'drawers' },
 { id:'sink', name:'Sink cabinet · double doors', he:'ארון כיור · שתי דלתות', w:700, type:'sink' },
 { id:'dishwasher', name:'Integrated dishwasher', he:'מדיח אינטגרלי', w:600, type:'dishwasher' },
 { id:'storage-57', name:'Door · two internal drawers', he:'דלת · שתי מגירות פנימיות', w:570, type:'door', internalDrawers:2, hinge:'right' },
 { id:'hob', name:'Cooktop · three drawers', he:'כיריים · שלוש מגירות', w:900, type:'hob' },
 { id:'pullout', name:'Bottle pull-out · two levels', he:'מגירת בקבוקים · שני מפלסים', w:500, type:'pullout', internalDrawers:2 },
 { id:'panel', name:'Side panel', he:'דופן', w:20, type:'panel' },
 { id:'oven', name:'Oven tower', he:'מגדל תנור', w:600, type:'oven' }
].map((m,i,a)=>({...m,x:a.slice(0,i).reduce((n,c)=>n+c.w,0),wall:'long',h:m.type==='oven'?2400:874,d:590}));
export const SHORT = [
 { id:'fridge', name:'Refrigerator niche', he:'נישת מקרר', w:1040, type:'fridge' },
 { id:'pantry', name:'Full-height pantry · Touch doors', he:'מזווה גבוה · דלתות Touch', w:600, type:'pantry', doors:2, defaultShelves:5, hinge:'left' },
 { id:'drawers-60', name:'Three-drawer cabinet', he:'שלוש מגירות', w:600, type:'drawers' },
 { id:'mixer', name:'Mixer lift cabinet', he:'מנגנון הרמה למיקסר', w:400, type:'door', hinge:'left', mixerLift:true },
 { id:'corner-return', name:'Corner return', he:'פינה', w:660, type:'corner' }
].map((m,i,a)=>({...m,z:ROOM.short-a.slice(0,i+1).reduce((n,c)=>n+c.w,0),wall:'short',h:['fridge','pantry'].includes(m.type)?2400:874,d:590}));
export const UPPERS = [480,1000,900,900,480].map((w,i,a)=>({id:'upper-'+i,name:'Touch upper cabinet',he:'ארון עליון Touch',w,x:1090+a.slice(0,i).reduce((n,c)=>n+c,0),wall:'long',type:'upper',h:900,d:320,doors:w>600?2:1,shelves:2,hinge:i===0||i===4?'right':'left'}));
export const ISLAND = { x:2180, z:1600, width:2440, depth:900, baseWidth:2400, baseDepth:590, height:912, xSource:'Estimated from the scaled countertop drawing', zSource:'Estimated from the scaled countertop drawing' };
export const ISLAND_UNITS = [400,1000,1000].map((w,i,a)=>({id:'island-'+i,name:i===0?'Island · three wire baskets':'Island · three drawers',he:i===0?'אי · שלוש סלסלות רשת':'אי · שלוש מגירות',w,x:ISLAND.x+20+a.slice(0,i).reduce((n,c)=>n+c,0),wall:'island',type:i===0?'baskets':'drawers',h:754,d:590,baskets:i===0?3:0,hinge:'left'}));
export const WINDOW = { x:610, width:390, sill:1100, height:1000, approximate:true };
export const MATERIALS = [
 { id:'chalk',name:'Chalk',he:'לבן גיר',color:'#e4e1d9' },
 { id:'linen',name:'Linen',he:'פשתן',color:'#c9c2b5' },
 { id:'sand',name:'Soft sand',he:'חול',color:'#b6a58e' },
 { id:'sage',name:'Sage',he:'מרווה',color:'#858e7d' },
 { id:'graphite',name:'Graphite',he:'גרפיט',color:'#424844' },
 { id:'oak',name:'Natural oak',he:'אלון טבעי',color:'#b8956a',wood:true }
];
export const STONES = [
 {id:'taj',name:'Taj Mahal',he:'טאג׳ מהאל',color:'#d5cbb7'},
 {id:'calacatta',name:'Calacatta',he:'קלקטה',color:'#edebe4'},
 {id:'basalt',name:'Basalt',he:'בזלת',color:'#535653'}
];
export const DEFAULTS={base:'chalk',upper:'chalk',stone:'taj',hardware:'black',floor:'warm',light:'day',intensity:70,led:true,dimensions:false,labels:false,openParts:[],selected:null,view:'perspective',lang:'en'};
export const PRESETS={original:{base:'chalk',upper:'chalk',stone:'calacatta',hardware:'black'},oak:{base:'oak',upper:'chalk',stone:'taj',hardware:'brass'},warm:{base:'linen',upper:'chalk',stone:'taj',hardware:'brass'}};
export function getModule(id){ return [...LONG,...SHORT,...UPPERS,...ISLAND_UNITS].find(m=>m.id===id); }
export function clearance(island=ISLAND){return {workAisle:island.z-ROOM.counterDepth,returnAisle:island.x-ROOM.counterDepth};}
export function snapshot(settings){return {schema:1,modelRevision:5,plan:'Anise drawing 167968 + technical order 168947 + Siemens EX875LYV1E / Elica BOXIN LX 90 sheets',units:'mm',dimensions:{room:ROOM,island:ISLAND,window:WINDOW},settings};}

export const ALL_CABINETS=[...LONG.filter(m=>m.type!=='panel'),...SHORT.filter(m=>m.type!=='corner'),...UPPERS,...ISLAND_UNITS];
export const OPENABLE_IDS=ALL_CABINETS.map(m=>m.id);
