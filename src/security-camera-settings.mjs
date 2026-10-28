// Centre of the model's inter-storey slab band; site height is not surveyed.
export const CAMERA_BAND_HEIGHT=3.10-.25/2;
export const CAMERA_SPEC={model:'NVS8-8MB4',horizontal:87,vertical:44,width:3840,height:2160,source:'https://reolink.com/us/product/nvs8-8mb4/'};
export const CAMERA_DEFAULTS=[
 {id:'C1',wall:'west',t:.94,normal:[-1,0],yaw:-105,tilt:24,height:CAMERA_BAND_HEIGHT,color:'#168172',label:'חלונות מערב ומטבח חוץ'},
 {id:'C2',wall:'service-porch-return',t:.94,normal:[-1,0],yaw:95,tilt:18,height:CAMERA_BAND_HEIGHT,color:'#be6c27',label:'חצר שירות ומחסן'},
 {id:'C3',wall:'south',t:.96,normal:[0,1],yaw:149,tilt:24,height:CAMERA_BAND_HEIGHT,color:'#596ac7',label:'חלון דרומי, חניות 24–25 ופינת הפחים'}
];
const bounded=(v,base,lo,hi)=>Number.isFinite(v)?Math.max(lo,Math.min(hi,v)):base;
export function normalizeCameraPlan(value={}){return Object.fromEntries(CAMERA_DEFAULTS.map(c=>{const saved=value?.[c.id]||{},v=(c.id==='C2'&&saved.mount!==c.wall)||(c.id==='C3'&&saved.placementRevision!==78)?{}:saved;return [c.id,{mount:c.wall,heightRevision:78,...(c.id==='C3'?{placementRevision:78}:{}),t:bounded(v.t,c.t,.04,.96),yaw:bounded(v.yaw,c.yaw,-180,180),tilt:bounded(saved.heightRevision===78?v.tilt:undefined,c.tilt,0,55),height:bounded(saved.heightRevision===78?v.height:undefined,c.height,2.85,3.10)}];}));}
