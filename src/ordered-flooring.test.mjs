import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {ORDERED_FLOORS,applyOrderedFloors} from './ordered-flooring.mjs';
import {productById} from './home-products.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {orderedFloorPhotoData} from './ordered-floor-photo.mjs';
import {FLOOR_PHOTO,OWNER_PRODUCT_REFERENCES} from './owner-product-references.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

test('ordered floors load the actual owner tile RGB rather than the generic atlas, while preserving each scheduled physical size',async()=>{
 const previousImage=globalThis.Image,previousDocument=globalThis.document,images=[],rects=[],pixels=new Uint8ClampedArray(FLOOR_PHOTO.size**2*4);
 for(let i=0;i<pixels.length;i+=4)pixels.set(i%8===0?[169,157,143,255]:[218,208,194,255],i);
 globalThis.Image=class{set src(value){images.push(value);queueMicrotask(()=>this.onload());}};
 globalThis.document={createElement:()=>{const canvas={};canvas.getContext=()=>({drawImage(...args){rects.push(args.slice(1));},translate(){},rotate(){},getImageData:()=>({data:pixels.subarray(0,canvas.width*canvas.height*4)})});return canvas;}};
 const resources=[],surface=createSurfacePalette(resources);
 try{
  for(const [id,p] of Object.entries(ORDERED_FLOORS)){
   const material=surface(p.kind,'#ff0000',{productId:id}),order=productById(id);
   assert.equal(material.userData.sku,order.sku);assert.deepEqual(material.userData.tile,order.dimensions);
   assert.equal(material.color.getHexString(),p.photo?'ffffff':p.color.slice(1));assert.equal(material.roughness,p.roughness);assert.equal(material.userData.manufacturerScan,false);
   assert.equal(material.userData.textureBasis,p.textureBasis);assert.strictEqual(surface(p.kind,'#ff0000',{productId:id}),material);
   for(const map of [material.map,material.bumpMap,material.roughnessMap]){assert.equal(map.repeat.x,1/order.dimensions[0]);assert.equal(map.repeat.y,1/order.dimensions[1]);}
  }
  const data=await orderedFloorPhotoData('dry-floor');await Promise.resolve();
  const expectedImages=[...new Set(Object.values(ORDERED_FLOORS).map(p=>p.photo.runtimeImage||p.photo.image))];assert.deepEqual(images,expectedImages);assert.deepEqual(rects[0],[...FLOOR_PHOTO.runtimeSample,0,0,FLOOR_PHOTO.size,FLOOR_PHOTO.size]);assert.deepEqual(data.color,new Uint8Array(pixels),'actual coloured pixels must not be converted to generic grey/white');
  const floor=surface('porcelain','#ff0000',{productId:'dry-floor'});assert.strictEqual(floor.map.image.data,data.color);assert.equal(floor.map.image.width,1024);assert.equal(floor.map.repeat.x,1);assert.equal(floor.map.repeat.y,1);assert.equal(floor.bumpScale,0);assert.equal(floor.map.colorSpace,THREE.SRGBColorSpace);
  const wet=surface('cement','#a4a6a3',{productId:'wet-floor'}),shower=surface('cement','#a4a6a3',{productId:'shower-floor'});assert.notStrictEqual(wet.map,shower.map);assert(shower.roughness>wet.roughness);
 }finally{resources.forEach(r=>r.dispose());globalThis.Image=previousImage;globalThis.document=previousDocument;}
});

test('source tile and sink photos are byte-identical owner attachments and the tile sample excludes showroom labels',()=>{
 for(const r of Object.values(OWNER_PRODUCT_REFERENCES)){const bytes=readFileSync(new URL(`../public${r.image}`,import.meta.url));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);}
 const [x,y,w,h]=FLOOR_PHOTO.sample;assert(x>160&&y>=0&&x+w<1152);assert(y+h<1040,'do not sample the large showroom label');assert.equal(w,h);
});

test('the rendered home and detailed kitchen share MI402439 rather than merely labelling a generic material',()=>{
 const home=createHomeScene(normalizeHomeSettings()),kitchen=createKitchen(DEFAULTS),floors=[];
 try{
  home.group.traverse(o=>{if(o.userData.floorFinish||o.userData.productId==='shower-floor')floors.push(o);});
  for(const floor of floors){const p=productById(floor.userData.productId);assert(p);assert.equal(floor.material.userData.sku,p.sku);assert.deepEqual(floor.material.userData.tile,floor.userData.tile);}
  const inside=floors.find(o=>o.userData.roomId==='kitchen'),terraces=floors.filter(o=>o.userData.productId==='terrace-floor');let detailed;
  kitchen.group.traverse(o=>{if(o.userData.productId==='dry-floor')detailed=o;});
  assert.equal(detailed.material.userData.sku,'MI402439');assert.deepEqual(detailed.material.userData,inside.material.userData);assert.equal(detailed.material.color.getHex(),inside.material.color.getHex());assert.deepEqual(detailed.material.map.image.data,inside.material.map.image.data);
  assert.equal(terraces.length,2);assert.strictEqual(terraces[0].material,terraces[1].material,'existing and extended paving share the ordered material');
 }finally{home.dispose();kitchen.dispose();}
});

test('applying the order restores only room floors and preserves furniture, services and independent openings',()=>{
 const settings=normalizeHomeSettings({schema:2,rooms:{living:{floor:'oak',wall:'sage',wood:'dark'},bathroom:{floor:'warm'}},openDoors:['entry'],openParts:['wardrobe-a:left'],showWater:false}),next=applyOrderedFloors(settings);
 assert.equal(settings.rooms.living.floor,'oak');assert.equal(next.rooms.living.floor,'ordered-white');assert.equal(next.rooms.bathroom.floor,'ordered-wet');assert.equal(next.rooms.laundry.floor,'ordered-wet');assert.equal(next.rooms.terrace.floor,'ordered-terrace');
 assert.equal(next.rooms.living.wall,settings.rooms.living.wall);assert.equal(next.rooms.living.wood,'dark');assert.strictEqual(next.openDoors,settings.openDoors);assert.strictEqual(next.openParts,settings.openParts);assert.equal(next.showWater,false);
});
