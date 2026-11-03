import test from 'node:test';
import assert from 'node:assert/strict';
import clipping from 'polygon-clipping';
import * as THREE from 'three';
import {publicSiteData} from './public-site.mjs';
import {createSiteLayout,rectanglePolygon,inside} from '../public-view/site-layout.mjs';
import {createCourtyardDetails} from '../public-view/courtyard-details.mjs';
import {createDistrictSite} from '../public-view/site-scene.mjs';

const source=publicSiteData(),layout=createSiteLayout(source),court=source.landscape.courtyards;
const area=polygons=>polygons.reduce((n,rings)=>n+rings.reduce((s,ring,i)=>s+(i?-1:1)*Math.abs(ring.reduce((a,p,j)=>{const q=ring[(j+1)%ring.length];return a+p[0]*q[1]-q[0]*p[1];},0)/2),0),0);

test('source-derived internal planting leaves every numbered bay, drive and private garden free, with real holes in shared paving',()=>{
 assert.equal(court.sourceSHA256,'35546b8ad233b41cf0fdf0a32ff0fc6532361791ab705cda0c89730f13536bf8');assert.equal(court.verifiedAsBuilt,false);
 const beds=court.beds.flatMap(b=>b.polygons),blocked=clipping.union(...[...layout.roadSurfaces.map(rectanglePolygon),...layout.parking.map(p=>p.polygon),...layout.gardens.map(g=>g.plot)].map(p=>[p]));
 assert(area(beds)>500);assert(area(clipping.intersection(beds,blocked))<1e-6);
 const paving=clipping.union(...layout.sidewalks.map(w=>[w.polygon,...(w.holes||[])]));assert(area(clipping.intersection(beds,paving))<1e-6);
 assert.equal(layout.parking.filter(p=>p.traced).length,209);assert.equal(layout.parking.length,452);
 assert(court.pavingOverrides.length>0);assert.equal(court.beds.filter(b=>b.kind==='lawn').length,4);
 for(const x of [94.75,105.95])assert(court.trees.some(p=>p[0]===x));
});

test('tree/lawn pockets are rendered as grass beside clear paving, and both crossing path centre-lines remain free of plant beds',()=>{
 for(const path of court.paths){const [a,b]=path.points;for(let i=0;i<=100;i++){const p=a.map((v,k)=>v+(b[k]-v)*i/100);assert(!court.beds.some(bed=>bed.polygons.some(([outer,...holes])=>inside(p,outer)&&!holes.some(h=>inside(p,h)))));}}
 const site=createDistrictSite(source),grass=[],paving=[];site.group.traverse(o=>{if(o.userData.groundSurface==='grass')grass.push(o);if(o.userData.groundSurface==='sidewalk')paving.push(o);});
 const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0));
 try{for(const z of [35,52,96,113]){ray.ray.origin.set(94.75,1,z);assert(ray.intersectObjects(grass).some(h=>h.point.y>-.02));assert.equal(ray.intersectObjects(paving).length,0);ray.ray.origin.set(100.4,1,z);assert(ray.intersectObjects(paving).length>0);}}
 finally{site.dispose();}
});

test('botanical detail shares bounded batches, contains finite instance transforms and disposes every owned resource once',()=>{
 const details=createCourtyardDetails(court);assert(details.stats.instances>1000&&details.stats.instances<5000);assert(details.stats.drawCalls<=14);
 const events=new Map(),resources=Object.values(details.resources).flat();for(const r of resources)r.addEventListener('dispose',()=>events.set(r,(events.get(r)||0)+1));
 try{details.group.traverse(o=>{if(o.isMesh)assert(o.material.isMeshStandardMaterial);if(o.isInstancedMesh){const m=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);assert(m.elements.every(Number.isFinite));assert(m.determinant()>0);}}});assert(!details.group.children.some(o=>o.isLight));}
 finally{details.dispose();details.dispose();}
 assert.equal(details.group.children.length,0);for(const r of resources)assert.equal(events.get(r),1);
});
