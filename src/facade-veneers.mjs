import * as THREE from 'three';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';

// A continuous outer skin hides the tiny ends of perpendicular plaster walls.
// Rows follow the existing solid wall spans, so doors/windows stay open.
export function facadeSkinRows(row,faces,{positiveFace=4,negativeFace=5,vertical=false,datum=3.1}={}){
 const [x,y,z,w,h,d,angle=0]=row,skin=[],belt=[];
 for(const sign of [-1,1]){
  if(!faces[sign>0?positiveFace:negativeFace])continue;
  const normal=vertical?[1,0]:[Math.sin(angle),Math.cos(angle)],offset=sign*((vertical?w:d)/2+.008),cx=x+normal[0]*offset,cz=z+normal[1]*offset;
  skin.push([cx,y,cz,vertical?.008:w,h,vertical?d:.008,angle]);
  const lo=Math.max(y-h/2,datum-.0375),hi=Math.min(y+h/2,datum-.0025);
  if(hi>lo+.001)belt.push([cx+normal[0]*sign*.005,(lo+hi)/2,cz+normal[1]*sign*.005,vertical?.002:w,hi-lo,vertical?d:.002,angle]);
 }
 return {skin,belt};
}
export function appendFacadeVeneers(parent,rows,material,resources,{geometry=null,part='exterior-stone-skin',level=0}={}){
 if(!rows.length)return null;
 rows=unionFacadePanels(rows);
 const cube=geometry||new THREE.BoxGeometry(1,1,1);if(!geometry)resources.push(cube);
 installBuildingSurfaceUVs(material);
 const mesh=new THREE.InstancedMesh(cube,material,rows.length),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),q=new THREE.Quaternion(),s=new THREE.Vector3();
 rows.forEach(([x,y,z,w,h,d,angle=0],i)=>{matrix.compose(p.set(x,y,z),q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle),s.set(w,h,d));mesh.setMatrixAt(i,matrix);});
 mesh.name=part;mesh.userData={part,buildingFloor:level,tourNonPhysical:true};mesh.castShadow=false;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);resources.push(mesh);return mesh;
}

// Several traced wall runs can describe the same exterior face. Their thin
// veneers must form one non-overlapping cover, not competing depth surfaces.
// Union only coplanar cosmetic panels; never union the actual collision walls.
export function unionFacadePanels(rows){
 const groups=new Map(),snap=v=>Math.round(v*1e6)/1e6;
 for(const [x,y,z,w,h,d,rotation=0]of rows){
  const swapped=d>w,length=swapped?d:w,depth=swapped?w:d;
  let angle=rotation+(swapped?Math.PI/2:0);angle=((angle%Math.PI)+Math.PI)%Math.PI;if(Math.abs(angle-Math.PI)<1e-6)angle=0;
  const tangent=[Math.cos(angle),-Math.sin(angle)],normal=[Math.sin(angle),Math.cos(angle)],along=x*tangent[0]+z*tangent[1],plane=x*normal[0]+z*normal[1],key=[snap(angle),snap(depth)].join(':');
  if(!groups.has(key))groups.set(key,[]);const planes=groups.get(key);let group=planes.find(g=>Math.abs(g.plane-plane)<=.001001);
  if(!group){group={angle,depth,plane,tangent,normal,rectangles:[]};planes.push(group);}
  group.rectangles.push({a:along-length/2,b:along+length/2,lo:y-h/2,hi:y+h/2});
 }
 const result=[];
 for(const {angle,depth,plane,tangent,normal,rectangles}of [...groups.values()].flat()){
  const heights=[...new Set(rectangles.flatMap(r=>[snap(r.lo),snap(r.hi)]))].sort((a,b)=>a-b),panels=[];let previous=new Map();
  for(let i=1;i<heights.length;i++){
   const lo=heights[i-1],hi=heights[i],middle=(lo+hi)/2,spans=rectangles.filter(r=>r.lo<middle&&r.hi>middle).map(r=>[r.a,r.b]).sort((a,b)=>a[0]-b[0]),merged=[];
   for(const span of spans){const last=merged.at(-1);if(last&&span[0]<=last[1]+1e-6)last[1]=Math.max(last[1],span[1]);else merged.push([...span]);}
   const current=new Map();for(const [a,b]of merged){const key=[snap(a),snap(b)].join(':'),old=previous.get(key);if(old&&Math.abs(old.hi-lo)<1e-6){old.hi=hi;current.set(key,old);}else{const panel={a,b,lo,hi};panels.push(panel);current.set(key,panel);}}previous=current;
  }
  for(const {a,b,lo,hi}of panels){const along=(a+b)/2;result.push([tangent[0]*along+normal[0]*plane,(lo+hi)/2,tangent[1]*along+normal[1]*plane,b-a,hi-lo,depth,angle]);}
 }
 return result;
}
