import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING_FLOORS,BUILDING} from './building-layout.mjs';
import {exposedBalconySegments} from './building-geometry.mjs';
import {buildBuildingContext} from './building-scene.js';
import {buildingBoxes,buildingCanStand} from './building-navigation.mjs';
import {normalizeHomeSettings} from './home-model.mjs';
import {createElevators} from './elevator-model.mjs';
import {LOBBY_BENCHES} from './lobby-reference.mjs';
const crosses=(s,x,z)=>Math.abs(s.a[1]-z)<.01&&Math.abs(s.b[1]-z)<.01&&x>Math.min(s.a[0],s.b[0])&&x<Math.max(s.a[0],s.b[0]);
test('floor 7 joined terraces have no internal glass or walking barrier, but keep outer guards',()=>{
 const f=BUILDING_FLOORS[7],segments=exposedBalconySegments(f);
 for(const [x,z] of [[2,-6.1228],[4.8,-2.8147],[18,-9.0174],[20,-5.6717]])assert(!segments.some(s=>crosses(s,x,z)),`internal seam ${x},${z}`);
 assert(segments.some(s=>crosses(s,2,-9.8068)));
 const boxes=buildingBoxes(7,normalizeHomeSettings({}),createElevators());
 assert(!boxes.some(b=>b.guardrail&&2>b.minX&&2<b.maxX&&-6.1228>b.minZ&&-6.1228<b.maxZ));
});
test('main entrance head is closed above glazing and no inferred stack columns remain',()=>{
 const resources=[],root=new THREE.Group(),settings=normalizeHomeSettings({buildingLevel:9,cutaway:false});
 try{const model=buildBuildingContext({group:root,resources,settings,mode:'building'});root.updateMatrixWorld(true);let lintel;root.traverse(o=>{if(o.userData.part==='lobby-entry-lintel')lintel=o;});assert(lintel);const box=new THREE.Box3().setFromObject(lintel);assert(box.containsPoint(new THREE.Vector3(21.8239,2.8,-3.8)));assert(box.max.y>=BUILDING.storey-.001);assert.equal(root.getObjectByName('building-balcony-surround'),undefined);
 assert(model.floors.get(6).getObjectByName('building-rail-and-louvres'));
 }finally{resources.forEach(r=>r.dispose?.());}
});
test('video-based stone bench blocks walking while lobby route stays open',()=>{
 const settings=normalizeHomeSettings({}),cars=createElevators(),boxes=buildingBoxes(0,settings,cars);
 for(const b of LOBBY_BENCHES)assert(!buildingCanStand([(b.minX+b.maxX)/2,(b.minZ+b.maxZ)/2],0,boxes,cars));
 for(const x of [16.3,18.5,20.5])assert(buildingCanStand([x,-3.7],0,boxes,cars));
});
