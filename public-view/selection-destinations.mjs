import {inside} from './navigation.mjs';
import {interiorLabel} from './tour-map.mjs';

const cache=new WeakMap();
function destinations(nav){
 if(!cache.has(nav)){
  const all=[...(nav.destinations||[])],ids=new Set(all.map(d=>d.id));
  for(const floor of nav.floors||[])for(const unit of floor.units||[]){
   const id=`unit:${unit.number}:${floor.level}`;if(ids.has(id))continue;
   const primary=all.find(d=>d.unit===unit.number),position=primary?.position&&inside(primary.position,unit.polygon)?primary.position:interiorLabel(unit.polygon);
   all.push({...primary,id,unit:unit.number,floor:floor.level,elevation:floor.elevation??floor.level*nav.storey,polygon:unit.polygon,position:[...position],yaw:primary?.yaw||0,label:primary?.label||`דירה ${unit.number}`});ids.add(id);
  }
  cache.set(nav,{all,levels:new Map()});
 }
 return cache.get(nav);
}
export function resolveSelectionDestination(nav,id){return nav?destinations(nav).all.find(d=>d.id===id):undefined;}
export function selectionDestinations(nav,level=9){
 if(!nav)return [];
 if(Number(level)===9)return nav.destinations||[];
 const entry=destinations(nav),n=Number(level);if(!entry.levels.has(n))entry.levels.set(n,entry.all.filter(d=>d.floor===n));return entry.levels.get(n);
}
