import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createHomeScene} from './home-scene.js';
import {HOUSE,ROOMS,DOORS,ALL_HOME_PARTS,normalizeHomeSettings} from './home-model.mjs';

test('overview and walking scenes build finite geometry and every independent control is clickable',()=>{
 for(const mode of ['overview','walk']){
  const settings=normalizeHomeSettings({openDoors:DOORS.map(d=>d.id),openParts:ALL_HOME_PARTS.map(p=>p.id),light:mode==='walk'?'evening':'day'}),scene=createHomeScene(settings,{mode});
  scene.group.updateMatrixWorld(true);let meshes=0,ceilings=0;
  scene.group.traverse(o=>{if(o.userData.part==='illustrative-ceiling')ceilings++;if(!o.isMesh)return;meshes++;const positions=o.geometry.attributes.position;for(let i=0;i<positions.count;i++)assert(Number.isFinite(positions.getX(i)+positions.getY(i)+positions.getZ(i)));const bounds=new THREE.Box3().setFromObject(o);assert(Number.isFinite(bounds.min.length()+bounds.max.length()));});
  assert(meshes>500);assert.equal(ceilings,mode==='walk'?1:0);assert.equal(scene.wallHeight,mode==='walk'?HOUSE.height:.86);
  const ids=new Set(scene.picks.map(m=>m.userData.partId||m.userData.doorId));for(const d of DOORS)assert(ids.has(d.id));for(const part of ALL_HOME_PARTS)assert(ids.has(part.id));
  assert.equal(scene.roomGroups.size,ROOMS.filter(r=>r.kind!=='garden').length);
  scene.dispose();
 }
});

test('opening a single furniture drawer leaves all other furniture and doors unchanged',()=>{
 const closed=createHomeScene(normalizeHomeSettings()),id='wardrobe-a:drawer-0',opened=createHomeScene(normalizeHomeSettings({openParts:[id]}));
 const a=new Map(closed.motions.map(m=>[m.id,m.target]));for(const m of opened.motions){if(m.id===id)assert.notEqual(m.target,a.get(m.id));else assert.equal(m.target,a.get(m.id),`${m.id} remains unchanged`);}
 const slider=opened.doorGroups.get('patio');slider.updateWorldMatrix(true,true);const moving=opened.motions.find(m=>m.id==='door:patio'),position=new THREE.Vector3();moving.object.getWorldPosition(position);assert(position.z>slider.position.z,'open leaf aligns over the fixed end of the same opening');
 closed.dispose();opened.dispose();
});

test('hiding illustrative furniture preserves the architecture and detailed-kitchen link',()=>{
 const scene=createHomeScene(normalizeHomeSettings({furniture:false,cutaway:false}));
 assert.equal(scene.furnitureGroups.size,0);assert.equal(scene.wallHeight,HOUSE.height);assert(scene.picks.some(m=>m.userData.action==='kitchen'));assert.equal(scene.doorGroups.size,DOORS.length);scene.dispose();
});
