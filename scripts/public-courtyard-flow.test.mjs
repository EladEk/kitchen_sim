import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createDistrict} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

test('the actual rendered district permits a continuous walk along both planted axes and every court connector',async()=>{
 const [json,site]=await Promise.all(['building','site'].map(n=>readFile('dist/client/baseline/'+n+'.json','utf8').then(JSON.parse))),model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 const p=new THREE.Vector3(),walk=(from,to)=>{p.set(from[0],1.608,from[1]);const delta=new THREE.Vector3(to[0]-from[0],0,to[1]-from[1]),count=Math.ceil(delta.length()/.025);delta.divideScalar(count);for(let i=0;i<count;i++){assert(stepWalker(p,delta.x,delta.z,world,ray),'blocked at '+p.toArray()+' along '+from+' → '+to);assert(Math.abs(p.y-1.62)<.20,'walker left real ground at '+p.toArray());}};
 try{
  assert.equal(site.landscape.courtyards.revision,109);
  walk([112,-24],[112,175]);walk([112,175],[112,-24]);walk([-25,74.55],[205,74.55]);walk([205,74.55],[-25,74.55]);
  for(const z of [27.5,43.5,60,87.5,104.5,121.2]){walk([100, z],[112,z]);walk([112,z],[100,z]);}
  assert.equal(world.stats.collisionCopies,1);
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
