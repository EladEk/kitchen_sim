import test from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as THREE from 'three';
import {publicSiteData} from './public-site.mjs';
import {createSiteLayout,rectanglePolygon,bounds,inside} from '../public-view/site-layout.mjs';
import {createDistrictSite} from '../public-view/site-scene.mjs';

const source=publicSiteData(),layout=createSiteLayout(source);
const area=polygons=>polygons.reduce((sum,rings)=>sum+rings.reduce((a,ring,i)=>a+(i?-1:1)*Math.abs(ring.reduce((s,p,j)=>{const q=ring[(j+1)%ring.length];return s+p[0]*q[1]-q[0]*p[1];},0)/2),0),0);
test('compiled grass has no area under any bay, street, drive or footpath',()=>{
 const hardscape=[...layout.roadSurfaces.map(rectanglePolygon),...layout.parking.map(b=>b.polygon),...layout.sidewalks.map(w=>w.polygon)].map(p=>[p]);
 const grass=source.groundCover.grass.flatMap(l=>l.polygons);
 assert(area(grass)>1000,'actual green spaces remain');
 assert(area(clipping.intersection(grass,clipping.union(...hardscape)))<1e-6);
});
test('rendered grass triangles never cover the parking samples at any elevation',()=>{
 const site=createDistrictSite(source),grass=[],paved=[];
 site.group.traverse(o=>{if(o.userData.groundSurface==='grass')grass.push(o);if(o.userData.groundSurface==='parking')paved.push(o);});
 const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 try{
  for(const bay of layout.parking){const r=bounds(bay.polygon);for(const u of [.15,.5,.85])for(const v of [.15,.5,.85]){
   const x=r.minX+(r.maxX-r.minX)*u,z=r.minZ+(r.maxZ-r.minZ)*v;if(!inside([x,z],bay.polygon))continue;
   ray.ray.origin.set(x,2,z);
   assert.equal(ray.intersectObjects(grass,false).length,0,`grass under ${bay.id} at ${x},${z}`);
   assert(ray.intersectObjects(paved,false).length,`paving missing at ${bay.id}`);
  }}
  for(const garden of layout.gardens){const r=bounds(garden.polygon);let found=false;
   for(const u of [.25,.5,.75])for(const v of [.25,.5,.75]){const x=r.minX+(r.maxX-r.minX)*u,z=r.minZ+(r.maxZ-r.minZ)*v;if(!inside([x,z],garden.polygon))continue;ray.ray.origin.set(x,2,z);if(ray.intersectObjects(grass,false).length)found=true;}
   assert(found,`garden ${garden.building}/${garden.unit} retains grass`);
  }
 }finally{site.dispose();}
});
