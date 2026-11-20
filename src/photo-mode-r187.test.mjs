import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {installPhotorealRenderer,PHOTO_SAMPLES} from './photoreal-renderer.mjs';
class Element extends THREE.EventDispatcher{
 constructor(tag){super();this.tag=tag;this.children=[];this.style={};this.dataset={};this.attributes={};this.clientWidth=800;this.clientHeight=600;}
 append(...v){this.children.push(...v);v.forEach(o=>o.parent=this);}closest(){return null;}setAttribute(k,v){this.attributes[k]=v;}remove(){}
 click(){this.clicked=(this.clicked||0)+1;this.dispatchEvent({type:'click'});}toDataURL(){return 'data:image/png;base64,test';}
}
function fixture({mobile=false}={}){
 const previous=globalThis.document,made=[];globalThis.document={createElement:tag=>{const e=new Element(tag);made.push(e);return e;}};
 const host=new Element(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),xr=new THREE.EventDispatcher();xr.isPresenting=false;scene.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial()));
 const renderer={xr,domElement:new Element(),toneMapping:THREE.NeutralToneMapping,toneMappingExposure:1};
 const tracer={samples:0,updateCamera(){this.samples=0;},async setSceneAsync(){},renderSample(){this.samples++;},dispose(){}};
 const photo=installPhotorealRenderer({renderer,scene,camera,host,mobile:()=>mobile,backendFactory:()=>Promise.resolve({backend:'WebGL2',renderer:{domElement:new Element('canvas'),setPixelRatio(){},setSize(){},dispose(){}},tracer})});
 const controls=host.children[0];
 return {photo,tracer,made,button:controls.children[0],label:controls.children[1],download:controls.children[2],finish(){photo.dispose();globalThis.document=previous;}};
}
const flush=()=>new Promise(r=>setImmediate(r));
async function start(f){const now=performance.now();f.button.click();f.photo.render(now+1500);f.photo.render(now+3000);for(let i=0;i<5;i++)await flush();return now+4500;}
test('photo mode reports Hebrew sample progress and stops at the desktop cap',async()=>{
 const f=fixture();try{let t=await start(f);
  f.photo.render(t);f.photo.render(t+=1300);assert.match(f.label.textContent,/איכות צילום · דגימה \d+ מתוך 512/);assert.equal(f.download.style.display,'');
  f.tracer.samples=PHOTO_SAMPLES.desktop-1;f.photo.render(t+=1300);assert(f.photo.finished);assert.match(f.label.textContent,/התמונה מוכנה \(512 דגימות\)/);
  const n=f.tracer.samples;assert.equal(f.photo.render(t+=1300),false);assert.equal(f.tracer.samples,n,'no samples after the cap');
 }finally{f.finish();}
});
test('download saves a PNG from the photo canvas in the same task as a sample',async()=>{
 const f=fixture();try{let t=await start(f);f.photo.render(t);f.photo.render(t+=100);
  f.download.click();f.photo.render(t+=100);const a=f.made.find(e=>e.tag==='a');assert(a);assert.match(a.download,/^homestudio-photo-.*\.png$/);assert.match(a.href,/^data:image\/png/);assert.equal(a.clicked,1);
 }finally{f.finish();}
});
test('phones may use photo mode with a warning and a far lower sample cap',async()=>{
 assert(PHOTO_SAMPLES.mobile<=128&&PHOTO_SAMPLES.mobile<PHOTO_SAMPLES.desktop);
 const f=fixture({mobile:true});try{let t=await start(f);f.photo.render(t);f.photo.render(t+=1300);assert.match(f.label.textContent,/בטלפון החישוב איטי ומוגבל/);assert.match(f.label.textContent,/מתוך 96/);
 }finally{f.finish();}
});
