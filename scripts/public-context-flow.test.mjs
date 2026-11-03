import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {createDistrict} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
import {SITE_TRACE} from '../src/building-site-trace.mjs';
test('the actual scene contains one shared water fixture and supports a walk across the south street around the education buildings',async()=>{
 const [json,site]=await Promise.all(['building','site'].map(n=>readFile('dist/client/baseline/'+n+'.json','utf8').then(JSON.parse))),model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 const p=new THREE.Vector3(112,1.608,175),walk=goal=>{const delta=new THREE.Vector3(goal[0]-p.x,0,goal[1]-p.z),n=Math.ceil(delta.length()/.025);delta.divideScalar(n);for(let i=0;i<n;i++){assert(stepWalker(p,delta.x,delta.z,world,ray),'blocked at '+p.toArray()+' towards '+goal);assert(Math.abs(p.y-1.62)<.20,'wrong supporting floor at '+p.toArray());}};
 try{
  const old=SITE_TRACE.features.find(f=>f.id==='site-main-water-meter');ray.set(new THREE.Vector3(old.position[0],3,old.position[1]),new THREE.Vector3(0,-1,0));ray.far=4;assert(!ray.intersectObject(model,true).some(h=>h.point.y>.25),'the residential baseline must not carry a shared-meter cabinet that would repeat with all eight buildings');
  const markers=[];district.group.traverse(o=>{if(o.name==='shared-main-water-meter')markers.push(o);});assert.equal(markers.length,1);
  const u=site.utilities[0];ray.set(new THREE.Vector3(u.position[0],3,u.position[1]),new THREE.Vector3(0,-1,0));ray.far=4;const hit=world.firstHit(ray);assert(hit&&Math.abs(hit.point.y-u.size[1])<.02);
  for(const goal of [[112,195.5],[84,195.5],[84,280],[-16,280],[-16,195.5],[168,195.5],[168,267]])walk(goal);
  assert.equal(world.stats.collisionCopies,1);
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
