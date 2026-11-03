import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import clipping from 'polygon-clipping';
import * as THREE from 'three';
import {createDistrict} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {createSiteLayout,rectanglePolygon} from '../public-view/site-layout.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';
const load=async name=>JSON.parse(await readFile('dist/client/baseline/'+name+'.json','utf8'));
const area=polygons=>polygons.reduce((total,rings)=>total+rings.reduce((sum,p,i)=>sum+(i?-1:1)*Math.abs(p.reduce((n,a,j)=>{const b=p[(j+1)%p.length];return n+a[0]*b[1]-b[0]*a[1];},0))/2,0),0);

test('compiled parks preserve the measured parking, leave the pocket garden free of road and permit a real walk to the three shade pavilions and amphitheatre',async()=>{
 const [json,site]=await Promise.all(['building','site'].map(load)),model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),layout=createSiteLayout(site),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 try{
  assert.equal(site.landscape.verifiedAsBuilt,false);assert.equal(site.landscape.parks.length,2);assert.equal(site.landscape.shelters.length,3);assert.equal(layout.parking.filter(p=>p.traced).length,209);
  const pocket=site.landscape.parks.find(p=>p.id==='east-pocket-garden').polygons;assert(area(pocket)>300);assert(area(clipping.intersection(pocket,layout.roadSurfaces.map(r=>[rectanglePolygon(r)])))<.000001);
  const p=new THREE.Vector3(35.9,1.608,-24),walk=goal=>{const delta=new THREE.Vector3(goal[0]-p.x,0,goal[1]-p.z),n=Math.ceil(delta.length()/.025);delta.divideScalar(n||1);for(let i=0;i<n;i++){assert(stepWalker(p,delta.x,delta.z,world,ray),`park route blocked at ${p.toArray()} towards ${goal}`);assert(Math.abs(p.y-1.62)<.20,`path follows real ground rather than a roof or hidden plane: ${p.toArray()} towards ${goal}`);}};
  for(const goal of [[35.9,-44],[40.18,-53.8],[46.15,-60.84],[53.2,-66.73],[60.76,-73.39],[67.94,-81.92],[69.4,-83.8],[84,-91],[107.6,-96.02],[107.6,-88],[119,-86],[129.9,-90.21],[120.61,-79.51],[112.93,-70.2],[104.96,-61.86],[98.26,-52.32],[91.92,-44.03],[110,-43],[125.19,-52]])walk(goal);
  for(const shelter of site.landscape.shelters){ray.set(new THREE.Vector3(shelter.position[0],1.62,shelter.position[1]),new THREE.Vector3(0,1,0));ray.far=5;const hit=world.firstHit(ray);assert(hit&&hit.point.y>3.5,'shade roof is present with standing clearance');}
  p.set(205,1.608,45);for(const goal of [[202.8,45.5],[195,45],[187.8,49],[188,58],[195,65.4],[202.5,65],[205,65]])walk(goal);
  assert.equal(world.stats.collisionCopies,1);
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
