import {Vector3} from 'three';
const down=new Vector3(0,-1,0);
export function visibleHits(ray,meshes,origin,direction,far){ray.set(origin,direction);ray.far=far;return ray.intersectObjects(meshes,false).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});}
const origin=new Vector3(),direction=new Vector3();
const obstacleQuery={any:true},floorQuery={floor:true};
export function stepWalker(position,dx,dz,meshes,ray){
 const length=Math.hypot(dx,dz);if(!length)return false;
 direction.set(dx/length,0,dz/length);
 const indexed=typeof meshes.firstHit==='function';
 for(const height of [.3,.5,1.2]){
  origin.copy(position);origin.y+=height-1.62;ray.set(origin,direction);ray.far=length+.18;
  if(indexed?meshes.firstHit(ray,obstacleQuery):visibleHits(ray,meshes,origin,direction,ray.far).length)return false;
 }
 origin.set(position.x+dx,position.y-1.62+.32,position.z+dz);ray.set(origin,down);ray.far=.72;
 const floor=indexed?meshes.firstHit(ray,floorQuery):visibleHits(ray,meshes,origin,down,.72).find(h=>h.face&&Math.abs(h.face.normal.y)>.65);
 if(!floor)return false;position.x+=dx;position.z+=dz;position.y=floor.point.y+1.62;return true;
}
