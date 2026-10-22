import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {HARASH_ASSETS} from './harash-catalog-assets.mjs';
import {HARASH_MATCHES,HARASH_CATALOG_SOURCE,catalogueSource} from './harash-catalog.mjs';
import {HOME_PRODUCTS,productById} from './home-products.mjs';
import {ORDERED_SURFACES} from './ordered-flooring.mjs';
import {orderedFloorPhotoData} from './ordered-floor-photo.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {getFurniture,furnitureParts,normalizeHomeSettings,point} from './home-model.mjs';
import {furnitureMeasurements} from './home-measurements.mjs';
import {DEFAULTS} from './model.mjs';
import {closeAllStudioOpenings} from './studio-state.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

const read=path=>readFileSync(new URL(`../public${path}`,import.meta.url));
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const near=(a,b,epsilon=1e-6)=>assert(Math.abs(a-b)<epsilon,`${a} ≈ ${b}`);
const parts=(root,name)=>{const list=[];root.traverse(o=>{if(o.userData.part===name)list.push(o);});return list;};

test('the full attached catalogue and every extracted source asset retain verifiable bytes and bounded page evidence',()=>{
 assert.equal(HOME_PRODUCTS.length,19);assert.deepEqual(Object.keys(HARASH_MATCHES).sort(),HOME_PRODUCTS.map(p=>p.id).sort());
 assert.equal(digest(read(HARASH_CATALOG_SOURCE.pdf)),HARASH_ASSETS.catalog.sha256);
 assert.deepEqual(JSON.parse(read('/materials/harash/manifest.json')),HARASH_ASSETS);
 for(const [id,asset] of Object.entries(HARASH_ASSETS)){
  if(id==='catalog')continue;assert.equal(digest(read(asset.image)),asset.sha256,id);if(asset.nativeImage)assert.equal(digest(read(asset.nativeImage)),asset.nativeSha256,id+' native source');
 }
 for(const p of HOME_PRODUCTS){assert(p.catalogue);for(const [i,r] of (p.catalogue.refs||[]).entries()){
  assert(HARASH_CATALOG_SOURCE.pages.includes(r.page));const [x,y,w,h]=r.rect;assert(x>=0&&y>=0&&w>0&&h>0&&x+w<=1&&y+h<=1,p.id);assert.equal(read(`/house/harash-catalog-${r.page}.jpg`).readUInt16BE(0),0xffd8);assert.deepEqual(catalogueSource(p.id,i),{source:'harash-catalog',page:r.page,catalogueProductId:p.id,catalogueReference:i});
 }}
 assert.deepEqual(HOME_PRODUCTS.filter(p=>p.catalogue.status==='sku').map(p=>p.sku),['VR001221']);
 assert.equal(productById('bath-vanity').ambiguous,true);assert.equal(productById('bath-vanity').catalogue.refs.length,2);assert.equal(productById('guest-basin').ambiguous,false);
 assert.equal(productById('dry-floor').catalogue.status,'unmatched');assert.equal(productById('kitchen-sink').catalogue.status,'outside');assert.equal(productById('mirror').catalogue.status,'unmatched');
 assert.equal(productById('basin-tap').catalogue.status,'family');assert.equal(productById('shower-head').catalogue.status,'partial');assert(productById('shower-head').catalogue.refs[0].image.includes('arm-35'));
});

test('matched material maps retain real catalogue RGB, horizontal decor and long-axis plank grain without replacing the owner floor',async()=>{
 const previousImage=globalThis.Image,previousDocument=globalThis.document,images=[],draws=[],rotations=[],resources=[];
 globalThis.Image=class{set src(value){this.url=value;images.push(value);queueMicrotask(()=>this.onload());}};
 globalThis.document={createElement:()=>{const canvas={};let current;canvas.getContext=()=>({drawImage(img,...args){current=img.url;draws.push({url:img.url,args});},translate(){},rotate(a){rotations.push(a);},getImageData(){const values=new Uint8ClampedArray(canvas.width*canvas.height*4),rgb=current.includes('habitat')?[169,130,98]:current.includes('mona')?[177,173,166]:[181,176,169];for(let i=0;i<values.length;i+=4)values.set([...rgb,255],i);return {data:values};}});return canvas;}};
 try{
  const surface=createSurfacePalette(resources),ids=['wet-floor','shower-floor','terrace-floor','wet-wall'],materials=ids.map(id=>surface(ORDERED_SURFACES[id].kind,'#ff00ff',{productId:id}));
  const data=await Promise.all(ids.map(orderedFloorPhotoData));await Promise.resolve();
  assert.equal(images.length,3,'R10 and R11 reuse the same native colour photograph');assert.equal(new Set(images).size,3);assert(images.every(x=>x.startsWith('/materials/runtime/')));assert.deepEqual(rotations,[Math.PI/2]);assert(draws.find(d=>d.url.includes('habitat')).args[4]<0,'plank image rotates about its centre');
  materials.forEach((m,i)=>{const profile=ORDERED_SURFACES[ids[i]];assert.equal(m.color.getHexString(),'ffffff');assert.equal(m.userData.textureBasis,'catalog-product-image');assert.strictEqual(m.map.image.data,data[i].color);near(m.map.repeat.x,1/profile.tile[0]);near(m.map.repeat.y,1/profile.tile[1]);assert.equal(m.bumpScale,0,'do not invent a measured relief map from a catalogue photo');assert.equal(m.map.colorSpace,THREE.SRGBColorSpace);});
  assert.notStrictEqual(materials[0].map,materials[1].map);assert(materials[1].roughness>materials[0].roughness);assert.strictEqual(data[0],data[1]);
  assert.equal(ORDERED_SURFACES['dry-floor'].textureBasis,'owner-product-photo');assert(ORDERED_SURFACES['dry-floor'].photo.image.includes('owner-products/MI402439'));
  assert.deepEqual(ORDERED_SURFACES['wet-wall'].tile,[.75,.25]);assert.deepEqual(ORDERED_SURFACES['terrace-floor'].tile,[.15,.6]);
 }finally{resources.forEach(r=>r.dispose());globalThis.Image=previousImage;globalThis.document=previousDocument;}
});

test('catalogue fixture sizes change toward the room without moving back-wall plumbing anchors or claiming unknown axes',()=>{
 for(const [id,pdf,oldDepth] of [['bath-toilet',[1032,378.5],.54],['ensuite-toilet',[630,650.6],.54],['guest-toilet',[840,328],.54],['guest-basin',[876.6,382],.35]]){
  const f=getFurniture(id),old=point(...pdf);near(f.position[0]-Math.sin(f.rotation)*f.d/2,old[0]-Math.sin(f.rotation)*oldDepth/2);near(f.position[1]-Math.cos(f.rotation)*f.d/2,old[1]-Math.cos(f.rotation)*oldDepth/2);
  const measurements=Object.fromEntries(furnitureMeasurements(f).map(r=>[r.key,r]));assert.equal(measurements.depth.origin,'catalogue');assert.equal(measurements.height.approximate,true);
  if(id==='guest-basin'){assert.equal(measurements.width.cm,33);assert.equal(measurements.depth.cm,29);assert.equal(measurements.width.approximate,false);}else{assert.equal(measurements.depth.cm,52);assert.equal(measurements.width.approximate,true);}
 }
});

test('Wrangler drawers open independently, Gabriel doors remain hinged, legacy state migrates and Close all clears both',()=>{
 const ids=furnitureParts(getFurniture('ensuite-vanity')).map(p=>p.id);assert.deepEqual(ids,['ensuite-vanity:drawer-0','ensuite-vanity:drawer-1']);assert.deepEqual(furnitureParts(getFurniture('bath-vanity')).map(p=>p.key),['left','right']);
 const migrated=normalizeHomeSettings({schema:2,openParts:['ensuite-vanity:left','ensuite-vanity:right','wardrobe-a:left'],rooms:{master:{wood:'dark'}},showWater:false});assert.deepEqual(migrated.openParts,[...ids,'wardrobe-a:left']);assert.equal(migrated.rooms.master.wood,'dark');assert.equal(migrated.showWater,false);
 const closed=createHomeScene(normalizeHomeSettings()),opened=createHomeScene(normalizeHomeSettings({openParts:[ids[0]]}));
 try{
  const targets=new Map(closed.motions.map(m=>[m.id,m.target]));for(const m of opened.motions){if(m.id===ids[0]){assert.equal(m.axis,'position');assert.equal(m.property,'z');assert(m.target>0);}else assert.equal(m.target,targets.get(m.id),m.id);}
  for(const id of ['bath-vanity','ensuite-vanity']){const root=closed.furnitureGroups.get(id);assert.equal(root.userData.wallHung,true);root.updateWorldMatrix(true,true);const carcass=parts(root,'vanity-carcass');assert(carcass.length>=4);for(const mesh of carcass){const b=new THREE.Box3().setFromObject(mesh);assert(b.min.y>=.379,'suspended cabinet has no floor-standing panels');}}
  const result=closeAllStudioOpenings({getItem:()=>null,setItem(){}},{home:migrated});assert.deepEqual(result.home.openParts,[]);
 }finally{closed.dispose();opened.dispose();}
});

test('the actual bath and basins have open recessed bowls, Sky uses a slim lid and all tiled walls use the catalogue image',()=>{
 const scene=createHomeScene(normalizeHomeSettings(),{mode:'walk'});scene.group.updateMatrixWorld(true);
 try{
  for(const [id,depth] of [['guest-basin',.115],['bath-vanity',.14],['ensuite-vanity',.14],['bath-tub',.43]]){
   const root=scene.furnitureGroups.get(id),f=getFurniture(id),meshes=[];root.traverse(o=>{if(o.isMesh&&o.userData.part?.startsWith('ceramic-'))meshes.push(o);});const origin=root.localToWorld(new THREE.Vector3(.045,2,.06)),hits=new THREE.Raycaster(origin,new THREE.Vector3(0,-1,0)).intersectObjects(meshes);assert(hits.length,id);near(hits[0].point.y,f.h-depth,2e-5);assert.equal(hits[0].object.userData.part,'ceramic-bowl-floor');
  }
  for(const id of ['bath-toilet','ensuite-toilet','guest-toilet']){const root=scene.furnitureGroups.get(id),lid=parts(root,'sky-slim-lid');assert.equal(lid.length,1);assert.equal(lid[0].userData.depth,.52);assert.equal(parts(root,'sky-seat-gap').length,1);}
  let cladding=0;scene.group.traverse(o=>{if(o.userData.wallTile){cladding++;assert.equal(o.material.userData.productId,'wet-wall');assert(o.material.userData.photoSource.includes('mona-grey-decor'));near(o.material.map.repeat.x,1/.75);near(o.material.map.repeat.y,1/.25);}});assert(cladding>10);
 }finally{scene.dispose();}
});

test('both kitchen scenes use the same exact-SKU pull-out tap silhouette and keep the Casablanca sink',()=>{
 const home=createHomeScene(normalizeHomeSettings()),kitchen=createKitchen({...DEFAULTS,hardware:'black'});
 try{
  const collect=root=>{const found=new Map();root.traverse(o=>{if(o.isMesh&&o.userData.productId==='kitchen-tap')found.set(o.userData.part,o);});return found;},a=collect(home.group),b=collect(kitchen.group);assert.deepEqual([...a.keys()],[...b.keys()]);assert(a.has('tap-side-lever')&&a.has('tap-pullout-head')&&a.has('tap-gooseneck'));
  for(const [name,o] of a){assert.equal(o.userData.sku,'VR001221');assert.equal(o.userData.cataloguePage,39);assert.equal(o.userData.dimensionsInferred,true);assert.deepEqual(Array.from(o.geometry.attributes.position.array),Array.from(b.get(name).geometry.attributes.position.array));assert.equal(o.material.color.getHex(),b.get(name).material.color.getHex());}
  for(const root of [home.group,kitchen.group]){let sink=false;root.traverse(o=>{if(o.userData.productId==='kitchen-sink'&&o.userData.finishCode==='98')sink=true;});assert(sink);}
 }finally{home.dispose();kitchen.dispose();}
});
