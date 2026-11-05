import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {buildBuildingContext} from './building-scene.js';
import {BUILDING_FLOORS} from './building-layout.mjs';
import {neighbourFurniture} from './apartment-furniture-scene.js';
import {normalizeHomeSettings,ROOMS} from './home-model.mjs';
import {buildingBoxes,buildingCanStand,buildingLocation} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';
import {walkingLocation,floorLabelPoint} from './walking-location.mjs';
import {polygonContains} from './building-geometry.mjs';

const all=[...APARTMENT_FURNITURE,...GROUND_APARTMENT_FURNITURE];
function model(){const group=new THREE.Group(),resources=[],settings=normalizeHomeSettings({buildingLevel:9,cutaway:false}),m=buildBuildingContext({group,resources,settings,mode:'building'});group.updateMatrixWorld(true);return {...m,settings,dispose:()=>resources.forEach(r=>r.dispose?.())};}

test('all 153 neighbour beds have a real wall behind the headboard and a free standing approach in actual walking collision',()=>{
 const m=model(),cars=createElevators(),beds=all.filter(r=>r.kind==='bed');assert.equal(beds.length,153);
 try{for(const floor of BUILDING_FLOORS){const node=m.floors.get(floor.level),boxes=buildingBoxes(floor.level,m.settings,cars),walls=[];node.traverse(o=>{if(o.isMesh&&['building-facade-wall','building-interior-wall','ground-base-wall'].includes(o.userData.part))walls.push(o);});
  for(const bed of beds.filter(r=>r.floor===floor.level)){const n=[Math.sin(bed.angle),Math.cos(bed.angle)],at=[bed.x-n[0]*bed.d/2,bed.z-n[1]*bed.d/2],ray=new THREE.Raycaster(new THREE.Vector3(at[0],floor.elevation+.7,at[1]),new THREE.Vector3(-n[0],0,-n[1]),0,.22);assert(ray.intersectObjects(walls,false).length,bed.id+' has a source-supported headboard');assert(buildingCanStand(bed.footApproach,floor.level,boxes,cars),bed.id+' remains reachable at the foot');}
 }}finally{m.dispose();}
});

test('all 42 other apartments have a sofa, coffee table and TV cabinet with matching render and walking records',()=>{
 const m=model(),groups=new Map();try{for(const r of all){assert.notEqual(r.unit,4,'owner furnishings stay independent');if(!groups.has(r.unit))groups.set(r.unit,new Set());groups.get(r.unit).add(r.kind);}assert.equal(groups.size,42);for(const kinds of groups.values())for(const kind of ['bed','sofa','coffee','media'])assert(kinds.has(kind));
 const rendered=new Set();m.group.traverse(o=>{if(o.userData.furnitureAsset==='sofa')for(const p of o.userData.placements)rendered.add(p.unit);});assert.equal(rendered.size,42);assert(!rendered.has(4));for(const f of BUILDING_FLOORS){const boxes=buildingBoxes(f.level,m.settings,createElevators());for(const r of neighbourFurniture(f.level))assert(boxes.some(b=>b.apartmentFurniture===r.id));}
 }finally{m.dispose();}
});

test('cloth, timber, stone and plaster use real detail/roughness maps shared across storeys at physical scale',()=>{
 const m=model(),fabricMaps=new Set(),woodMaps=new Set();let fabrics=0,plaster=0;try{m.group.traverse(o=>{if(!o.isMesh||!o.material||!o.userData.part?.startsWith('apartment-')&&!['building-facade-wall','building-interior-wall','ground-base-wall'].includes(o.userData.part))return;for(const material of [o.material].flat()){const kind=material.userData.surfaceKind;if(!['fabric','wood','plaster','limestone'].includes(kind))continue;assert(material.map&&material.bumpMap&&material.roughnessMap);assert(material.userData.metricInstancedUVs);assert(material.map.generateMipmaps);if(kind==='fabric'){fabricMaps.add(material.map);fabrics++;}if(kind==='wood')woodMaps.add(material.map);if(kind==='plaster')plaster++;}});assert(fabrics>0);let glb=0;m.group.traverse(o=>{if(o.userData.furnitureAsset)glb+=o.count;});assert(glb>250,'complete GLB instances replace legacy cloth boxes');assert(plaster>5);assert.equal(fabricMaps.size,1,'all storeys share the same cloth maps');assert.equal(woodMaps.size,1);const pixels=[...fabricMaps][0].image.data;assert(new Set(pixels).size>10,'detail is not a flat colour');
 }finally{m.dispose();}
});

test('live location follows the actual apartment, landing, garden and changed floor instead of a stale destination',()=>{
 assert.deepEqual(walkingLocation({floor:3,unit:17},null,'unit:43:8'),{floor:3,unit:17,common:null,lift:null,ready:true});assert.equal(walkingLocation({floor:3,unit:null},null,'unit:43:8').unit,null);assert.equal(walkingLocation({floor:8,unit:43},{floor:7,unit:40},'unit:40:7').floor,8);
 const garden=ROOMS.find(r=>r.id==='garden').walk;assert.equal(buildingLocation(garden,0).unit,4,'private garden remains identified as apartment 4');
 for(const f of BUILDING_FLOORS)for(const u of f.units)assert(polygonContains(floorLabelPoint(u.polygon),u.polygon),'map numbers remain inside the correct unit');
});
