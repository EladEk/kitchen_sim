import {inside} from './navigation.mjs';

export function roomEnvironmentKey(data,location,overrides){
 if(!location?.building)return null;
 const floor=data?.floors.find(f=>f.level===location.floor),base=`${location.building}:${location.floor}:${location.unit||''}`;
 const layer=overrides?.get(base)?.layer||floor?.map,p=[location.position.x,location.position.z];
 const room=layer?.rooms?.find(r=>(!location.unit||r.unit===location.unit)&&r.polygons.some(poly=>inside(p,poly)));
 return base+':'+(room?.id||'common');
}

// R105: room-cube replacement is disabled in walking mode. Swapping the
// entire IBL between a newly captured room and the blue sky caused colour
// flashes at doorways, plus extra offscreen work on phones. Keep this small
// compatibility controller so older imports cannot re-enable that path.
export function createRoomEnvironment(){
 return {update:()=>false,invalidate(){},trim(){},dispose(){},get stats(){return {size:0,targets:0,filtered:0,face:null,failed:false};}};
}

export function roomLightingRegion(data,location,overrides){
 if(!location?.building)return null;
 const floor=data?.floors.find(f=>f.level===location.floor),base=`${location.building}:${location.floor}:${location.unit||''}`,p=[location.position.x,location.position.z];if(!floor)return null;
 const layer=overrides?.get(base)?.layer||floor.map;
 const room=layer?.rooms?.find(r=>(!location.unit||r.unit===location.unit)&&r.polygons.some(poly=>inside(p,poly)));
 const shared=data.destinations?.find(d=>!d.unit&&d.floor===location.floor&&d.polygon&&inside(p,d.polygon));
 const poly=room?.polygons.find(poly=>inside(p,poly))||shared?.polygon||floor.units.find(u=>u.number===location.unit)?.polygon||floor.core;
 if(!poly?.length)return null;
 let centre=room?.label||shared?.position;
 if(!centre||!inside(centre,poly)){
  const xs=poly.map(p=>p[0]),zs=poly.map(p=>p[1]);centre=[(Math.min(...xs)+Math.max(...xs))/2,(Math.min(...zs)+Math.max(...zs))/2];
  if(!inside(centre,poly))centre=p;
 }
 const ground=shared?.elevation??floor.elevation??floor.level*data.storey;
 return {key:base+':'+(room?.id||shared?.id||'common'),position:[centre[0],ground+2.55,centre[1]],target:[centre[0],ground,centre[1]]};
}
