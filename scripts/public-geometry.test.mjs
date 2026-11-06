import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from 'three';
import {restorePublicFinishes} from '../public-view/finishes.mjs';
import {visibleAt} from '../public-view/navigation.mjs';
import {RESIDENTS_CLUB} from '../src/residents-club.mjs';
import {createPublicBaseline} from './public-baseline.mjs';
const equalNumbers=(a,b,label)=>assert(a.length===b.length&&a.every((v,i)=>v===b[i]),label);
test('full public model retains baked geometry and horizontal ground after export/reload',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'public-geometry-'));
 try{
  const {root}=await createPublicBaseline(dir),json=JSON.parse(await readFile(join(dir,'building.json'),'utf8')),loaded=await new THREE.ObjectLoader().parseAsync(json);
  restorePublicFinishes(loaded);
  const finishes=new Set();loaded.traverse(o=>{for(const m of [o.material].flat().filter(Boolean)){
   if(!m.userData.publicFinish)return;
   finishes.add(m.userData.publicFinish);
   const shader={vertexShader:'#include <common>\n#include <worldpos_vertex>\n#include <uv_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>'};
   m.onBeforeCompile(shader);
   assert(shader.fragmentShader.includes(m.userData.publicFinish==='stone'?'rowCoverage':'tileEdge'));
   assert(shader.vertexShader.includes('metricPosition'),'metre-scaled texture coordinates must survive export');
  }});assert.deepEqual([...finishes].sort(),['floor','stone']);
  root.updateMatrixWorld(true);loaded.updateMatrixWorld(true);
  let upperLiftParts=0;
  root.traverse(o=>{if(!o.isMesh||o.position.y<4)return;
   // Elevator frames and jambs are individual boxes, not instanced walls.
   if(![.11,.16].some(w=>Math.abs(o.scale.x-w)<1e-6)||o.scale.y<2.2||o.scale.y>2.3)return;
   const after=loaded.getObjectByProperty('uuid',o.uuid),floor=Math.floor(o.position.y/3.1);
   assert(after.userData.level>0,'upper lift structure must not be tagged as ground');
   assert(!visibleAt(after.userData,'building',0),'upper lift must disappear from ground cut');upperLiftParts++;
  });assert(upperLiftParts>10);
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
  let clubCeilings=0;
  loaded.traverse(o=>{
   if(!o.isMesh||Math.abs(o.position.y-RESIDENTS_CLUB.ceiling)>.0001)return;
   o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(new THREE.Vector3());
   if(size.x<5||size.z<6||size.y>.001)return;
   clubCeilings++;assert(o.userData.ceiling,'club ceiling must carry its role through export');
   assert(!visibleAt(o.userData,'building',0),'ground section must uncover the club');
   assert(visibleAt(o.userData,'walk',0),'walking must retain the ceiling');
  });
  assert.equal(clubCeilings,1);
  console.log('Geometry count:',checked.size,'snapshot bytes:',(await stat(join(dir,'building.json'))).size);
 }finally{await rm(dir,{recursive:true,force:true});}
});
