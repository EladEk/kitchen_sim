import {inside} from './navigation.mjs';

export function polygonPath(polygon){return polygon.length?'M'+polygon.map(p=>p.join(',')).join('L')+'Z':'';}
export function polygonBounds(polygons,pad=0){const points=polygons.flat(),x=points.map(p=>p[0]),z=points.map(p=>p[1]);return points.length?{minX:Math.min(...x)-pad,minZ:Math.min(...z)-pad,maxX:Math.max(...x)+pad,maxZ:Math.max(...z)+pad}:{minX:0,minZ:0,maxX:1,maxZ:1};}
function overlaps(polygon,b){const a=polygonBounds([polygon]);return a.minX<=b.maxX&&a.maxX>=b.minX&&a.minZ<=b.maxZ&&a.maxZ>=b.minZ;}
export function interiorLabel(polygon){
 const b=polygonBounds([polygon]),center=[(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2];if(inside(center,polygon))return center;
 // A concave unit's arithmetic centroid can fall in the shared corridor.
 for(let z=b.minZ+.3;z<b.maxZ;z+=.4)for(let x=b.minX+.3;x<b.maxX;x+=.4)if(inside([x,z],polygon))return [x,z];return polygon[0];
}
export function tourMapKey(where){return `${where.building||''}:${where.floor??0}:${where.unit||''}`;}
export function mapIsVisible(choice,where){return choice?.key===tourMapKey(where)?choice.open:!!(where.building&&where.unit);}
export function roomAtMap(plan,point){return plan?.rooms?.find(r=>r.polygons.some(p=>inside(point,p)))||null;}
export function zoomMapView(base,current,factor,anchor=null){
 const [bx,bz,bw,bh]=base,[x,z,w,h]=current,scale=Math.max(1,Math.min(5,bw/w*factor)),nw=bw/scale,nh=bh/scale,a=anchor||[x+w/2,z+h/2],rx=(a[0]-x)/w,rz=(a[1]-z)/h;
 return [Math.max(bx,Math.min(bx+bw-nw,a[0]-nw*rx)),Math.max(bz,Math.min(bz+bh-nh,a[1]-nh*rz)),nw,nh];
}
export function mapForLocation(data,where,overrides=new Map()){
 if(!where.building)return null;const floor=data?.floors.find(f=>f.level===where.floor);if(!floor)return null;
 const unit=floor.units.find(u=>u.number===where.unit),override=unit?overrides.get(tourMapKey(where)):null;
 const units=unit?[unit]:floor.units,polygons=override?.polygons||units.flatMap(u=>u.displayPolygons||[u.polygon]);
 const bounds=polygonBounds(unit?polygons:[...polygons,floor.core],.55),layer=override?.layer||floor.map||{walls:[],furniture:[],doors:[]};
 return {floor:floor.level,unit:unit?.number,viewBox:[bounds.minX,bounds.minZ,bounds.maxX-bounds.minX,bounds.maxZ-bounds.minZ].join(' '),clip:unit?polygons.map(polygonPath).join(''):null,
  units:units.map(u=>({number:u.number,path:(override?.polygons||u.displayPolygons||[u.polygon]).map(polygonPath).join(''),label:interiorLabel(u.polygon)})),core:polygonPath(floor.core),
  walls:layer.walls.filter(p=>overlaps(p,bounds)).map(polygonPath).join(''),furniture:layer.furniture.filter(f=>overlaps(f.polygon,bounds)).map(f=>({kind:f.kind,path:polygonPath(f.polygon)})),
  rooms:(layer.rooms||[]).filter(r=>(!unit||r.unit===unit.number)&&r.polygons.some(p=>overlaps(p,bounds))).map(r=>({...r,path:r.polygons.map(polygonPath).join('')})),originalPlan:override?.originalPlan,
  doors:layer.doors.filter(d=>overlaps(d.closed,bounds)||overlaps(d.open,bounds)).map(d=>({...d,closed:polygonPath(d.closed),open:polygonPath(d.open)}))};
}

// The floor plan stays fixed in the building's axes. Apply the inverse rigid
// transform to position AND look vector, including the two mirrored buildings.
export function localMapPose(position,direction,inverse){
 const p=position.clone().applyMatrix4(inverse),d=direction.clone().transformDirection(inverse);
 return {position:[p.x,p.z],heading:Math.atan2(d.x,-d.z)*180/Math.PI};
}
