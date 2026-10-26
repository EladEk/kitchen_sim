export const CAMERA_SPEC={model:'NVS8-8MB4',horizontal:87,vertical:44,width:3840,height:2160,source:'https://reolink.com/us/product/nvs8-8mb4/'};
export const CAMERA_DEFAULTS=[
 {id:'C1',wall:'west',t:.94,normal:[-1,0],yaw:-105,tilt:16,height:2.55,color:'#168172',label:'חלונות מערב ומטבח חוץ'},
 {id:'C2',wall:'service-porch-return',t:.94,normal:[-1,0],yaw:95,tilt:18,height:2.4,color:'#be6c27',label:'חצר שירות ומחסן'},
 {id:'C3',wall:'south',t:.04,normal:[0,1],yaw:40,tilt:12,height:2.55,color:'#596ac7',label:'חניות 24–25 וחזית דרומית'}
];
const bounded=(v,base,lo,hi)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):base;
export function normalizeCameraPlan(value={}){return Object.fromEntries(CAMERA_DEFAULTS.map(c=>{const saved=value?.[c.id]||{},v=c.id==='C2'&&saved.mount!==c.wall?{}:saved;return [c.id,{mount:c.wall,t:bounded(v.t,c.t,.04,.96),yaw:bounded(v.yaw,c.yaw,-180,180),tilt:bounded(v.tilt,c.tilt,0,55),height:bounded(v.height,c.height,c.id==='C2'?2.2:2.4,2.7)}];}));}
