export const SUPPORT_KINDS=new Set(['tv_console','dresser','nightstand','desk','dining','bench','coffee','side_table','kitchen_base','console_table','sideboard','kitchen_island','storage_bench','kitchen_base_doors']);
export const TV_KINDS=new Set(['tv_wall','tv_stand']);
export const localPoint=(r,x,z)=>{const c=Math.cos(r.yaw),s=Math.sin(r.yaw),dx=x-r.x,dz=z-r.z;return [dx*c-dz*s,dx*s+dz*c];};
export function normalizeAttachment(value,kind){
 if(value==null)return null;
 if(value.mode==='wall'&&Number.isInteger(value.turns??0))return {mode:'wall',...(value.turns?{turns:((value.turns%4)+4)%4}:{})};
 if(value.mode==='top'&&kind==='tv_stand'&&typeof value.supportId==='string'&&/^[\w-]{1,70}$/.test(value.supportId)&&Array.isArray(value.offset)&&value.offset.length===2&&value.offset.every(n=>Number.isFinite(n)&&Math.abs(n)<10)&&Number.isFinite(value.yaw))return {mode:'top',supportId:value.supportId,offset:value.offset.map(n=>Math.round(n*10000)/10000),yaw:((value.yaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2)};
 throw Error('חיבור הרהיט לקיר או לשידה אינו תקין.');
}
export function resolveAttachments(items){
 const byId=new Map(items.map(r=>[r.id,r]));return items.map(r=>{const a=r.attachment;if(a?.mode!=='top')return r;const host=byId.get(a.supportId);if(!host||host.id===r.id||!SUPPORT_KINDS.has(host.kind)||host.attachment?.mode==='top')throw Error('השידה שתומכת בטלוויזיה אינה קיימת או אינה מתאימה.');const [x,z]=a.offset,c=Math.cos(host.yaw),s=Math.sin(host.yaw),round=n=>Math.round(n*10000)/10000;return {...r,x:round(host.x+x*c+z*s),z:round(host.z-x*s+z*c),y:round((host.y||0)+host.h+.008),yaw:round(host.yaw+a.yaw)};});
}
export function supportFits(tv,host){
 if(!host||!SUPPORT_KINDS.has(host.kind))return false;
 // The screen may overhang; the complete actual stand/foot must be supported.
 const c=Math.cos(tv.yaw),s=Math.sin(tv.yaw);for(const x of [-tv.w*.25,tv.w*.25])for(const z of [-tv.d/2,tv.d/2]){const [a,b]=localPoint(host,tv.x+x*c+z*s,tv.z-x*s+z*c);if(Math.abs(a)>host.w/2-.012||Math.abs(b)>host.d/2-.012)return false;}return true;
}
export const removeFurnitureWithDependents=(items,id)=>items.filter(r=>r.id!==id&&r.attachment?.supportId!==id);
export const verticalOverlap=(a,b)=>Math.min((a.y||0)+a.h,(b.y||0)+b.h)-Math.max(a.y||0,b.y||0)>.005;
