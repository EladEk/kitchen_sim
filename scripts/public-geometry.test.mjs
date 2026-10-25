import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from 'three';
import {createPublicBaseline} from './public-baseline.mjs';
const equalNumbers=(a,b,label)=>assert(a.length===b.length&&a.every((v,i)=>v===b[i]),label);
test('full public model retains baked geometry and horizontal ground after export/reload',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'public-geometry-'));
 try{
  const {root}=await createPublicBaseline(dir),json=JSON.parse(await readFile(join(dir,'building.json'),'utf8')),loaded=await new THREE.ObjectLoader().parseAsync(json);
  root.updateMatrixWorld(true);loaded.updateMatrixWorld(true);
  const objects=new Map(),checked=new Set();loaded.traverse(o=>objects.set(o.uuid,o));let horizontalGround=0;
  root.traverse(before=>{
   const after=objects.get(before.uuid);assert(after,'missing object');assert(after.matrixWorld.elements.every((v,i)=>Math.abs(v-before.matrixWorld.elements[i])<1e-10),'world matrix beyond floating-point tolerance');
   if(before.isInstancedMesh)equalNumbers(after.instanceMatrix.array,before.instanceMatrix.array,'instances');
   if(!before.geometry||checked.has(before.geometry.uuid))return;checked.add(before.geometry.uuid);
   const a=before.geometry,b=after.geometry;
   assert.deepEqual(Object.keys(b.attributes).sort(),Object.keys(a.attributes).sort());
   for(const name of Object.keys(a.attributes))equalNumbers(b.attributes[name].array,a.attributes[name].array,`${name} changed`);
   assert.deepEqual(b.index?.array,a.index?.array);
   a.computeBoundingBox();b.computeBoundingBox();assert(b.boundingBox.equals(a.boundingBox));
   const size=a.boundingBox.getSize(new THREE.Vector3());
   if(size.x>20&&size.z>20&&size.y<.5){horizontalGround++;assert(b.boundingBox.max.y-b.boundingBox.min.y<.5);}
  });
  assert(horizontalGround>=1,'large horizontal site base');assert(checked.size>100);
  console.log('Geometry count:',checked.size,'snapshot bytes:',(await stat(join(dir,'building.json'))).size);
 }finally{await rm(dir,{recursive:true,force:true});}
});
