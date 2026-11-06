import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {APARTMENT42_REFERENCE,APARTMENT42_FIXED_FURNITURE,APARTMENT42_BATHROOMS,apartment42Point,refineApartment42Furniture,refineApartment42Bathrooms} from './apartment42-reference.mjs';
import {APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {APARTMENT_BATHROOMS} from './apartment-bathroom-layout.mjs';
import {buildApartmentFurniture} from './apartment-furniture-scene.js';
import {createPublicRoomMaps} from '../scripts/public-room-map.mjs';
import {backing} from '../scripts/neighbour-furniture-tools.mjs';
import {extractFloorMap} from '../public-view/floor-map-geometry.mjs';

test('source wall fragments support a vanity across a joined seam while a real opening remains unsupported',()=>{
 const box={minX:0,maxX:.74,minZ:-.46,maxZ:-.06},wall=(a,b)=>({minX:a,maxX:b,minZ:0,maxZ:.25});
 assert(Math.abs(backing(box,Math.PI,.74,[wall(-.2,.37),wall(.37,1)])-.06)<1e-9);
 assert.equal(backing(box,Math.PI,.74,[wall(-.2,.20),wall(.54,1)]),Infinity);
});

test('apartment 42 is registered on the actual page-10 kitchen polyline rather than rescaled from the phone photograph',t=>{
 const result=spawnSync('python3',['-c',`import fitz,json
p=fitz.open('public/house/building-plan.pdf')[9]
d=next(d for d in p.get_drawings() if d['seqno']==6281)
print(json.dumps([[list(i[1]),list(i[2])] for i in d['items']]))`],{cwd:new URL('../',import.meta.url),encoding:'utf8'});
 if(result.error?.code==='ENOENT'||result.stderr?.includes("No module named 'fitz'")){t.skip('Independent PDF path verification needs Python/PyMuPDF');return;}
 assert.equal(result.status,0,result.stderr);const lines=JSON.parse(result.stdout),points=[lines[0][0],...lines.map(l=>l[1])];
 assert.equal(points.length,4);points.forEach((p,i)=>p.forEach((v,j)=>assert(Math.abs(v-APARTMENT42_REFERENCE.kitchenOutlinePdf[i][j])<.001)));
 const kitchen=APARTMENT42_FIXED_FURNITURE.find(r=>r.kind==='kitchen'),returns=APARTMENT42_FIXED_FURNITURE.filter(r=>r.kind==='kitchen-return');
 assert.equal(kitchen.w,4);assert.equal(returns.length,1);assert(Math.abs(kitchen.box.maxZ-returns[0].box.minZ)<1e-9,'counter legs meet without overlapping top faces');
 const sink=apartment42Point([688.56,282.96]),hob=apartment42Point([729.57,282.81]);
 assert(Math.hypot(kitchen.x+kitchen.sinkOffset-sink[0],kitchen.z-sink[1])<.04);
 assert(Math.hypot(kitchen.x+kitchen.hobOffset-hob[0],kitchen.z-hob[1])<.04);
 assert.equal(APARTMENT_FURNITURE.filter(r=>r.floor===8&&r.unit===42&&r.kind==='kitchen').length,1,'replace the short generic kitchen');
});

test('the reference refinement leaves other apartment records untouched and replaces only apartment-42 fixed fittings',()=>{
 const other={id:'f8-unit-43-kitchen',floor:8,unit:43,kind:'kitchen'},lower={id:'f7-unit-41-kitchen',floor:7,unit:41,kind:'kitchen'},old={id:'f8-kitchens-0',floor:8,unit:42,kind:'kitchen'},rows=[other,lower,old],copy=JSON.stringify(rows),refined=refineApartment42Furniture(rows);
 assert.equal(JSON.stringify(rows),copy);assert(refined.includes(other));assert(refined.includes(lower));assert(!refined.includes(old));
 const bathroom={floor:8,unit:43,kind:'basin'};assert(refineApartment42Bathrooms([bathroom]).includes(bathroom));
 assert.equal(APARTMENT_FURNITURE.filter(r=>r.floor===8&&r.unit===42&&r.kind==='bed').length,4);
 assert.equal(APARTMENT_BATHROOMS.filter(r=>r.floor===8&&r.unit===42&&r.kind==='wc').length,3);
});

test('the actual floor-8 meshes include the L return, fridge, laundry and open bathtub while the map identifies the safe room and service room',()=>{
 const parent=new THREE.Group(),resources=[],wanted=['apartment-kitchen-base','apartment-fridge-body','apartment-laundry-body','apartment-bathtub-bottom','apartment-shower-tray'];
 try{
  buildApartmentFurniture({parent,resources,level:8,base:24.8,settings:{}});parent.updateMatrixWorld(true);
  for(const part of wanted){const mesh=parent.children.find(o=>o.userData.part===part);assert(mesh,part);assert(mesh.userData.placements.some(p=>p.unit===42),part);}
  const plan=extractFloorMap(parent,{elevation:24.8});for(const kind of ['fridge','laundry','bathtub'])assert(plan.furniture.some(p=>p.kind===kind),kind+' appears in the projected map');
  const tops=parent.children.find(o=>o.userData.part==='apartment-kitchen-worktop'),mat=new THREE.Matrix4(),byId=new Map();
  tops.userData.placements.forEach((p,i)=>{if(p.unit!==42)return;tops.getMatrixAt(i,mat);byId.set(p.id,new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(.5,.5,.5)).applyMatrix4(mat));});
  assert.equal(byId.size,2);const [a,b]=[...byId.values()];assert(Math.min(a.max.z,b.max.z)-Math.max(a.min.z,b.min.z)<.00001,'no coincident countertop overlays');
  const rooms=createPublicRoomMaps().get(8).filter(r=>r.unit===42);for(const name of ['ממ״ד','חדר שירות','שירותי אורחים','חדר רחצה הורים'])assert(rooms.some(r=>r.he===name),name);
  for(const r of APARTMENT42_BATHROOMS)assert(r.approach.every(Number.isFinite));
 }finally{resources.forEach(r=>r.dispose?.());}
});
