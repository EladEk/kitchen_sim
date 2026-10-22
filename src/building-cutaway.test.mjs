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

test('selected-floor and apartment overviews expose the requested rooms while leaving unchecked walls full height',()=>{
 for(const floor of BUILDING_FLOORS)for(const mode of ['building','unit']){
  const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({cutaway:false,buildingLevel:floor.level,tourDestination:`unit:${floor.units[0].number}:${floor.level}`}),model=buildBuildingContext({group:root,resources,settings,mode});
  try{const top=model.floors.get(floor.level);assert.equal(top.children.filter(o=>o.userData.part==='building-storey-ceiling').length,0,`${mode} ${floor.level}: the selected floor must not be hidden by its own ceiling`);
   for(const [level,node] of model.floors){for(const part of ['building-interior-wall','building-facade-wall'])near(wallTop(node,part),level*BUILDING.storey+BUILDING.storey,'unchecked full wall height');if(level<floor.level){const ceilings=node.children.filter(o=>o.userData.part==='building-storey-ceiling');assert(ceilings.length);for(const ceiling of ceilings){const bounds=new THREE.Box3().setFromObject(ceiling);near(bounds.max.y,level*BUILDING.storey+BUILDING.storey,'lower-floor closing slab');}}}
   // The old R48 roof was the very first hit from an overhead room probe.
   // This ray must now reach a mesh inside the requested storey.
   root.updateMatrixWorld(true);const finishes=[];top.traverse(o=>{if(['building-unit-finish','ground-base-room'].includes(o.userData.part))finishes.push(o);});assert(finishes.length);let roomVisible=false;
   for(const mesh of finishes){const positions=mesh.geometry.attributes.position,index=mesh.geometry.index;for(let triangle=0;triangle<Math.min(30,(index?.count||positions.count)/3)&&!roomVisible;triangle++){const center=new THREE.Vector3();for(let j=0;j<3;j++){const i=index?index.getX(triangle*3+j):triangle*3+j;center.add(new THREE.Vector3().fromBufferAttribute(positions,i));}center.multiplyScalar(1/3).applyMatrix4(mesh.matrixWorld);const ray=new THREE.Raycaster(new THREE.Vector3(center.x,floor.elevation+BUILDING.storey+.2,center.z),new THREE.Vector3(0,-1,0));if(ray.intersectObjects([mesh]).length)roomVisible=true;}if(roomVisible)break;}assert(roomVisible,`requested room floors remain available to the overhead view on ${floor.level}`);
  }finally{resources.forEach(r=>r.dispose?.());}
 }
});

test('complete-building roofs and walking ceilings stay solid independently of the overview cutaway preference',()=>{
 for(const mode of ['building','walk'])for(const cutaway of [false,true]){const root=new THREE.Group(),resources=[],model=buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:9,cutaway}),mode});try{assert(root.getObjectByName('building-roof'));for(const f of BUILDING_FLOORS){const ceilings=model.floors.get(f.level).children.filter(o=>o.userData.part==='building-storey-ceiling');assert(ceilings.length,`${mode} ${f.level}: ceiling retained`);}}finally{resources.forEach(r=>r.dispose?.());}}
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
