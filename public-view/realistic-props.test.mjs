import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRealisticProps} from './realistic-props.mjs';

const pose=new THREE.Vector3(),matrix=new THREE.Matrix4(),color=new THREE.Color();
const assets=()=>({trees:[[0,0],[18,12],[100,0]],cars:[{x:8,z:0,angle:0,length:4.1},{x:12,z:8,angle:Math.PI/2,length:3.2},{x:-10,z:12,angle:.73,length:3.8}]});
const close=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<eps,`${a} != ${b}`);

test('all assets are present on the first frame and stay batched at district scale',()=>{
 const input={trees:Array.from({length:240},(_,i)=>[i%20*11,Math.floor(i/20)*12]),cars:Array.from({length:80},(_,i)=>({x:i%20*2.6,z:80+Math.floor(i/20)*12,angle:Math.PI/2,length:4.1}))},before=JSON.stringify(input),props=createRealisticProps(input);
 try{
  assert(props.getState().every(p=>p.tier===2));assert(props.stats.drawCalls>0);assert(props.stats.maxDrawCalls<70);assert(props.stats.templateTriangles<20000);assert.equal(JSON.stringify(input),before);
  props.update(new THREE.Vector3(40,1.7,40),0);
  for(const mesh of props.group.children){assert(mesh.isInstancedMesh);for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);assert(matrix.elements.every(Number.isFinite));assert(matrix.determinant()>0);}}
  assert.equal(JSON.stringify(input),before);
 }finally{props.dispose();}
});

test('distance tiers use hysteresis, throttling and full 3D camera distance',()=>{
 const props=createRealisticProps({cars:[{x:0,z:0,length:4}],trees:[[0,0]]}),near=props.thresholds[0],mid=props.thresholds[1];let now=0;
 const at=d=>{props.update(new THREE.Vector3(d,.7,0),now+=300);return props.getState().find(p=>p.type==='car').tier;};
 try{
  assert.equal(at(near-1),0);assert.equal(at(near+1),0);assert.equal(at(near*1.11),1);assert.equal(at(near-1),1);assert.equal(at(near*.88),0);
  assert.equal(at(mid*1.12),2);assert.equal(at(mid-1),2);assert.equal(at(mid*.88),1);
  const state=props.getState();assert.equal(props.update(new THREE.Vector3(0,.7,0),now+20),false);assert.deepEqual(props.getState(),state);
  props.update(new THREE.Vector3(0,500,0),now+=300);assert(props.getState().every(p=>p.tier===2),'aerial view uses far assets');
  props.update(new THREE.Vector3(0,1.7,0),now+=300);assert(props.getState().every(p=>p.tier===0),'walking view gets detail');
 }finally{props.dispose();}
});

test('placement, scale and instance colors remain stable through every tier',()=>{
 const props=createRealisticProps(assets()),initial=props.getState().map(({tier,...p})=>p);
 try{
  for(const [y,now] of [[2,1000],[80,2000],[400,3000],[2,4000]]){
   props.update(new THREE.Vector3(0,y,0),now);const state=props.getState();assert.deepEqual(state.map(({tier,...p})=>p),initial);
   for(const mesh of props.group.children.filter(m=>m.instanceColor)){
    const members=state.filter(p=>p.type===mesh.userData.propType&&p.tier===mesh.userData.detailTier);
    assert.equal(mesh.count,members.length);
    for(let i=0;i<mesh.count;i++){mesh.getColorAt(i,color);color.toArray().forEach((v,k)=>close(v,members[i].color[k]));}
   }
  }
  const leaf=props.resources.materials.find(m=>m.alphaTest>.4),canopy=props.resources.materials.find(m=>m.roughness===.95&&!m.map);
  assert(leaf&&canopy);let mean=0,weight=0;
  for(let i=0;i<leaf.map.image.data.length;i+=4){const a=leaf.map.image.data[i+3]/255;if(a<leaf.alphaTest)continue;const v=leaf.map.image.data[i]/255;mean+=new THREE.Color(v,v,v).convertSRGBToLinear().r*a;weight+=a;}
  close(canopy.color.r,mean/weight,1e-5);
 }finally{props.dispose();}
});

test('the actual geometry of every car tier and contact decal remains entirely inside its bay',()=>{
 const input=assets(),props=createRealisticProps(input);
 try{
  for(const [y,now] of [[2,1000],[82,2000],[400,3000]]){
   props.update(new THREE.Vector3(0,y,0),now);const state=props.getState().filter(p=>p.type==='car');
   for(const mesh of props.group.children.filter(m=>m.userData.propType==='car'&&m.count)){
    const members=mesh.userData.propPart==='contact-shadow'?state:state.filter(p=>p.tier===mesh.userData.detailTier),p=mesh.geometry.attributes.position;
    assert.equal(mesh.count,members.length);
    for(let i=0;i<mesh.count;i++){
     const car=members[i];mesh.getMatrixAt(i,matrix);
     for(let j=0;j<p.count;j++){
      pose.fromBufferAttribute(p,j).applyMatrix4(matrix).sub(new THREE.Vector3(car.position[0],car.position[1],car.position[2])).applyAxisAngle(THREE.Object3D.DEFAULT_UP,-car.angle);
      assert(Math.abs(pose.x)<=.950001,`${mesh.name}: width ${pose.x}`);assert(Math.abs(pose.z)<=car.length/2+.000001,`${mesh.name}: length ${pose.z}`);assert(pose.y>=-.000001,`${mesh.name}: below ground`);assert(pose.y<1.7);
     }
    }
   }
  }
 }finally{props.dispose();}
});

test('native Three serialization keeps alpha leaves and geometry, and every owned resource is released once',async()=>{
 const props=createRealisticProps(assets()),counts=[];
 try{
  props.update(new THREE.Vector3(0,2,0),1000);
  const exported=props.group.toJSON(),loaded=await new THREE.ObjectLoader().parseAsync(exported);
  let leaves=0;loaded.traverse(o=>{if(o.isMesh&&o.material.alphaTest>.4){leaves++;assert(o.material.map.image.data.length);}});assert(leaves);
  for(const resource of [...props.resources.geometries,...props.resources.materials,...props.resources.textures]){const n={value:0};counts.push(n);resource.addEventListener('dispose',()=>n.value++);}
  props.dispose();props.dispose();assert(counts.every(n=>n.value===1));assert.equal(props.update(new THREE.Vector3(),5000),false);assert.equal(props.group.children.length,0);
 }finally{props.dispose();}
});
