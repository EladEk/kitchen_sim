import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {APARTMENT_BATHROOMS} from './apartment-bathroom-layout.mjs';
import {APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {bathroomContexts} from '../scripts/place-bathrooms-r112.mjs';
import {backing} from '../scripts/neighbour-furniture-tools.mjs';
import {registeredLivingGuides,upperLivingContext} from '../scripts/revise-living-r102.mjs';
import {FURNITURE,DOORS,WALLS,point,furnitureBounds,insidePolygon,ROOMS} from './home-model.mjs';
import {groundAngle,groundDirection,groundPoint,groundInverse} from './ground-apartments.mjs';
import {createInteriorProbe,interiorProbePixels} from './interior-probe.mjs';
import {createContactShadows} from './contact-shadows.mjs';
import {surfacePixels,surfaceCacheStats,clearSurfacePixelCache} from '../public-view/surface-detail.mjs';

test('all 103 source wet rooms have separated reachable fixtures outside walls and door sweeps',()=>{
 const contexts=bathroomContexts();assert.equal(contexts.length,103);assert.equal(new Set(contexts.map(r=>r.floor)).size,8);
 for(const row of contexts){const set=APARTMENT_BATHROOMS.filter(f=>f.floor===row.floor&&f.unit===row.unit&&f.roomId===`wet-${row.index}`),fixed=APARTMENT_FURNITURE.filter(f=>f.floor===row.floor&&f.unit===row.unit).map(f=>f.box);assert(set.some(f=>f.kind==='wc'));assert(set.some(f=>f.kind==='basin'));
  for(const f of set){const other=[...fixed,...set.filter(o=>o!==f).map(o=>o.box)];assert(row.room.valid(f.box,other),f.id+' clears real wall/door/fixture bounds');assert(row.room.pointClear(f.approach,other,.16),f.id+' has a usable front approach');assert(Number.isFinite(backing(f.box,f.angle,f.w,row.room.walls)),f.id+' backs onto a real wall');}
  assert(row.room.routesClear([...fixed,...set.map(f=>f.box)]));
 }
});
test('source-registered lounges including the penthouses keep opposing TVs on supported floor consoles',()=>{
 for(const guide of registeredLivingGuides()){const media=APARTMENT_FURNITURE.find(r=>r.floor===guide.floor&&r.unit===guide.unit&&r.kind==='media'),room=upperLivingContext(guide);assert.equal(media.support,'floor-console');assert(room.valid(media.box,[]),media.id);if(media.wallBacked)assert(Number.isFinite(backing(media.box,media.angle,media.w,room.walls)),media.id);}
});
test('personal wet-room fixtures preserve room boundaries and clear the full door-leaf sweep; proposed west vanity point is rejected',()=>{
 const wet=FURNITURE.filter(f=>['bathroom','ensuite','powder'].includes(f.roomId));
 for(const f of wet){const b=furnitureBounds(f),room=ROOMS.find(r=>r.id===f.roomId);for(const [x,z]of [[b.minX,b.minZ],[b.minX,b.maxZ],[b.maxX,b.minZ],[b.maxX,b.maxZ]])assert(insidePolygon([x,z],room.polygon),f.id+' fits its source room');}
 const intersect=(p,b)=>p[0]>b.minX-.022&&p[0]<b.maxX+.022&&p[1]>b.minZ-.022&&p[1]<b.maxZ+.022;
 for(const d of DOORS.filter(d=>['bath','ensuite','powder','utility'].includes(d.id))){const wall=WALLS.find(w=>w.id===d.wallId),at=v=>d.vertical?[wall.a[0],v]:[v,wall.a[1]],hinge=at(d.hinge==='end'?d.end:d.start),end=at(d.hinge==='end'?d.start:d.end),dx=end[0]-hinge[0],dz=end[1]-hinge[1];for(let step=0;step<=30;step++){const angle=(d.swing||-1)*Math.PI/2*step/30;for(let j=1;j<=30;j++){const t=j/30,p=[hinge[0]+(dx*Math.cos(angle)+dz*Math.sin(angle))*t,hinge[1]+(-dx*Math.sin(angle)+dz*Math.cos(angle))*t];for(const f of wet.filter(f=>d.rooms.includes(f.roomId)))assert(!intersect(p,furnitureBounds(f)),d.id+' sweeps clear of '+f.id);}}}
 const door=DOORS.find(d=>d.id==='bath');assert(point(974,422)[1]>door.start&&point(974,422)[1]<door.end);assert.equal(FURNITURE.find(f=>f.id==='ensuite-toilet').rotation,Math.PI/2);
});
test('canonical furniture angles transform their actual facing through each reflected ground registration',()=>{
 for(const unit of [1,2,3,4])for(const angle of [0,Math.PI/2,Math.PI,-Math.PI/2]){const result=groundAngle(unit,angle),v=groundDirection(unit,[Math.sin(angle),Math.cos(angle)]);assert(Math.abs(Math.sin(result)-v[0])<1e-10);assert(Math.abs(Math.cos(result)-v[1])<1e-10);const p=[2,4];assert(groundInverse(unit,groundPoint(unit,p)).every((n,i)=>Math.abs(n-p[i])<1e-10));}
});
test('the interior HDR remains neutral and fixed on indoor materials while the sky remains external; night and disposal restore ownership',()=>{
 const pixels=interiorProbePixels();assert.equal(pixels.width,1024);assert(pixels.data.every(Number.isFinite));assert(pixels.data.some(v=>v>1));
 const scene=new THREE.Scene(),sky=new THREE.Texture(),interior=new THREE.MeshStandardMaterial(),outdoor=new THREE.MeshStandardMaterial();interior.userData.architecturalInterior=true;scene.environment=sky;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),interior),new THREE.Mesh(new THREE.BoxGeometry(),outdoor));let disposed=0;
 const probe=createInteriorProbe({}, {mobile:true,environmentFactory:()=>({texture:new THREE.Texture(),dispose(){disposed++;}})});probe.bind(scene);probe.bind(scene);assert.equal(probe.stats.materials,1);assert.equal(interior.envMap,probe.texture);assert.equal(outdoor.envMap,null);assert.equal(scene.environment,sky);const texture=interior.envMap;
 probe.update(1);const dayIntensity=interior.envMapIntensity;assert(dayIntensity>=.8&&dayIntensity<=1.1);
 for(const amount of [1,.5,0,1]){probe.update(amount);assert.equal(interior.envMap,texture);assert.equal(interior.envMapIntensity,amount*dayIntensity);assert.equal(scene.environment,sky);}probe.dispose();probe.dispose();assert.equal(disposed,1);assert.equal(interior.envMap,null);assert.equal(interior.envMapIntensity,1);scene.children.forEach(o=>{o.geometry.dispose();o.material.dispose();});sky.dispose();
});
test('fallback XYZ normals are unit length with separate roughness and bounded caches; contact shadow geometry is shared',()=>{
 const p=surfacePixels('porcelain',1024);assert.equal(p.normal.length,1024*1024*4);for(let i=0;i<p.normal.length;i+=4096){const n=[0,1,2].map(c=>p.normal[i+c]/255*2-1);assert(Math.abs(Math.hypot(...n)-1)<.015);assert(p.normal[i+2]>220);}assert(surfaceCacheStats().bytes<=surfaceCacheStats().limit);clearSurfacePixelCache();
 const resources=[],shadows=createContactShadows(resources),a=shadows.mesh(2,1),b=shadows.mesh(1,2);assert.equal(a.geometry,b.geometry);assert.equal(a.material,b.material);assert.equal(a.scale.z,1.18);assert.equal(a.scale.y,1);assert.equal(a.material.depthWrite,false);assert(a.userData.tourNonPhysical);resources.forEach(r=>r.dispose());
});

test('optical shower glass uses refraction only within the desktop budget and returns safely from stereo',async()=>{
 const {createArchitecturalGlass,setArchitecturalGlassQuality}=await import('./architectural-glass.mjs'),resources=[],glass=createArchitecturalGlass(resources,{mobile:false});assert.equal(glass.transmission,.92);assert.equal(glass.opacity,1);assert(!glass.transparent);assert(setArchitecturalGlassQuality(glass,{xr:true}));assert.equal(glass.transmission,0);assert(glass.transparent);assert.equal(glass.opacity,.22);assert(!setArchitecturalGlassQuality(glass,{xr:true}));assert(setArchitecturalGlassQuality(glass,{tier:0}));assert.equal(glass.transmission,.92);setArchitecturalGlassQuality(glass,{mobile:true});assert.equal(glass.transmission,0);resources.forEach(r=>r.dispose());
});
