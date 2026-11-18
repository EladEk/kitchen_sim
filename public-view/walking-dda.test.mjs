import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSpatialCollisionIndex} from './walking-world.mjs';
test('front-to-back DDA matches brute raycasting across axes, boundaries, diagonals and long rays',()=>{
 const root=new T.Group(),geo=new T.BoxGeometry(.8,1.6,.8),mat=new T.MeshBasicMaterial({side:T.DoubleSide});let seed=41;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
 for(let i=0;i<240;i++){const mesh=new T.Mesh(geo,mat);mesh.position.set((random()-.5)*90,(random()-.5)*30,(random()-.5)*90);root.add(mesh);}
 const farMesh=new T.Mesh(geo,mat);farMesh.position.set(1700,0,0);root.add(farMesh);root.updateMatrixWorld(true);const index=createSpatialCollisionIndex(root);
 for(let i=0;i<1200;i++){
  const origin=new T.Vector3((random()-.5)*110,(random()-.5)*45,(random()-.5)*110),dir=i%3===0?new T.Vector3(i%2?1:-1,0,0):new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();
  if(i%8===0)origin.set(3,0,-3);
  const ray=new T.Raycaster(origin,dir,0,200),expected=ray.intersectObjects(root.children,false)[0],actual=index.firstHit(ray);
  assert.equal(!!actual,!!expected,`ray ${i}`);if(actual)assert(Math.abs(actual.distance-expected.distance)<1e-4);
 }
 const long=new T.Raycaster(new T.Vector3(0,0,0),new T.Vector3(1,0,0),0,1800);assert(index.firstHit(long));
 index.dispose();geo.dispose();mat.dispose();
});
