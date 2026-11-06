import {FURNITURE_TYPES} from './apartment-editing.mjs';
import {dimensionedFurnitureParts} from '../src/dimensioned-furniture.mjs';
import {furniturePartColor} from './furniture-palette.mjs';
export const FURNITURE_CATEGORIES=Object.freeze([
 {id:'seating',he:'ישיבה',cover:'sofa',kinds:['sofa','corner_sofa','loveseat','chaise_longue','armchair','ottoman','chair','office_chair','bar_stool','bench']},
 {id:'beds',he:'מיטות',cover:'double_bed',kinds:['bed','double_bed','bunk_bed','daybed']},
 {id:'storage',he:'ארונות ואחסון',cover:'wardrobe',kinds:['wardrobe','sliding_wardrobe','wardrobe_open','wardrobe_drawers','service_cabinet','wall_storage','cube_storage','bookcase','shoe_cabinet','nightstand','dresser','sideboard','storage_bench']},
 {id:'tables',he:'שולחנות',cover:'desk',kinds:['desk','dining','coffee','side_table','console_table']},
 {id:'television',he:'טלוויזיות ושידות',cover:'media',kinds:['tv_console','media','tv_wall','tv_stand']},
 {id:'kitchen',he:'מטבח',cover:'kitchen_base',kinds:['kitchen_base','kitchen_base_doors','kitchen_sink','kitchen_corner','kitchen_pantry','kitchen_oven_tower','kitchen_wall','kitchen_wall_glass','kitchen_hood_cabinet','kitchen_open_shelf','kitchen_tall','kitchen_island']},
 {id:'appliances',he:'מכשירי חשמל',cover:'fridge',kinds:['fridge','oven','washer','dishwasher']}
]);
export const categoryForKind=kind=>FURNITURE_CATEGORIES.find(c=>c.kinds.includes(kind))?.id||null;
const cache=new Map(),project=([x,y,z])=>[(x-z)*.866,-y+(x+z)*.34],shade=(hex,f)=>'#'+hex.slice(1).match(/../g).map(v=>Math.min(255,Math.round(parseInt(v,16)*f)).toString(16).padStart(2,'0')).join('');
// Isometric illustrations are made from the same dimensioned model parts as
// the furniture in the room. No separate, misleading product photos or GPU.
export function furnitureThumbnail(kind,values={}){
 const def=FURNITURE_TYPES[kind];if(!def)return '';
 const [W,D,H]=def.size,item={kind,w:Number.isFinite(values.w)&&values.w>0?values.w:W/100,d:Number.isFinite(values.d)&&values.d>0?values.d:D/100,h:Number.isFinite(values.h)&&values.h>0?values.h:H/100,color:values.color,...(kind==='corner_sofa'?{seatDepth:values.seatDepth,cornerSide:values.cornerSide}:{})},key=JSON.stringify(item);if(cache.has(key))return cache.get(key);
 const polygons=[];
 for(const part of dimensionedFurnitureParts(item)){
  const [x,y,z,w,h,d]=part.box,c=furniturePartColor(item,part),points=[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1],[-1,1,-1],[1,1,-1],[1,1,1],[-1,1,1]].map(([a,b,e])=>[x+a*w/2,y+b*h/2,z+e*d/2]);
  for(const [indices,f]of [[[4,5,6,7],1.12],[[1,2,6,5],.83],[[2,3,7,6],1]]){const world=indices.map(i=>points[i]);polygons.push({points:world.map(project),fill:shade(c,f),opacity:part.material==='glass'?.34:1,depth:world.reduce((n,p)=>n+p[0]+p[2]+p[1]*.1,0)/4});}
 }
 polygons.sort((a,b)=>a.depth-b.depth);const all=polygons.flatMap(p=>p.points),xs=all.map(p=>p[0]),ys=all.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,scale=Math.min(112/(w||1),88/(h||1)),dx=70-(x+w/2)*scale,dy=53-(y+h/2)*scale;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 110"><title>${def.he}</title><rect width="140" height="110" rx="12" fill="#f2f0e8"/><ellipse cx="70" cy="96" rx="48" ry="7" fill="#283b2e" opacity=".09"/><g stroke="#34473a" stroke-opacity=".14" stroke-width=".6" stroke-linejoin="round">${polygons.map(p=>`<polygon fill="${p.fill}" fill-opacity="${p.opacity}" points="${p.points.map(([a,b])=>(a*scale+dx).toFixed(2)+','+(b*scale+dy).toFixed(2)).join(' ')}"/>`).join('')}</g></svg>`;
 const uri='data:image/svg+xml,'+encodeURIComponent(svg);if(cache.size>96)cache.delete(cache.keys().next().value);cache.set(key,uri);return uri;
}
