import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDistrict,DISTRICT,buildingTransform} from './district.mjs';
import {PLAN_CENTER} from './district-layout.mjs';
import {publicSiteData} from '../scripts/public-site.mjs';

const siteData=publicSiteData(),matrix=new THREE.Matrix4();
const sameMatrix=(a,b)=>a.elements.every((v,i)=>Math.abs(v-b.elements[i])<.0001);
const center=(id,y=14)=>{const b=DISTRICT.find(b=>b.id===id);return new THREE.Vector3(PLAN_CENTER[0]+b.x,y,PLAN_CENTER[1]+b.z);};
function fixture(mobile=false,sharedMaterial=false){
 const template=new THREE.Group(),facadeMaterial=new THREE.MeshStandardMaterial({color:'#b2a58c',roughness:.8}),interiorMaterial=sharedMaterial?facadeMaterial:new THREE.MeshStandardMaterial({color:'#758d9a',roughness:.65}),facade=new THREE.Mesh(new THREE.BoxGeometry(2.3,3.1,1.1),facadeMaterial),interior=new THREE.Mesh(new THREE.BoxGeometry(.6,.8,1.2),interiorMaterial);
 facade.position.set(7,8,3);facade.userData={level:1,exterior:true};interior.position.set(9,8,2);interior.userData={level:1,exterior:false};template.add(facade,interior);template.updateMatrixWorld(true);
 const district=createDistrict(template,siteData,{mobile});
 return {district,template,facade,interior,facadeMaterial,interiorMaterial,dispose(){district.dispose();facade.geometry.dispose();interior.geometry.dispose();facadeMaterial.dispose();if(interiorMaterial!==facadeMaterial)interiorMaterial.dispose();}};
}
function batches(district,detail){return district.group.children.filter(o=>o.userData.district&&o.userData.detail===detail);}
function shown(district,detail){
 const found=[];
 for(const mesh of batches(district,detail))for(let i=0;i<mesh.count;i++){
  mesh.getMatrixAt(i,matrix);const building=DISTRICT.find(b=>sameMatrix(matrix,buildingTransform({...b,mirror:false})));assert(building,'every context instance retains a real building transform');found.push({building,mesh,index:i,matrix:matrix.clone()});
 }
 return found;
}
const ids=(district,detail)=>shown(district,detail).map(p=>p.building.id).sort();
const expectedIds=active=>DISTRICT.filter(b=>b.id!==active).map(b=>b.id).sort();
function vertexSet(geometry,transform){
 const positions=geometry.attributes.position,index=geometry.index,n=index?.count??positions.count,point=new THREE.Vector3(),result=[];
 for(let i=0;i<n;i++){point.fromBufferAttribute(positions,index?index.getX(i):i).applyMatrix4(transform);result.push(point.toArray().map(v=>Math.round(v*1000)).join(','));}
 return result.sort();
}
function assertFacades(f,active){
 assert.deepEqual(ids(f.district,'exterior'),expectedIds(active));
 for(const {building,mesh,matrix:world} of shown(f.district,'exterior')){
  assert.equal(mesh.material,f.facadeMaterial);assert.equal(mesh.material.color.getHex(),0xb2a58c);assert.equal(mesh.material.opacity,1);assert.equal(mesh.material.transparent,false);
  const expected=buildingTransform(building).multiply(f.facade.matrixWorld);
  assert.deepEqual(vertexSet(mesh.geometry,world),vertexSet(f.facade.geometry,expected),`facade geometry for ${building.id}`);
 }
}

test('aerial camera hides all context interiors while seven original facades, colors and reflected geometry remain',()=>{
 const f=fixture();
 try{
  assert.deepEqual(ids(f.district,'interior'),expectedIds('4102'));assertFacades(f,'4102');
  const geometry=batches(f.district,'exterior').map(m=>m.geometry),sourcePositions=Array.from(f.facade.geometry.attributes.position.array);
  f.district.update(center('4102',500),0);
  assert.deepEqual(ids(f.district,'interior'),[]);assertFacades(f,'4102');assert.deepEqual(batches(f.district,'exterior').map(m=>m.geometry),geometry);assert.deepEqual(Array.from(f.facade.geometry.attributes.position.array),sourcePositions);
  f.district.update(center('3461'),300);
  assert(ids(f.district,'interior').includes('3461'),'mirrored building interior returns nearby');assertFacades(f,'4102');
  for(const {mesh} of shown(f.district,'interior'))assert.equal(mesh.material,f.interiorMaterial);
 }finally{f.dispose();}
});

test('mobile and desktop interior visibility thresholds have hysteresis and a throttled update',()=>{
 for(const mobile of [true,false]){
  const f=fixture(mobile),threshold=mobile?90:130,origin=center('3461');let now=0;
  const at=distance=>{f.district.update(origin.clone().add(new THREE.Vector3(distance,0,0)),now+=300);return ids(f.district,'interior').includes('3461');};
  try{
   assert(at(0));assert(at(threshold*1.05),'visible interiors stay through the outer transition band');assert.equal(at(threshold*1.12),false);assert.equal(at(threshold*.95),false,'hidden interiors stay hidden through the inner transition band');assert(at(threshold*.88));
   const before=ids(f.district,'interior');f.district.update(center('3461',500),now+100);assert.deepEqual(ids(f.district,'interior'),before,'sub-250ms change is throttled');
   f.district.update(center('3461',500),now+300);assert.deepEqual(ids(f.district,'interior'),[]);assertFacades(f,'4102');
  }finally{f.dispose();}
 }
 const mobile=fixture(true),desktop=fixture(false),position=center('3461').add(new THREE.Vector3(105,0,0));
 try{mobile.district.update(position,0);desktop.district.update(position,0);assert(!ids(mobile.district,'interior').includes('3461'));assert(ids(desktop.district,'interior').includes('3461'));}finally{mobile.dispose();desktop.dispose();}
});

test('active duplicate exclusion survives camera changes and switching between mirrored and rotated buildings',()=>{
 const f=fixture();let now=0;
 try{
  for(const active of ['3461','4103','3471','4091','4102']){
   f.district.setActiveBuilding(active);assertFacades(f,active);assert(!ids(f.district,'interior').includes(active));
   f.district.update(center(active,500),now+=300);assert.deepEqual(ids(f.district,'interior'),[]);assertFacades(f,active);
   const nearby=active==='4102'?'4103':'4102';f.district.update(center(nearby),now+=300);assert(ids(f.district,'interior').includes(nearby));assert(!ids(f.district,'interior').includes(active));assertFacades(f,active);
   f.district.setActiveBuilding(active);assertFacades(f,active);assert(!ids(f.district,'interior').includes(active));
  }
 }finally{f.dispose();}
});

test('shared facade/interior materials still partition by exterior metadata rather than material identity',()=>{
 const f=fixture(false,true);
 try{
  assert.deepEqual(ids(f.district,'interior'),expectedIds('4102'));f.district.update(center('4102',500),0);assert.deepEqual(ids(f.district,'interior'),[]);assertFacades(f,'4102');
 }finally{f.dispose();}
});
