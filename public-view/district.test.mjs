import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import{DISTRICT,buildingTransform,districtLocation,districtSolar,PLAN_ROTATION}from'./district.mjs';import{solarPosition}from'../src/solar-lighting.mjs';import{BUILDING_FLOORS}from'../src/building-layout.mjs';
test('whole-building rotation preserves every plan apartment number and reversible navigation',()=>{assert.equal(DISTRICT.length,8);assert.equal(new Set(DISTRICT.map(b=>b.id)).size,8);for(const b of DISTRICT)for(const u of BUILDING_FLOORS[0].units){const p=new THREE.Vector3(u.polygon[0][0],1.62,u.polygon[0][1]),world=p.clone().applyMatrix4(buildingTransform(b)),l=districtLocation(world,{storey:3.1});assert.equal(l.building,b.id);assert(l.position.distanceTo(p)<1e-8);}assert.deepEqual(BUILDING_FLOORS[0].units.map(u=>u.number),[1,2,3,4]);});
test('Sun and Moon plan coordinate frame rotates with the building, preserving incidence angles',()=>{const s={date:'2026-10-29',minutes:720,live:false,northBearing:135};const a=solarPosition(s),b=solarPosition(districtSolar(s)),expected=new THREE.Vector3(...a.direction).applyAxisAngle(new THREE.Vector3(0,1,0),PLAN_ROTATION);assert(expected.distanceTo(new THREE.Vector3(...b.direction))<1e-9);assert.equal(a.azimuth,b.azimuth);assert.equal(a.elevation,b.elevation);});

test('only 3461/3471 are mirrored; end buildings align while middle buildings are offset',()=>{
 const by=id=>DISTRICT.find(b=>b.id===id);assert.deepEqual(DISTRICT.filter(b=>b.mirror).map(b=>b.id),['3461','3471']);for(const id of ['4101','4093','4092','3461','3471'])assert.equal(by(id).angle,by('4102').angle);assert.notEqual(by('4103').angle,by('4102').angle);assert.notEqual(by('4091').angle,by('4102').angle);assert.equal(by('4102').x,by('4092').x);assert(by('4101').x<by('4102').x);assert(by('4093').x<by('4092').x);assert.notEqual(by('4101').x,by('4102').x);
});
test('baked mirror keeps outward normals and matches full reflected navigation transform',async()=>{
 const {mirroredGeometry}=await import('./district.mjs');const source=new THREE.BoxGeometry(2,3,4),geo=mirroredGeometry(source),p=geo.attributes.position,n=geo.attributes.normal;
 assert(geo.index,'reflected geometry retains compact shared vertices');const idx=geo.index;for(let i=0;i<idx.count;i+=3){const ia=idx.getX(i),ib=idx.getX(i+1),ic=idx.getX(i+2),a=new THREE.Vector3().fromBufferAttribute(p,ia),b=new THREE.Vector3().fromBufferAttribute(p,ib),c=new THREE.Vector3().fromBufferAttribute(p,ic),cross=b.sub(a).cross(c.sub(a)).normalize();assert(cross.dot(new THREE.Vector3().fromBufferAttribute(n,ia))>.99);}
 source.dispose();geo.dispose();
});

test('reconstructed centres retain the reference-image depth staggering and do not overlap',async()=>{
 const {districtFootprint}=await import('./district-layout.mjs');const by=id=>DISTRICT.find(b=>b.id===id);
 assert(by('3461').z>by('4103').z+15);assert(by('3471').z>by('3461').z+60);assert(by('3471').z<by('4091').z-30);
 for(let i=0;i<DISTRICT.length;i++)for(let j=i+1;j<DISTRICT.length;j++){const a=districtFootprint(DISTRICT[i]),b=districtFootprint(DISTRICT[j]);assert(a.maxX<=b.minX||a.minX>=b.maxX||a.maxZ<=b.minZ||a.minZ>=b.maxZ,`${DISTRICT[i].id} overlaps ${DISTRICT[j].id}`);}
});
test('all eight reconstructed centres reproject near their independently picked roof-centre controls',async()=>{
 const {readFile}=await import('node:fs/promises');const c=JSON.parse(await readFile(new URL('../scripts/district-layout-calibration.json',import.meta.url),'utf8')),h=c.imageFromDistrict;
 for(const b of DISTRICT){const q=h.map(row=>row[0]*b.x+row[1]*b.z+row[2]),expected=c.imageCentres[b.id];assert(Math.hypot(q[0]/q[2]-expected[0],q[1]/q[2]-expected[1])<4,`${b.id} moved away from its reference control`);}
});
