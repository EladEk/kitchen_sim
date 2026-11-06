import {Vector3,Raycaster} from 'three';
import {buildingTransform} from './district.mjs';

// Resolve every spawn against the same physical floor and body clearance used
// by the tour, including lowered service rooms and rotated/reflected copies.
export function destinationStandingPose(destination,nav,building,world){
 const matrix=buildingTransform(building),base=destination.elevation??destination.floor*nav.storey,ray=new Raycaster(),direction=new Vector3();
 for(const [dx,dz] of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3],[.3,.3],[-.3,-.3]]){
  const position=new Vector3(destination.position[0]+dx,base+1.62,destination.position[1]+dz).applyMatrix4(matrix);
  ray.set(position.clone().add(new Vector3(0,-1.3,0)),new Vector3(0,-1,0));ray.far=.8;
  const floor=world.firstHit(ray,{floor:true});if(!floor||Math.abs(floor.point.y-base)>.28)continue;
  position.y=floor.point.y+1.62;if(world.canStand&&!world.canStand(position))continue;let clear=true;
  for(const height of [.5,1.2])for(let i=0;i<8;i++){
   direction.set(Math.cos(i*Math.PI/4),0,Math.sin(i*Math.PI/4));ray.set(new Vector3(position.x,position.y-1.62+height,position.z),direction);ray.far=.19;
   if(world.firstHit(ray,{any:true})){clear=false;break;}
  }
  if(clear){const facing=new Vector3(-Math.sin(destination.yaw||0),0,-Math.cos(destination.yaw||0)).transformDirection(matrix);return {position,yaw:Math.atan2(-facing.x,-facing.z),destination:destination.id};}
 }
 return null;
}

export function safeTourDestination(nav,where,buildings,world){
 const building=buildings.find(b=>b.id===where.building)||buildings[0],candidates=nav.destinations.filter(d=>d.floor===(where.floor||0));
 candidates.sort((a,b)=>(a.unit===where.unit?-100:0)-(b.unit===where.unit?-100:0));
 for(const destination of candidates){const pose=destinationStandingPose(destination,nav,building,world);if(pose)return pose;}
 return destinationStandingPose(nav.destinations.find(d=>d.id==='lobby')||nav.destinations[0],nav,building,world);
}

export async function captureTourImage(renderer,scene,camera,presentation,{maxEdge=2048}={}){
 const size=renderer.getSize({set(x,y){this.x=x;this.y=y;return this;}}),ratio=renderer.getPixelRatio(),scale=Math.min(2,maxEdge/Math.max(size.x,size.y));
 try{
  renderer.setPixelRatio(scale);renderer.setSize(size.x,size.y,false);renderer.render(scene,camera);
  return await new Promise((resolve,reject)=>renderer.domElement.toBlob(blob=>blob?resolve(blob):reject(Error('Image export failed')),'image/png'));
 }finally{renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);presentation.resize(size.x,size.y);}
}

export function readTourViews(storage,key){
 try{const values=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(values))return [];return values.filter(v=>typeof v.id==='string'&&typeof v.name==='string'&&Array.isArray(v.position)&&v.position.length===3&&v.position.every(n=>Number.isFinite(n)&&Math.abs(n)<10000)&&Number.isFinite(v.yaw)&&Number.isFinite(v.pitch)).slice(-12).map(v=>({...v,name:v.name.slice(0,60),pitch:Math.max(-1.25,Math.min(1.25,v.pitch))}));}catch{return [];}
}
