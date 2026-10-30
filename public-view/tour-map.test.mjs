import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {extractFloorMap} from './floor-map-geometry.mjs';
import {DISTRICT,buildingTransform} from './district.mjs';
import {locationAt,inside} from './navigation.mjs';
import {interiorLabel,localMapPose,mapForLocation,mapIsVisible,tourMapKey} from './tour-map.mjs';

test('plan slices preserve an actual doorway and its two poses without changing the live scene',()=>{
 const root=new THREE.Group(),geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial();
 const wall=new THREE.InstancedMesh(geometry,material,3),m=new THREE.Matrix4();wall.userData.part='building-interior-wall';
 [[-.9,1.5,0,1,3,.15],[.9,1.5,0,1,3,.15],[0,2.6,0,.8,.8,.15]].forEach(([x,y,z,w,h,d],i)=>wall.setMatrixAt(i,m.makeScale(w,h,d).setPosition(x,y,z)));root.add(wall);
 const door=new THREE.Group(),leaf=new THREE.Mesh(geometry,material);door.position.x=-.4;door.rotation.y=-1.4;door.userData.tourDoor={id:'example',axis:'rotation',property:'y',closed:0,open:-1.4,defaultOpen:true,kind:'entry'};leaf.position.set(.4,1,0);leaf.scale.set(.8,2,.04);door.add(leaf);root.add(door);root.updateMatrixWorld(true);
 const before=leaf.matrixWorld.clone(),layer=extractFloorMap(root);assert.equal(layer.walls.length,2,'the lintel does not close the door gap in plan');assert(!layer.walls.some(p=>inside([0,0],p)));assert.equal(layer.doors.length,1);assert.notDeepEqual(layer.doors[0].open,layer.doors[0].closed);assert(leaf.matrixWorld.equals(before));assert.equal(door.rotation.y,-1.4);
 wall.dispose();geometry.dispose();material.dispose();
});

test('position and heading stay registered across all eight building rotations and mirrors',()=>{
 for(const building of DISTRICT)for(const heading of [-170,-90,-15,0,70,179]){
  const matrix=buildingTransform(building),p=new THREE.Vector3(6.2,10,2.8),angle=heading*Math.PI/180,d=new THREE.Vector3(Math.sin(angle),0,-Math.cos(angle)),result=localMapPose(p.clone().applyMatrix4(matrix),d.clone().transformDirection(matrix),matrix.clone().invert());
  assert(Math.hypot(result.position[0]-p.x,result.position[1]-p.z)<1e-10,building.id);assert(Math.abs(result.heading-heading)<1e-10,building.id+' heading');
 }
});

test('automatic map follows the actual apartment, including after manual close and a change of floor or building',()=>{
 const at={building:'4102',floor:3,unit:17};assert(mapIsVisible(null,at));const choice={key:tourMapKey(at),open:false};assert(!mapIsVisible(choice,{...at}));assert(mapIsVisible(choice,{...at,unit:18}));assert(mapIsVisible(choice,{...at,floor:4,unit:23}));assert(mapIsVisible(choice,{...at,building:'3471'}));assert(!mapIsVisible(null,{building:'4102',floor:3}));assert(!mapIsVisible(null,{building:null,floor:0}));
});

test('focused plans use the supplied apartment layout, clip neighbours and keep balcony location attached',()=>{
 const poly=[[0,0],[6,0],[6,6],[0,6]],balcony=[[6,1],[8,1],[8,5],[6,5]],other=[[8,0],[12,0],[12,6],[8,6]],layer={walls:[[[1,0],[1.2,0],[1.2,3],[1,3]],[[10,0],[10.2,0],[10.2,3],[10,3]]],furniture:[],doors:[]},data={storey:3.1,floors:[{level:0,core:other,units:[{number:4,polygon:poly,displayPolygons:[poly,balcony]},{number:3,polygon:other}],map:layer}]},where={building:'4102',floor:0,unit:4};
 assert.equal(locationAt(new THREE.Vector3(7,1.62,2),data).unit,4);const plan=mapForLocation(data,where);assert.equal(plan.unit,4);assert.equal(plan.units.length,1);assert(plan.clip);assert(!plan.walls.includes('10,'));
 const alternate={walls:[[[2,0],[2.2,0],[2.2,3],[2,3]]],furniture:[{kind:'sofa',polygon:[[3,1],[5,1],[5,2],[3,2]]}],doors:[]},overrides=new Map([[tourMapKey(where),{polygons:[poly],layer:alternate}]]);
 assert(mapForLocation(data,where,overrides).walls.startsWith('M2,'));assert.equal(mapForLocation(data,where,overrides).furniture[0].kind,'sofa');assert.equal(mapForLocation(data,{...where,building:'4103'},overrides).walls,plan.walls);assert.equal(mapForLocation(data,{building:null,floor:0}),null);
 const concave=[[0,0],[5,0],[5,1],[1,1],[1,5],[0,5]];assert(inside(interiorLabel(concave),concave));
});
