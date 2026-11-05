import * as T from 'three';
import {readFile} from 'node:fs/promises';
import {createHomeScene} from '../src/home-scene.js';
import {normalizeHomeSettings,insidePolygon} from '../src/home-model.mjs';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {groundBuildingContains} from '../src/ground-apartments.mjs';
import {segmentDistance} from '../src/building-navigation.mjs';
// Independently traced unit/core outlines occasionally leave a <2 cm seam
// inside the physical party wall. That seam is occupied, not an exterior bay.
const contains=(p,polygon)=>insidePolygon(p,polygon)||polygon.some((a,i)=>segmentDistance(p,a,polygon[(i+1)%polygon.length])<.025);
function audit(root,name){
 root.updateMatrixWorld(true);const walls=[],bad=[];root.traverse(o=>{if(o.isMesh&&[o.material].flat().some(m=>m.userData.wallCavity||m.userData.publicFinish==='stone'))walls.push(o);});
 for(const o of walls){const g=o.geometry,index=g.index,p=g.attributes.position,n=g.attributes.normal;if(!n)continue;
  for(let instance=0;instance<(o.isInstancedMesh?o.count:1);instance++){const matrix=o.matrixWorld.clone();if(o.isInstancedMesh){const local=new T.Matrix4();o.getMatrixAt(instance,local);matrix.multiply(local);}const nm=new T.Matrix3().getNormalMatrix(matrix);
   for(const range of g.groups){const m=[o.material].flat()[range.materialIndex]||o.material;if(m.userData.surfaceKind!=='plaster')continue;const ids=Array.from({length:range.count},(_,i)=>index?index.getX(range.start+i):range.start+i),normal=new T.Vector3().fromBufferAttribute(n,ids[0]).applyNormalMatrix(nm);if(Math.abs(normal.y)>.1)continue;const at=new T.Vector3();ids.forEach(i=>at.add(new T.Vector3().fromBufferAttribute(p,i)));at.divideScalar(ids.length).applyMatrix4(matrix);if(at.y<.15||at.y>26.5)continue;const level=Math.min(8,Math.floor((at.y+.01)/3.1)),f=BUILDING_FLOORS[level],inside=v=>level===0?groundBuildingContains([v.x,v.z]):f.units.some(u=>contains([v.x,v.z],u.polygon))||contains([v.x,v.z],f.core);
    if(inside(at.clone().addScaledVector(normal,.22))||!inside(at.clone().addScaledVector(normal,-.22)))continue;
    const hit=new T.Raycaster(at.clone().addScaledVector(normal,.8),normal.clone().negate(),0,1).intersectObjects(walls,false)[0];if(hit?.object!==o||hit.instanceId!==undefined&&hit.instanceId!==instance||hit.point.distanceTo(at)>.03)continue;
    bad.push({part:o.userData.part,point:at.toArray().map(v=>+v.toFixed(3)),normal:normal.toArray().map(v=>+v.toFixed(2)),level,face:range.materialIndex});
   }
  }
 }
 return {name,exposedWhiteWallFaces:bad.length,examples:bad.slice(0,12)};
}
const home=createHomeScene(normalizeHomeSettings({cutaway:false,buildingLevel:9}),{mode:'walk',daylight:false});try{console.log(JSON.stringify(audit(home.group,'personal')));}finally{home.dispose();}
const model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8')));console.log(JSON.stringify(audit(model,'exported-public')));
