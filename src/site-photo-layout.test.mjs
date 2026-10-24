import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings,SERVICE_YARD} from './home-model.mjs';
import {buildingBoxes,buildingCanStand} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';
import {BURIED_BINS,RESERVOIR,ENTRY_GARDENS,LAUNDRY_SCREEN_Z} from './site-photo-layout.mjs';
import {SITE_CHAMBERS,SITE_TRACE} from './building-site.mjs';
import {polygonContains} from './building-geometry.mjs';
test('photographed bin towers and reservoir shell render at the shared collision locations',()=>{
 const resources=[],root=new THREE.Group(),settings=normalizeHomeSettings({buildingLevel:9,cutaway:false});
 try{buildBuildingContext({group:root,resources,settings,mode:'building'});root.updateMatrixWorld(true);const nodes=[];root.traverse(o=>nodes.push(o));assert.equal(nodes.filter(o=>o.name==='buried-bin-intake').length,2);assert.equal(nodes.filter(o=>o.name==='reservoir-shell').length,4);assert(nodes.some(o=>o.name==='reservoir-cap'));
 const boxes=buildingBoxes(0,settings,createElevators());for(const p of [...BURIED_BINS.centres,[(RESERVOIR.minX+RESERVOIR.maxX)/2,(RESERVOIR.minZ+RESERVOIR.maxZ)/2]])assert(!buildingCanStand(p,0,boxes,createElevators()));
 }finally{resources.forEach(r=>r.dispose?.());}
});
test('both entrances retain a clear approach between planted courtyard borders',()=>{
 for(const [z,from,to] of [[-4.32,22,32],[-1.17,-4,5.8]])for(let x=from;x<to;x+=.2)assert(!ENTRY_GARDENS.some(b=>polygonContains([x,z],b.polygon)),`planting blocks ${x},${z}`);
 const boxes=buildingBoxes(0,normalizeHomeSettings({}),createElevators());for(const p of [[24,-4.32],[29,-4.32],[4,-1.17]])assert(buildingCanStand(p,0,boxes,createElevators()));
});
test('screen plane follows the outer wall return and manhole coordinates agree between views',()=>{
 assert(LAUNDRY_SCREEN_Z>11.60&&LAUNDRY_SCREEN_Z<11.70);
 assert.deepEqual(SITE_CHAMBERS.find(c=>c.unit===4).position,SERVICE_YARD.manhole.position);
 assert(SERVICE_YARD.manhole.position[1]>16.5);assert(Math.abs(SERVICE_YARD.shed.maxZ-15.86)<.001,'shed ends before the chamber access reserve');
 assert.match(SITE_TRACE.features.find(f=>f.id==='site-electrical-room').he,/חדר מונים/);
});
