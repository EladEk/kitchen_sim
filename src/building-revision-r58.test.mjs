import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {groundProposedBeds} from './apartment-furniture-scene.js';
import {groundInverse,groundBaseProfile} from './ground-apartments.mjs';
import {BUILDING_FLOORS} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {connectedWallRuns,wallFootprint,polygonContains} from './building-geometry.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {buildingBoxes,moveBuildingPlayer,inPolygon} from './building-navigation.mjs';
import {SERVICE_ACCESS,serviceFloorHeight,serviceApproach} from './service-access.mjs';
import {createElevators} from './elevator-model.mjs';
const intersects=(a,b)=>a.minX<b.maxX-.001&&a.maxX>b.minX+.001&&a.minZ<b.maxZ-.001&&a.maxZ>b.minZ+.001;
test('all 32 CAD-number wall fragments are removed from rendering and collision input, with every genuine source run retained',()=>{
 const report=JSON.parse(readFileSync(new URL('../qa/annotation-wall-removals-r58.json',import.meta.url)));assert.equal(report.flatMap(r=>r.removedAnnotationWalls).length,32);
 for(const row of report){const s=BUILDING_INTERIORS.floors[row.level];for(const w of row.removedAnnotationWalls)assert(!s.walls.some(v=>JSON.stringify(v)===JSON.stringify(w)));assert.equal(row.addedWalls.length,0);}
});
test('the three garden replicas each receive five bedroom beds without crossing their actual walls or service fixtures',()=>{
 const beds=groundProposedBeds(),boxes=buildingBoxes(0,normalizeHomeSettings({furniture:false}),createElevators());assert.equal(beds.length,15);
 for(const p of beds){const room=groundBaseProfile().rooms.find(r=>inPolygon(groundInverse(p.unit,[p.x,p.z]),r.polygon));assert(['bedroom','safe-room'].includes(room?.kind));assert(!boxes.some(b=>intersects(p.box,b)),p.id+' must clear existing construction and equipment');}
});
test('every upper independent apartment has one kitchen and each registered bedroom has a bed clear of walls and door swings',()=>{
 assert.equal(APARTMENT_FURNITURE.filter(r=>r.kind==='bed').length,139);
 const kitchens=APARTMENT_FURNITURE.filter(r=>r.kind==='kitchen');assert.equal(kitchens.length,39);assert.equal(new Set(kitchens.map(r=>r.unit)).size,39);
 for(const f of BUILDING_FLOORS.filter(f=>f.level>0)){const source=BUILDING_INTERIORS.floors[f.level],walls=connectedWallRuns(source,f).map(wallFootprint);
  for(const p of APARTMENT_FURNITURE.filter(r=>r.floor===f.level)){
   assert(f.units.some(u=>u.number===p.unit&&polygonContains([p.x,p.z],u.polygon)));assert(!walls.some(w=>intersects(p.box,w)),p.id+' must clear every wall');
   for(const d of source.doors){const b={minX:Math.min(d.hinge[0],d.opened[0],d.closed[0])-.1,maxX:Math.max(d.hinge[0],d.opened[0],d.closed[0])+.1,minZ:Math.min(d.hinge[1],d.opened[1],d.closed[1])-.1,maxZ:Math.max(d.hinge[1],d.opened[1],d.closed[1])+.1};assert(!intersects(p.box,b),p.id+' must clear door sweep '+d.id);}
  }
 }
});
test('the video-matched stair portal is free of cabinet geometry and permits continuous descent to the pump landing',()=>{
 const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({buildingLevel:0,cutaway:false}),cars=createElevators();
 try{buildBuildingContext({group:root,resources,settings,mode:'building'});root.updateMatrixWorld(true);const matrix=new THREE.Matrix4(),box=new THREE.Box3();
 root.traverse(o=>{if(o.isInstancedMesh&&['lobby-flush-service-panel','lobby-oak-panelling','lobby-service-handle'].includes(o.name))for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);box.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(1,1,1)).applyMatrix4(matrix);assert(!intersects({minX:box.min.x,maxX:box.max.x,minZ:box.min.z,maxZ:box.max.z},serviceApproach),'cabinet crosses service approach');}});
 const boxes=buildingBoxes(0,settings,cars);let p=[19.05,-4];for(const goal of [[19.05,-7.65],[18.63,-7.65],[18.63,-8.45]])p=moveBuildingPlayer(p,goal.map((v,i)=>v-p[i]),0,boxes,cars);assert(p[1]<-8.3,'walk around the open meter leaf to the bottom landing');assert.equal(serviceFloorHeight(p),-SERVICE_ACCESS.depth);
 for(const path of [[[17.65,-8.45],[17.65,-6.25],[17.4,-6.25]],[[18.63,-7.65],[21,-7.65],[21,-7]]]){let at=[...p];for(const goal of path){at=moveBuildingPlayer(at,goal.map((v,i)=>v-at[i]),0,boxes,cars);assert(Math.hypot(...goal.map((v,i)=>v-at[i]))<.06,'reach actual service room through its source portal');}assert.equal(serviceFloorHeight(at),-SERVICE_ACCESS.depth);}
 const heights=[-5.65,-6,-6.5,-7,-7.5,-7.95].map(z=>serviceFloorHeight([19.05,z]));for(let i=1;i<heights.length;i++)assert(heights[i]<=heights[i-1]);
 const ray=new THREE.Raycaster(new THREE.Vector3(19.05,2,-6.75),new THREE.Vector3(0,-1,0));const hits=ray.intersectObject(root,true).filter(h=>h.object.name==='service-descending-step'||h.object.userData.part==='building-floor-slab'||h.object.userData.part==='building-site-base');assert(hits.length);assert(hits[0].point.y<-.2,'no hidden ground/site sheet covers the descending stair');
 }finally{resources.forEach(r=>r.dispose?.());}
});
test('service floor cuts keep the pump ceiling closed and retain the duplex stair ceiling aperture',()=>{
 const root=new THREE.Group(),resources=[];
 try{buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),mode:'walk'});root.updateMatrixWorld(true);
 const ceilings=[];root.traverse(o=>{if(o.userData.part==='building-storey-ceiling')ceilings.push(o);});
 const up=new THREE.Raycaster(new THREE.Vector3(17.4,0,-6.25),new THREE.Vector3(0,1,0));assert(up.intersectObjects(ceilings.filter(o=>o.userData.buildingFloor===0)).length,'pump room retains its ceiling');
 const [a,b]=BUILDING_INTERIORS.floors[5].duplexStair.longFlightRect,down=new THREE.Raycaster(new THREE.Vector3((a[0]+b[0])/2,20,(a[1]+b[1])/2),new THREE.Vector3(0,-1,0));assert.equal(down.intersectObjects(ceilings.filter(o=>o.userData.buildingFloor===5)).length,0,'upper duplex opening remains clear');
 }finally{resources.forEach(r=>r.dispose?.());}
});
