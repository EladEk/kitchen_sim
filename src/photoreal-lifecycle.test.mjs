import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installPhotorealRenderer} from './photoreal-renderer.mjs';
class Element extends THREE.EventDispatcher{
 constructor(){super();this.children=[];this.style={};this.dataset={};this.attributes={};this.clientWidth=800;this.clientHeight=600;}
 append(...v){this.children.push(...v);v.forEach(o=>o.parent=this);}
 closest(){return null;}
 setAttribute(k,v){this.attributes[k]=v;}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(v=>v!==this);}
 click(){this.dispatchEvent({type:'click'});}
 toDataURL(){return 'data:image/png;base64,test';}
}
function fixture(factory=null){
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()};
 const host=new Element(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),xr=new THREE.EventDispatcher();xr.isPresenting=false;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 const renderer={xr,domElement:new Element(),toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1};
 const counts={samples:0,disposed:0,prepared:0};
 const make=()=>({backend:'WebGL2',renderer:{domElement:new Element(),setPixelRatio(){},setSize(){},dispose(){counts.disposed++;}},tracer:{updateCamera(){},async setSceneAsync(){counts.prepared++;},renderSample(){counts.samples++;},dispose(){counts.disposed++;}}});
 const photo=installPhotorealRenderer({renderer,scene,camera,host,backendFactory:factory||(()=>Promise.resolve(make()))});
 return {photo,host,scene,camera,xr,counts,make,button:host.children[0].children[0],finish(){photo.dispose();globalThis.document=previous;scene.children[0].geometry.dispose();scene.children[0].material.dispose();}};
}
const flush=async()=>{await new Promise(resolve=>setImmediate(resolve));};
test('progressive mode waits for stillness, hides stale camera images, and releases tracing during native WebXR',async()=>{
 const f=fixture();try{
  const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);await flush();
  f.photo.render(now+4500);f.photo.render(now+4600);assert(f.counts.samples>0);assert(f.photo.capture()?.startsWith('data:image/png'));
  f.camera.position.x=1;f.photo.render(now+4700);assert.equal(f.photo.capture(),null,'camera movement cannot show a stale traced image');
  f.xr.isPresenting=true;f.xr.dispatchEvent({type:'sessionstart'});assert.equal(f.photo.capture(),null);assert.equal(f.counts.disposed,2);const samples=f.counts.samples;f.photo.render(now+9000);assert.equal(f.counts.samples,samples,'no path tracing inside an immersive session');
  f.xr.isPresenting=false;f.xr.dispatchEvent({type:'sessionend'});f.photo.render(now+11000);await flush();f.photo.render(now+12500);f.photo.render(now+12600);assert(f.counts.samples>samples,'desktop photo rendering can resume after headset exit');
 }finally{f.finish();}
});
test('leaving photo mode during asynchronous initialization disposes the stale renderer without attaching a canvas',async()=>{
 let resolve;const f=fixture(()=>new Promise(r=>resolve=r));try{
  const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);await flush();assert(resolve);f.button.click();resolve(f.make());await flush();assert.equal(f.counts.disposed,2);assert.equal(f.host.children.length,1);assert.equal(f.photo.capture(),null);assert.equal(f.button.attributes['aria-pressed'],'false');
 }finally{f.finish();}
});
test('photo preparation keeps a visible loader until the first image exists, then retains a non-blocking render indicator',async()=>{
 const f=fixture();try{
  const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);
  assert(f.host.children.some(n=>n.attributes?.role==='status'&&n.attributes['aria-busy']==='true'));
  await flush();assert(f.host.children.some(n=>n.attributes?.role==='status'),'compilation ending must not hide the loader before any sample');
  f.photo.render(now+4500);assert(f.host.children.some(n=>n.attributes?.role==='status'));
  f.photo.render(now+4600);assert(!f.host.children.some(n=>n.attributes?.role==='status'));assert(f.photo.capture());assert.equal(f.host.children[0].attributes['aria-busy'],'true');
  f.button.click();assert.equal(f.host.children[0].attributes['aria-busy'],'false');assert.equal(f.host.children.length,1);
 }finally{f.finish();}
});
test('a failed photo backend removes the preparation overlay and leaves the live tour available',async()=>{
 const f=fixture(async()=>{throw Error('unsupported');});try{
  const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);await flush();assert.equal(f.button.attributes['aria-pressed'],'false');assert.equal(f.host.children.length,1);assert.equal(f.host.children[0].attributes['aria-busy'],'false');
 }finally{f.finish();}
});
test('sustained camera movement and background suspension retire photo buffers before rebuilding',async()=>{
 const f=fixture();try{
  const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);await flush();f.photo.render(now+4500);f.photo.render(now+4600);assert(f.photo.capture());
  for(let i=0;i<12;i++){f.camera.position.x+=.1;f.photo.render(now+4700+i*50);}
  assert.equal(f.photo.capture(),null);assert.equal(f.counts.disposed,2);assert.equal(f.button.attributes['aria-pressed'],'true');assert.equal(f.host.children.length,1);
  f.photo.render(now+9000);await flush();f.photo.render(now+10500);f.photo.render(now+10600);assert(f.photo.capture());
  f.photo.suspend();assert.equal(f.counts.disposed,4);assert.equal(f.host.children.length,1);assert.equal(f.photo.capture(),null);
 }finally{f.finish();}
});

test('walking never performs a whole-scene photo signature scan',()=>{
 const f=fixture();try{let traversals=0;const original=f.scene.traverseVisible.bind(f.scene);f.scene.traverseVisible=fn=>{traversals++;return original(fn);};f.button.click();const now=performance.now();for(let i=0;i<60;i++){f.camera.position.x+=.05;f.photo.render(now+i*50);}assert.equal(traversals,0,'all expensive snapshot work must wait until the camera stops');}finally{f.finish();}
});
