import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Scene,Vector2} from 'three';
import {capture4KImage} from './photo-capture.mjs';
for(const gpu of [false,true])for(const fails of [false,true])test(`4K accumulation restores state (WebGPU=${gpu}, canvas failure=${fails})`,async()=>{
 const camera=new PerspectiveCamera(60,1.3),scene=new Scene(),offsets=[];let time=0,renders=0,copies=0;
 const original=camera.setViewOffset.bind(camera);camera.setViewOffset=(...args)=>{offsets.push(args.slice(2,4));original(...args);};
 const element={toBlob:done=>done(new Blob(['fallback']))},renderer={isWebGPURenderer:gpu,domElement:element,getSize:v=>v.set(800,600),getPixelRatio:()=>2,getRenderTarget:()=>null,setRenderTarget(){},setPixelRatio(){},setSize(){},render(){renders++;}};
 const blob=await capture4KImage(renderer,scene,camera,{pipelineFactory:()=>({render(){renders++;},resize(){},dispose(){}}),clock:()=>time,yieldFrame:async()=>{time+=100;},createCanvas:()=>({getContext:()=>({drawImage(){copies++;if(fails)throw Error('Canvas interop unsupported');}}),toBlob:done=>done(new Blob(['accumulated']))})});
 assert.equal(await blob.text(),fails?'fallback':'accumulated');assert(offsets.length>=4);assert.notDeepEqual(offsets[0],offsets[1]);assert(copies>=1);if(gpu)assert(renders<=18);assert.equal(camera.aspect,1.3);assert(!camera.view?.enabled);
});
