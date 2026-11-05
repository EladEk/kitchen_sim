import * as THREE from 'three';
import {readFile} from 'node:fs/promises';
import {createHomeScene} from '../src/home-scene.js';
import {normalizeHomeSettings,ROOMS,insidePolygon} from '../src/home-model.mjs';
const inside=p=>ROOMS.some(r=>!['garden','outdoor'].includes(r.kind)&&insidePolygon(p,r.polygon));
function audit(root,name){
 root.updateMatrixWorld(true);const bad=[],walls=[];
 root.traverse(o=>{if(o.isMesh&&[o.material].flat().some(m=>['plaster','limestone'].includes(m.userData.surfaceKind)))walls.push(o);});
 for(const room of ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind))){
  for(let angle=0;angle<Math.PI*2;angle+=Math.PI/24){
   const direction=new THREE.Vector3(Math.sin(angle),0,Math.cos(angle)),origin=new THREE.Vector3(room.walk[0],1.7,room.walk[1]),ray=new THREE.Raycaster(origin,direction,0,12);
   const hit=ray.intersectObjects(walls,false).find(h=>[h.object.material].flat()[h.face.materialIndex]?.transparent!==true);if(!hit)continue;
   const before=hit.point.clone().addScaledVector(direction,-.025),material=[hit.object.material].flat()[hit.face.materialIndex];
   if(inside([before.x,before.z])&&material.userData.surfaceKind==='limestone')bad.push({room:room.id,at:hit.point.toArray().map(v=>+v.toFixed(3)),part:hit.object.userData.part,wall:hit.object.userData.wallId,instance:hit.instanceId});
  }
 }
 console.log(JSON.stringify({name,stoneFacingRoom:bad},null,2));
}
const home=createHomeScene(normalizeHomeSettings(),{mode:'walk',context:true,daylight:false});try{audit(home.group,'personal');}finally{home.dispose();}
const model=await new THREE.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8')));audit(model,'exported-public');
