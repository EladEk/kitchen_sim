import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {connectedWallRuns,wallFootprint,exposedBalconySegments,duplexLandingGuards} from './building-geometry.mjs';
import {BUILDING_FLOORS,BUILDING} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {buildBuildingContext} from './building-scene.js';
import {buildingBoxes} from './building-navigation.mjs';
import {normalizeHomeSettings} from './home-model.mjs';
import {createElevators} from './elevator-model.mjs';
const contains=(b,p)=>p[0]>=b.minX&&p[0]<=b.maxX&&p[1]>=b.minZ&&p[1]<=b.maxZ;
function instanceContains(mesh,p){const m=new THREE.Matrix4(),b=new THREE.Box3();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,m);b.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(1,1,1)).applyMatrix4(m);if(b.containsPoint(new THREE.Vector3(...p)))return true;}return false;}
test('the PDF-confirmed floor6/unit39 corner is solid in both the rendered wall and walking collision without altering the source runs',()=>{
 const source=BUILDING_INTERIORS.floors[6],snapshot=JSON.stringify(source),runs=connectedWallRuns(source,BUILDING_FLOORS[6]),vertical=runs.find(w=>Math.abs(w.a[0]-4.949)<.002&&Math.abs(w.b[0]-4.949)<.002&&contains(wallFootprint(w),[4.949,11.60]));assert(vertical);assert(vertical.b[1]>=11.695);assert.equal(JSON.stringify(source),snapshot);assert(!contains(wallFootprint(source.walls[vertical.sourceWallIndex]),[4.949,11.60]));
 const resources=[],root=new THREE.Group(),settings=normalizeHomeSettings({buildingLevel:6,cutaway:false}),model=buildBuildingContext({group:root,resources,settings,mode:'building'});try{const mesh=model.floors.get(6).getObjectByName('building-interior-wall');assert(model.floors.get(6).children.filter(o=>o.name==='building-interior-wall').some(o=>instanceContains(o,[4.949,6*BUILDING.storey+1.5,11.60])));assert(buildingBoxes(6,settings,createElevators()).some(b=>b.sourceWall&&contains(b,[4.949,11.60])));}finally{resources.forEach(r=>r.dispose?.());}
});
test('junction reconstruction is bounded by wall widths and cannot bridge a documented door or parallel opening',()=>{
 const floor={envelope:[]},walls=[{a:[0,0],b:[.85,0],width:.3},{a:[1,-1],b:[1,-.3],width:.3}],empty={walls,doors:[],entries:[],lifts:[]};assert(connectedWallRuns(empty,floor)[0].b[0]>=1);assert(connectedWallRuns(empty,floor)[1].b[1]>=0);
 const doorway={...empty,doors:[{hinge:[1,-.1],closed:[1,.8]}]};const protectedRuns=connectedWallRuns(doorway,floor);assert.deepEqual(protectedRuns.map(w=>[w.a,w.b]),walls.map(w=>[w.a,w.b]));
 const distant={walls:[walls[0],{...walls[1],a:[1.4,-1],b:[1.4,-.3]}],doors:[],lifts:[],entries:[]};assert.deepEqual(connectedWallRuns(distant,floor).map(w=>[w.a,w.b]),distant.walls.map(w=>[w.a,w.b]));
 const parallel={walls:[walls[0],{a:[1.7,0],b:[2.7,0],width:.3}],doors:[],lifts:[],entries:[]};assert.deepEqual(connectedWallRuns(parallel,floor).map(w=>[w.a,w.b]),parallel.walls.map(w=>[w.a,w.b]));
});
test('partly exposed balcony returns receive visible rail segments and matching walking guards on every floor',()=>{
 for(const floor of BUILDING_FLOORS){const rails=exposedBalconySegments(floor),boxes=buildingBoxes(floor.level,normalizeHomeSettings(),createElevators()).filter(b=>b.guardrail);assert.equal(boxes.length,rails.length);for(const s of rails){const mid=s.a.map((n,i)=>(n+s.b[i])/2);assert(boxes.some(b=>contains(b,mid)));}}
 const returns=exposedBalconySegments(BUILDING_FLOORS[6]).filter(s=>s.balcony===4&&s.edge===2);assert(returns.some(s=>Math.hypot(s.a[0]-s.b[0],s.a[1]-s.b[1])>.60));
 const resources=[],root=new THREE.Group(),model=buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:6,cutaway:false}),mode:'building'});try{assert(instanceContains(model.floors.get(6).getObjectByName('building-rail-and-louvres'),[-.5,6*BUILDING.storey+1.10,4.4094]));assert(model.floors.get(6).children.some(o=>o.userData.part==='building-stair-guard'));assert(model.floors.get(5).children.some(o=>o.userData.part==='building-duplex-guard'));assert(model.floors.get(6).children.some(o=>o.userData.part==='building-duplex-landing-guard'));}finally{resources.forEach(r=>r.dispose?.());}
 const guards=duplexLandingGuards(BUILDING_INTERIORS.floors[6].duplexStair);assert.equal(guards.length,5);const x=BUILDING_INTERIORS.floors[6].duplexStair.shortFlightRect[0][0];assert(!guards.some(s=>Math.abs(s.a[0]-x)<.001&&Math.abs(s.b[0]-x)<.001),'upper stair exit remains open');
});
