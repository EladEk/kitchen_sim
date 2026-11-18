import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';import {createKitchen} from './scene.js';import {DEFAULTS} from './model.mjs';import {applySceneUiVisibility} from './scene-interface.mjs';import {updateSceneKinematics} from './scene-state.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
test('initially disabled kitchen lamps, LEDs and water can turn on without replacing resources',()=>{
 const initial={...DEFAULTS,lampsOn:false,led:false,showLighting:false,showWater:false,dimensions:false},model=createKitchen(initial),before=new Map();model.group.traverse(o=>{if(o.isMesh)before.set(o,[o.geometry,o.material]);});
 const on={...initial,lampsOn:true,led:true,showLighting:true,showElectrical:true,showWater:true,dimensions:true};model.updateDaylight(on);applySceneUiVisibility(model,on);let emitted=0;model.group.traverseVisible(o=>{if(o.userData.fixtureLight&&o.intensity>0)emitted++;});assert(emitted>=3);assert(model.dimensionGroup.visible);assert([...model.waterGroups.values()].every(o=>o.visible));
 model.updateDaylight(initial);applySceneUiVisibility(model,initial);model.group.traverse(o=>{if(o.userData.fixtureLight)assert.equal(o.intensity,0);});assert([...model.waterGroups.values()].every(o=>!o.visible));for(const [o,[g,m]]of before){assert.equal(o.geometry,g);assert.equal(o.material,m);}model.dispose();
});
test('home motion targets and common-door poses update in place',()=>{
 const group=new T.Group(),door=new T.Group();door.userData.tourDoor={id:'b',axis:'rotation',property:'y',open:1.4,closed:0};group.add(door);const motion={id:'door:entry',target:0,openTarget:1.2,closedTarget:0},model={group,motions:[motion]};updateSceneKinematics(model,{openDoors:['entry']});assert.equal(motion.target,1.2);assert.equal(door.rotation.y,1.4);updateSceneKinematics(model,{closedBuildingDoors:['b']});assert.equal(motion.target,0);assert.equal(door.rotation.y,0);
});

test('electrical visibility, inline fixtures, marker opacity and rings change without rebuilding',async()=>{
 const {buildElectricalPoints}=await import('./home-electrical-scene.js');const {ELECTRICAL_LAYOUT}=await import('./home-model.mjs');
 for(const fixtures of [false,true]){
  const group=new T.Group(),resources=[],mat=(color,options)=>{const m=new T.MeshStandardMaterial({color,...options});resources.push(m);return m;};
  const box=(x,y,z,w,h,d,m,parent,data)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.userData=data;parent.add(o);return o;};
  const cylinder=(x,y,z,r,h,m,parent,data)=>box(x,y,z,r*2,h,r*2,m,parent,data);
  const points=buildElectricalPoints({group,box,cylinder,mat,resources,settings:{showElectrical:false,electricalPresentation:fixtures?'fixtures':'markers'},points:[ELECTRICAL_LAYOUT.points[0]]}),point=[...points.values()][0],before=point.children.map(o=>o.geometry);
  for(const enabled of [true,false,true]){applySceneUiVisibility({group},{showElectrical:enabled});assert.equal(point.visible,enabled||fixtures);point.traverse(o=>{if(o.userData.electricalHighlightRing)assert.equal(o.visible,enabled);if(o.userData.electricalMarkerMat)assert.equal(o.material.opacity,enabled?.96:.34);});}
  applySceneUiVisibility({group},{showElectrical:false,showInlineFixtures:false});assert(!point.visible);assert(point.children.every((o,i)=>o.geometry===before[i]));group.traverse(o=>o.geometry?.dispose());resources.forEach(o=>o.dispose?.());
 }
});
