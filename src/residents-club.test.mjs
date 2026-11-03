import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {RESIDENTS_CLUB as C,clubWindowProfile} from './residents-club.mjs';
import {BUILDING_FLOORS,normalizeTourDestination} from './building-layout.mjs';
import {buildingBoxes,buildingCanStand,buildingLocation,destinationStart,moveBuildingPlayer,parseDestination} from './building-navigation.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {createElevators} from './elevator-model.mjs';
const settings=normalizeHomeSettings({tourDestination:C.destination,buildingLevel:0,cutaway:false,furniture:false}),cars=createElevators();
test('club destination persists and walks through the actual lobby door; closed door and both windows block walking',()=>{
 assert.equal(normalizeTourDestination(C.destination),C.destination);assert.equal(normalizeHomeSettings(settings).tourDestination,C.destination);assert.equal(parseDestination(C.destination).common,'club');
 const boxes=buildingBoxes(0,settings,cars),start=destinationStart(C.destination,settings,cars);assert(buildingCanStand(start.position,0,boxes,cars));assert.equal(buildingLocation(start.position,0).common,'club');
 const outside=[7.1,-4.65],inside=[5.1,-4.65],moved=moveBuildingPlayer(outside,[-2,0],0,boxes,cars);assert(Math.hypot(moved[0]-inside[0],moved[1]-inside[1])<.03,'lobby entrance admits a visitor');
 const closed=buildingBoxes(0,{...settings,closedBuildingDoors:[C.doorId]},cars),blocked=moveBuildingPlayer(outside,[-2,0],0,closed,cars);assert(blocked[0]>6.2,'closed club door blocks approach');
 for(const z of [-8.6,-7,-3.9]){assert(!buildingCanStand([-.1492,z],0,boxes,cars),'window is never a walk-through opening');}
});
test('photographed club window replaces only the misclassified ground opening, and sill has actual opaque mesh',()=>{
 const openings=BUILDING_FLOORS[0].envelope.flatMap(p=>p.openings),wide=openings.find(o=>clubWindowProfile(0,o)&&Math.abs(o.b[1]-o.a[1])>2);assert(wide);assert.equal(wide.kind,'slider','original source trace is immutable');assert.equal(clubWindowProfile(0,wide).kind,'window');assert.equal(clubWindowProfile(1,wide),null);
 const group=new THREE.Group(),resources=[],model=buildBuildingContext({group,resources,settings,mode:'unit'});try{
  group.updateMatrixWorld(true);const ray=new THREE.Raycaster(new THREE.Vector3(-1,.55,-7.8),new THREE.Vector3(1,0,0));const hit=ray.intersectObject(group,true)[0];assert(hit&&hit.distance<1.1,'exterior sill wall closes lower window span');assert.equal((Array.isArray(hit.object.material)?hit.object.material[hit.face.materialIndex]:hit.object.material).transparent,false);
  assert(model.floors.get(0).getObjectByName('residents-club'));assert(!group.getObjectByName('club-ceiling'),'selected overview ceiling stays open');
 }finally{resources.forEach(r=>r.dispose?.());}
});
test('club walking ceiling, four 4000 K luminaires, global lamp switch and cutaway are consistent',()=>{
 for(const [mode,cut,lampsOn] of [['walk',false,true],['walk',false,false],['unit',true,true]]){
  const group=new THREE.Group(),resources=[];buildBuildingContext({group,resources,settings:{...settings,cutaway:cut,lampsOn},mode});try{const club=group.getObjectByName('residents-club');assert(club);const lights=[];club.traverse(o=>{if(o.isLight)lights.push(o);});assert.equal(lights.length,lampsOn&&!cut?4:0);for(const l of lights)assert.equal(l.userData.kelvin,4000);assert.equal(!!club.getObjectByName('club-ceiling'),mode==='walk');assert.equal(!!club.getObjectByName('club-ac-body'),!cut);}finally{resources.forEach(r=>r.dispose?.());}
 }
});
