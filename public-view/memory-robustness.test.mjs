import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {compactRenderAttributes} from './compact-attributes.mjs';
import {createSurfaceDetails,surfacePixels,surfaceCacheStats,clearSurfacePixelCache,loadSurfaceTexture} from './surface-detail.mjs';
import {createArchitecturalPresentation} from './presentation.mjs';
import {bindRuntimeLifecycle} from './runtime-lifecycle.mjs';

test('packed shading attributes roundtrip through ObjectLoader while positions and tiled UVs remain exact',async()=>{
 const g=new THREE.BufferGeometry().copy(new THREE.BoxGeometry()),positions=g.attributes.position.array.slice(),normals=g.attributes.normal.array.slice(),uvs=g.attributes.uv.array.slice(),before=Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0);
 compactRenderAttributes(g);assert(g.attributes.normal.array instanceof Int16Array);assert(g.attributes.uv.array instanceof Uint16Array);assert.deepEqual(g.attributes.position.array,positions);
 for(let i=0;i<normals.length;i++)assert(Math.abs(g.attributes.normal.getComponent(Math.floor(i/3),i%3)-normals[i])<=1/32767);
 for(let i=0;i<uvs.length;i++)assert(Math.abs(g.attributes.uv.getComponent(Math.floor(i/2),i%2)-uvs[i])<=1/65535);
 assert(Object.values(g.attributes).reduce((n,a)=>n+a.array.byteLength,0)<before);
 const root=new THREE.Mesh(g,new THREE.MeshStandardMaterial()),restored=await new THREE.ObjectLoader().parseAsync(root.toJSON());assert.equal(restored.geometry.attributes.normal.normalized,true);assert(restored.geometry.attributes.uv.array instanceof Uint16Array);
 const tiled=new THREE.PlaneGeometry();tiled.attributes.uv.setX(0,24);compactRenderAttributes(tiled);assert(tiled.attributes.uv.array instanceof Float32Array);assert.equal(tiled.attributes.uv.getX(0),24);
 g.dispose();root.material.dispose();restored.geometry.dispose();restored.material.dispose();tiled.dispose();
});
test('surface cache is byte bounded and texture ownership is retired exactly once',()=>{
 clearSurfacePixelCache();for(const kind of ['limestone','porcelain','cement','plaster','paint','wood','fabric','paving','asphalt','grass'])surfacePixels(kind,512);
 const stats=surfaceCacheStats();assert(stats.bytes<=8*1024*1024);assert(stats.entries<10);assert.throws(()=>surfacePixels('invalid',256),RangeError);assert.throws(()=>surfacePixels('grass',4096),RangeError);
 const details=createSurfaceDetails({mobile:true}),maps=details.get('grass');assert.equal(maps.height,maps.roughness);assert.equal(maps.detail.format,THREE.RGFormat);assert.equal(maps.color.image.data.length,256*256*4);assert.equal(maps.detail.image.data.length,256*256*2);
 const textures=details.textures;let disposed=0;textures.forEach(t=>t.addEventListener('dispose',()=>disposed++));details.dispose();details.dispose();assert.equal(disposed,3);assert.equal(details.textures.length,0);assert(textures.every(t=>t.source.data===null));clearSurfacePixelCache();assert.equal(surfaceCacheStats().bytes,0);
});
test('surface image abort/deadline settles without waiting for the loader and retires late completions',async()=>{
 let complete,tick;const pending=new Set(),signal=new AbortController(),loader={load(url,done){complete=done;}};
 const promise=loadSurfaceTexture('example',{signal:signal.signal,pending,loader,schedule:fn=>(tick=fn,1),cancel(){}});assert.equal(pending.size,1);signal.abort();assert.equal(await promise,null);assert.equal(pending.size,0);
 const texture=new THREE.Texture();let n=0;texture.addEventListener('dispose',()=>n++);complete(texture);assert.equal(n,1);assert.equal(texture.source.data,null);
 const deadline=loadSurfaceTexture('example',{loader,schedule:fn=>(tick=fn,2),cancel(){}});tick();assert.equal(await deadline,null);
});
test('postprocessing never retains more than one pipeline across resize, suspend, XR and failure',()=>{
 let live=0,max=0,direct=0,fail=false;const renderer={xr:{isPresenting:false},getPixelRatio:()=>2,setRenderTarget(){},render(){direct++;}},factory=()=>{live++;max=Math.max(max,live);return {resize(w,h){assert(w*h<=800000+2000);},render(){if(fail)throw Error('GPU exhausted');},dispose(){live--;}};};
 const presentation=createArchitecturalPresentation(renderer,{}, {},{mobile:true,pipelineFactory:factory});presentation.resize(800,1200);assert.equal(live,0,'lazy allocation');let now=10;
 for(let i=0;i<60;i++){presentation.render(now+=16);assert.equal(live,1);presentation.suspend();assert.equal(live,0);renderer.xr.isPresenting=true;presentation.render(now+=16);assert.equal(live,0);renderer.xr.isPresenting=false;}
 presentation.render(now+=16);fail=true;presentation.render(now+=16);assert.equal(live,0);presentation.render(now+=16);assert.equal(live,0);assert(direct>0);assert.equal(max,1);presentation.dispose();presentation.dispose();assert.equal(presentation.stats.created,presentation.stats.released);
});
class Surface extends EventTarget{constructor(){super();this.handlers=new Set();this.hidden=false;}addEventListener(type,fn,...rest){super.addEventListener(type,fn,...rest);this.handlers.add(fn);}removeEventListener(type,fn,...rest){super.removeEventListener(type,fn,...rest);this.handlers.delete(fn);}fire(type){const e=new Event(type,{cancelable:true});this.dispatchEvent(e);return e;}}
test('background and BFCache pause one render loop; context recovery is bounded and teardown removes listeners/timers',()=>{
 const win=new Surface(),doc=new Surface(),canvas=new Surface();let loop=null,failures=0,suspends=0,restored=0,now=0;const timers=new Map();let timer=0;
 const lifecycle=bindRuntimeLifecycle({renderer:{domElement:canvas,setAnimationLoop(fn){loop=fn;}},frame(){},win,doc,clock:()=>now,onSuspend(){suspends++;},onRestored(){restored++;},onFailure(){failures++;},schedule:fn=>{timers.set(++timer,fn);return timer;},cancel:id=>timers.delete(id)});
 lifecycle.resume();assert(loop);for(let i=0;i<30;i++){doc.hidden=true;doc.fire('visibilitychange');assert.equal(loop,null);doc.hidden=false;doc.fire('visibilitychange');assert(loop);}
 win.fire('pagehide');assert.equal(loop,null);win.fire('pageshow');assert(loop);
 for(let i=0;i<2;i++){assert(canvas.fire('webglcontextlost').defaultPrevented);assert.equal(loop,null);assert.equal(timers.size,1);canvas.fire('webglcontextrestored');assert(loop);assert.equal(timers.size,0);now+=1000;}
 canvas.fire('webglcontextlost');assert.equal(failures,1);canvas.fire('webglcontextrestored');assert.equal(loop,null);assert.equal(restored,2);assert(suspends>30);lifecycle.dispose();lifecycle.dispose();assert.equal(timers.size,0);assert.equal(win.handlers.size+doc.handlers.size+canvas.handlers.size,0);
});

test('an invalid postprocess draw drops the pipeline and redraws the actual scene directly in the same frame',()=>{
 let direct=0,released=0;const renderer={xr:{isPresenting:false},getPixelRatio:()=>1,setRenderTarget(){},render(){direct++;},getContext:()=>({getError:()=>1282})},presentation=createArchitecturalPresentation(renderer,{}, {},{pipelineFactory:()=>({resize(){},render(){},dispose(){released++;}})});presentation.render(16);assert.equal(released,1);assert.equal(direct,1);presentation.render(32);assert.equal(direct,2);presentation.dispose();assert.equal(released,1);
});
