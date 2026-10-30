import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createSpatialCollisionIndex, createWalkingWorld} from './walking-world.mjs';
import {stepWalker} from './walking.mjs';
import {DISTRICT, buildingTransform} from './district.mjs';

function fixture() {
 const model=new THREE.Group(),site=new THREE.Group(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const floor=new THREE.Mesh(new THREE.BoxGeometry(4,.1,4),mat);floor.position.set(16,-.05,-4);
 const wall=new THREE.Mesh(new THREE.BoxGeometry(.2,3,4),mat);wall.position.set(16.8,1.5,-4);model.add(floor,wall);
 return {model,site,mat,floor,wall,dispose(){model.traverse(o=>o.geometry?.dispose());mat.dispose();}};
}

test('shared walking index preserves floors, walls, slab edges and all eight rotated/reflected buildings',()=>{
 const f=fixture(),world=createWalkingWorld(f),ray=new THREE.Raycaster();
 try{
  for(const b of DISTRICT){
   const matrix=buildingTransform(b),direction=new THREE.Vector3(1,0,0).transformDirection(matrix).multiplyScalar(.05),p=new THREE.Vector3(16,1.62,-4).applyMatrix4(matrix);
   assert(stepWalker(p,direction.x,direction.z,world,ray),b.id+' floor must be walkable');
   for(let i=0;i<30;i++)stepWalker(p,direction.x,direction.z,world,ray);
   assert(p.clone().applyMatrix4(matrix.clone().invert()).x<16.55,b.id+' wall must block');
   p.set(14.01,1.62,-4).applyMatrix4(matrix);assert(!stepWalker(p,-direction.x,-direction.z,world,ray),b.id+' slab edge must block');
  }
  assert.equal(world.stats.collisionCopies,1);assert.equal(world.building.stats.records,2);
 }finally{world.dispose();f.dispose();}
});

test('spatial queries select the actual floor and stairs normal, including a translated upper floor',()=>{
 const root=new THREE.Group(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),g=new THREE.PlaneGeometry(4,4).rotateX(-Math.PI/2);
 for(const y of [0,3.1,6.2]){const o=new THREE.Mesh(g,mat);o.position.y=y;root.add(o);}
 const index=createSpatialCollisionIndex(root),p=new THREE.Vector3(0,4.72,0),ray=new THREE.Raycaster();
 assert(stepWalker(p,.05,0,index,ray));assert(Math.abs(p.y-4.72)<1e-5);index.dispose();g.dispose();mat.dispose();
});

test('far instanced objects are skipped and repeated steps reuse fixed buffers without rebuilding BVHs',()=>{
 const root=new THREE.Group(),g=new THREE.BoxGeometry(.2,3,1),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),instances=new THREE.InstancedMesh(g,mat,1500);
 for(let i=0;i<1500;i++)instances.setMatrixAt(i,new THREE.Matrix4().makeTranslation(i*4,1.5,0));root.add(instances);
 const index=createSpatialCollisionIndex(root),ray=new THREE.Raycaster(new THREE.Vector3(-1,.7,0),new THREE.Vector3(1,0,0),0,2),initial={...index.stats};
 for(let i=0;i<1000;i++){assert(index.firstHit(ray,{any:true}));assert(index.stats.narrowTests<=2);assert(index.stats.candidates<5);}
 assert.equal(index.stats.records,initial.records);assert.equal(index.stats.bufferBytes,initial.bufferBytes);assert.equal(index.stats.cells,initial.cells);
 index.dispose();index.dispose();assert.equal(index.firstHit(ray),null);g.dispose();mat.dispose();instances.dispose();
});

test('BVHs share original render buffers, preserve indexed ordering and release no shared render resources',()=>{
 const root=new THREE.Group(),g=new THREE.SphereGeometry(1,24,16),mat=new THREE.MeshBasicMaterial(),object=new THREE.Mesh(g,mat);root.add(object);
 const before=g.index.array.slice(),position=g.attributes.position,index=g.index,trees=new Map();let released=0;
 g.addEventListener('dispose',()=>released++);mat.addEventListener('dispose',()=>released++);
 const collision=createSpatialCollisionIndex(root,{trees});assert(trees.get(g));assert.equal(g.index,index);assert.equal(g.attributes.position,position);assert.deepEqual(g.index.array,before);
 assert(collision.firstHit(new THREE.Raycaster(new THREE.Vector3(0,0,3),new THREE.Vector3(0,0,-1),0,4)));
 collision.dispose();assert.equal(released,0);assert.equal(g.boundsTree,undefined);g.dispose();mat.dispose();
});

test('site colliders remain stable when prop LOD matrices change; foliage and contact shadows do not block paths',()=>{
 const f=fixture(),g=new THREE.BoxGeometry(1,1,1),body=new THREE.InstancedMesh(g,f.mat,1),leaves=new THREE.Mesh(g,f.mat),matrix=new THREE.Matrix4().makeTranslation(40,.5,0);
 body.userData={propType:'car',detailTier:2,propPart:'body'};body.setMatrixAt(0,matrix);leaves.position.set(38,.5,0);leaves.userData={propType:'tree',detailTier:2,propPart:'foliage'};f.site.add(body,leaves);
 const world=createWalkingWorld(f),ray=new THREE.Raycaster(new THREE.Vector3(37,.5,0),new THREE.Vector3(1,0,0),0,4);
 assert(Math.abs(world.firstHit(ray).point.x-39.5)<1e-5);
 body.count=0;body.setMatrixAt(0,new THREE.Matrix4().makeTranslation(100,.5,0));
 assert(Math.abs(world.firstHit(ray).point.x-39.5)<1e-5);assert.equal(world.outside.stats.records,1);
 world.dispose();g.dispose();body.dispose();f.dispose();
});
