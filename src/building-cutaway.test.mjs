import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {buildBuildingContext} from './building-scene.js';
import {createHomeScene} from './home-scene.js';
import {HOUSE,normalizeHomeSettings} from './home-model.mjs';

function wallTop(node,part){
 const mesh=node.getObjectByName(part),matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 assert(mesh?.isInstancedMesh,`${part} is present`);
 let top=-Infinity;for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);scale.setFromMatrixScale(matrix);top=Math.max(top,position.y+scale.y/2);}return top;
}
const near=(actual,expected,label)=>assert(Math.abs(actual-expected)<.002,`${label}: ${actual} ≈ ${expected}`);

test('uncut floor and apartment views close at the full wall top instead of leaving raised room-wall stubs above the ceiling',()=>{
 for(const floor of BUILDING_FLOORS)for(const mode of ['building','unit']){
  const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({cutaway:false,buildingLevel:floor.level,tourDestination:`unit:${floor.units[0].number}:${floor.level}`}),model=buildBuildingContext({group:root,resources,settings,mode});
  try{const node=model.floors.get(floor.level),ceilings=node.children.filter(o=>o.userData.part==='building-storey-ceiling');assert(ceilings.length,`${mode} ${floor.level}: closed top is present, including ground floor`);root.updateMatrixWorld(true);
   for(const ceiling of ceilings){const bounds=new THREE.Box3().setFromObject(ceiling);near(bounds.max.y,floor.elevation+BUILDING.storey,'ceiling meets the full wall top');near(bounds.min.y,floor.elevation+BUILDING.storey-BUILDING.slab,'structural closing slab stays above the room');}
   for(const part of ['building-interior-wall','building-facade-wall'])assert(wallTop(node,part)<=floor.elevation+BUILDING.storey+.002,'no wall rises above the closing ceiling');
   // Native rays from above reproduce the user's floor-4 / apartment-8 views.
   // Interior rooms must encounter an opaque closing ceiling at full height.
   const unit=floor.units[0],xs=unit.polygon.map(p=>p[0]),zs=unit.polygon.map(p=>p[1]),ray=new THREE.Raycaster(new THREE.Vector3((Math.min(...xs)+Math.max(...xs))/2,floor.elevation+BUILDING.storey+1,(Math.min(...zs)+Math.max(...zs))/2),new THREE.Vector3(0,-1,0));
   const hits=ray.intersectObjects(ceilings);assert(hits.length,`${mode} ${floor.level}: top-down room ray hits closing slab`);near(hits[0].point.y,floor.elevation+BUILDING.storey,'opaque top surface');
  }finally{resources.forEach(r=>r.dispose?.());}
 }
});

test('the saved wall-cutaway switch controls actual facade and interior heights in every floor and apartment view',()=>{
 for(const f of BUILDING_FLOORS)for(const mode of ['building','unit'])for(const cutaway of [false,true]){
  const group=new THREE.Group(),resources=[],settings=normalizeHomeSettings({cutaway,buildingLevel:mode==='building'?f.level:9,tourDestination:`unit:${f.units[0].number}:${f.level}`}),model=buildBuildingContext({group,resources,settings,mode});
  try{
   assert.equal(model.floors.size,f.level+1,'destination selection still limits the displayed floors');
   for(const [level,node] of model.floors){const rise=cutaway&&level===f.level?.85:BUILDING.storey;for(const part of ['building-facade-wall','building-interior-wall'])near(wallTop(node,part),level*BUILDING.storey+rise,`${mode} / cutaway ${cutaway} / floor ${level} / ${part}`);}
   const top=model.floors.get(f.level),door=top.children.find(o=>o.userData.part==='building-apartment-door'),matrix=new THREE.Matrix4(),scale=new THREE.Vector3();door.getMatrixAt(0,matrix);scale.setFromMatrixScale(matrix);near(scale.y,cutaway?.82:2.18,'door leaf follows the same wall-height choice');
  }finally{resources.forEach(r=>r.dispose?.());}
 }
});

test('the complete home scene preserves the unchecked preference for the original apartment and its neighbours',()=>{
 for(const mode of ['building','unit'])for(const cutaway of [false,true]){
  const settings=normalizeHomeSettings(JSON.parse(JSON.stringify(normalizeHomeSettings({cutaway,buildingLevel:0,tourDestination:'unit:1:0'})))),model=createHomeScene(settings,{mode});
  try{near(model.wallHeight,cutaway?.86:HOUSE.height,'original apartment wall height');near(wallTop(model.buildingContext.floors.get(0),'building-interior-wall'),cutaway?.85:BUILDING.storey,'neighbour wall height');assert.equal(settings.cutaway,cutaway,'rendering cannot override the saved checkbox');}finally{model.dispose();}
 }
 for(const cutaway of [false,true]){const model=createHomeScene(normalizeHomeSettings({cutaway,buildingLevel:3,tourDestination:'unit:17:3'}),{mode:'walk'});try{near(model.wallHeight,HOUSE.height,'walking height');for(const [level,node] of model.buildingContext.floors)if(level<9)near(wallTop(node,'building-interior-wall'),level*BUILDING.storey+BUILDING.storey,'walking never shortens a floor');}finally{model.dispose();}}
});
