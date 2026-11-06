import clipping from 'polygon-clipping';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {APARTMENT_BATHROOMS} from '../src/apartment-bathroom-layout.mjs';
import {APARTMENT_FURNITURE} from '../src/apartment-furniture-layout.mjs';
import {groundBaseProfile,groundPoint} from '../src/ground-apartments.mjs';
import {connectedWallRuns,wallFootprint} from '../src/building-geometry.mjs';
import {COMMON_SPACES} from '../src/common-spaces.mjs';
import {furnitureContext} from './neighbour-furniture-tools.mjs';
import {interiorLabel} from '../public-view/tour-map.mjs';

const round=n=>Math.round(n*1000)/1000;
function componentPolygons(room){
 const rows=new Map();for(const i of room.cells){const [x,z]=room.xy(i),key=Math.round(z*10);if(!rows.has(key))rows.set(key,[]);rows.get(key).push(Math.round(x*10));}
 const runs=[];for(const [z,xs] of rows){xs.sort((a,b)=>a-b);let start=xs[0],end=start;
  const emit=()=>runs.push([[[round((start-.5)/10),round((z-.5)/10)],[round((end+.5)/10),round((z-.5)/10)],[round((end+.5)/10),round((z+.5)/10)],[round((start-.5)/10),round((z+.5)/10)]]]);
  for(const x of xs.slice(1)){if(x>end+1){emit();start=x;}end=x;}emit();
 }
 return clipping.union(...runs);
}
function nearer(poly,p,q){
 const n=[q[0]-p[0],q[1]-p[1]],limit=(q[0]**2+q[1]**2-p[0]**2-p[1]**2)/2,value=v=>v[0]*n[0]+v[1]*n[1]-limit,out=[];
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],va=value(a),vb=value(b);if(va<=0)out.push(a);if((va<=0)!==(vb<=0)){const t=va/(va-vb);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}
 return out;
}

// Ground rooms use the registered source architecture. Upper enclosed rooms
// use real partitions/thresholds; the two names in an open lounge/kitchen are
// divided by proximity to their source-registered furnishing anchors.
export function createPublicRoomMaps(){
 const result=new Map(),profile=groundBaseProfile();
 for(const f of BUILDING_FLOORS){const rooms=[];
  if(f.level===0){
   for(const unit of f.units)for(const r of profile.rooms){rooms.push({id:`${unit.number}:${r.id}`,unit:unit.number,he:r.he,kind:r.kind,label:groundPoint(unit.number,r.id==='hall'?r.walk:interiorLabel(r.polygon)),polygons:[r.polygon.map(p=>groundPoint(unit.number,p))]});}
   for(const c of COMMON_SPACES)rooms.push({id:c.id,he:c.he||c.nameHe,kind:'common',label:c.walk,polygons:[c.polygon]});
  }else{
   const source=BUILDING_INTERIORS.floors[f.level],walls=connectedWallRuns(source,f).map(wallFootprint),sliders=f.envelope.flatMap(p=>p.openings.filter(o=>o.kind==='slider'));
   for(const unit of f.units){
    const ctx=furnitureContext({polygon:unit.polygon,walls,doors:source.doors,sliders}),groups=new Map();
    for(const p of [...APARTMENT_FURNITURE,...APARTMENT_BATHROOMS].filter(p=>p.floor===f.level&&p.unit===unit.number&&(['bed','kitchen','sofa','basin'].includes(p.kind)||p.mapRoom))){
     const point=p.kind==='bed'?p.seed:[p.x,p.z],room=ctx.room(point),key=room.cells[0];if(!groups.has(key))groups.set(key,{room,entries:[]});
     const kind=p.mapRoom?'utility':p.kind==='bed'?'bedroom':p.kind==='sofa'?'living':p.kind==='basin'?'bathroom':'kitchen',he=p.roomHe||(p.kind==='bed'?(p.master?'חדר הורים':'חדר שינה'):p.kind==='sofa'?'סלון':p.kind==='basin'?'חדר רחצה':'מטבח');
     if(!groups.get(key).entries.some(e=>e.kind===kind))groups.get(key).entries.push({id:p.id,unit:unit.number,kind,he,label:point});
    }
    for(const {room,entries} of groups.values()){
     const shape=componentPolygons(room),points=shape.flat(2),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
     for(const e of entries){let region=[[Math.min(...xs)-1,Math.min(...zs)-1],[Math.max(...xs)+1,Math.min(...zs)-1],[Math.max(...xs)+1,Math.max(...zs)+1],[Math.min(...xs)-1,Math.max(...zs)+1]];
      for(const other of entries)if(other!==e)region=nearer(region,e.label,other.label);
      const polygons=region.length>=3?clipping.intersection(shape,[region]).map(rings=>rings[0].map(p=>p.map(round))):[];
      if(polygons.length)rooms.push({...e,polygons});
     }
    }
   }
  }
  result.set(f.level,rooms);
 }
 return result;
}
