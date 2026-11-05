import * as T from 'three';
import {createHomeScene} from '../src/home-scene.js';
import {normalizeHomeSettings,CONSTRUCTION_WALLS,insidePolygon} from '../src/home-model.mjs';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {groundBuildingContains} from '../src/ground-apartments.mjs';
const home=createHomeScene(normalizeHomeSettings({cutaway:false}),{mode:'walk',daylight:false}),external=new Set(CONSTRUCTION_WALLS.filter(w=>w.external).map(w=>w.id));
const counts={},examples=[];let surfaces=0;home.group.updateMatrixWorld(true);
try{home.group.traverse(o=>{
 if(!o.isMesh||!(o.userData.part==='building-facade-wall'||o.userData.part==='ground-base-wall'&&o.userData.facadeWall||o.userData.part==='architectural-wall'&&external.has(o.userData.wallId)))return;
 const g=o.geometry,index=g.index,position=g.attributes.position,normal=g.attributes.normal;
 for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){
  const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const local=new T.Matrix4();o.getMatrixAt(instance,local);matrix.multiply(local);}const nm=new T.Matrix3().getNormalMatrix(matrix);
  for(const group of g.groups){const material=[o.material].flat()[group.materialIndex]||o.material;
   const vertices=Array.from({length:group.count},(_,i)=>index?index.getX(group.start+i):group.start+i),p=new T.Vector3(),n=new T.Vector3().fromBufferAttribute(normal,vertices[0]).applyMatrix3(nm).normalize();if(Math.abs(n.y)>.1)continue;
   for(const i of vertices)p.add(new T.Vector3().fromBufferAttribute(position,i));p.divideScalar(vertices.length).applyMatrix4(matrix);const sample=p.clone().addScaledVector(n,.055),level=Math.max(0,Math.min(8,Math.floor((p.y+.01)/3.1))),floor=BUILDING_FLOORS[level],inside=level===0?groundBuildingContains([sample.x,sample.z]):floor.units.some(u=>insidePolygon([sample.x,sample.z],u.polygon))||insidePolygon([sample.x,sample.z],floor.core);surfaces++;
   if(!inside&&material.userData.surfaceKind==='plaster'){const key=o.userData.part+':'+group.materialIndex;counts[key]=(counts[key]||0)+1;if(examples.length<24)examples.push({part:o.userData.part,wall:o.userData.wallId||o.userData.baseWallId,level,instance,face:group.materialIndex,point:p.toArray().map(v=>+v.toFixed(3)),normal:n.toArray().map(v=>+v.toFixed(2))});}
  }
 }
});console.log(JSON.stringify({surfaces,counts,examples},null,2));}finally{home.dispose();}
