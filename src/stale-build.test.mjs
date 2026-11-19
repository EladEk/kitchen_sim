import test from 'node:test';
import assert from 'node:assert/strict';
import {isChunkLoadError,reloadForStaleBuild,reloadingImport,resetStaleBuildState,STALE_BUILD_RELOAD_KEY} from './stale-build.mjs';
import {createTourRenderer} from '../public-view/tour-renderer.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v))};};
const stale=()=>new TypeError('Failed to fetch dynamically imported module: https://kitchen-sim.vercel.app/assets/webgpu-runtime-Ba4vsCcV.js');

test('chunk-load failures are recognised, including wrapped causes; ordinary errors are not',()=>{
 assert(isChunkLoadError(stale()));assert(isChunkLoadError(Error('Forced WebGPU initialization failed',{cause:stale()})));
 assert(isChunkLoadError(new TypeError('error loading dynamically imported module')));assert(isChunkLoadError(Error('Unable to preload CSS for /assets/x.css')));
 assert(!isChunkLoadError(Error('GPU device was lost')));assert(!isChunkLoadError(null));
});

test('a stale build reloads exactly once per build, then reports the real error',async()=>{
 resetStaleBuildState();const storage=memory(),events=[];let reloads=0;const location={reload:()=>reloads++};
 assert.equal(reloadForStaleBuild(stale(),{build:'/assets/index-A.js',storage,location,document:null,delay:0,onDiagnostic:e=>events.push(e)}),true);
 await new Promise(r=>setTimeout(r,5));assert.equal(reloads,1);assert.equal(storage.getItem(STALE_BUILD_RELOAD_KEY),'/assets/index-A.js');
 resetStaleBuildState();// the reloaded page is still the same build: no loop
 assert.equal(reloadForStaleBuild(stale(),{build:'/assets/index-A.js',storage,location,document:null,delay:0,onDiagnostic:e=>events.push(e)}),false);
 resetStaleBuildState();// a later deployment may reload again
 assert.equal(reloadForStaleBuild(stale(),{build:'/assets/index-B.js',storage,location,document:null,delay:0}),true);await new Promise(r=>setTimeout(r,5));assert.equal(reloads,2);
 assert.deepEqual(events.map(e=>[e.event,e.details.reloaded]),[['stale-build-reload',true],['stale-build-reload',false]]);
 resetStaleBuildState();assert.equal(reloadForStaleBuild(Error('other'),{build:'/c',storage,location,document:null}),false);
});

test('lazy imports wait for the reload instead of failing; other errors still reject',async()=>{
 resetStaleBuildState();const storage=memory(),location={reload(){}};
 const pending=reloadingImport(()=>Promise.reject(stale()),{build:'/x',storage,location,document:null,delay:0})();
 assert.equal(await Promise.race([pending.then(()=>'resolved',()=>'rejected'),new Promise(r=>setTimeout(()=>r('waiting'),20))]),'waiting');
 await assert.rejects(reloadingImport(()=>Promise.reject(Error('boom')),{build:'/y',storage,location,document:null})(),/boom/);
});

test('a missing WebGPU chunk is not a WebGPU failure: no fallback, no failure event',async()=>{
 const events=[],nav={gpu:{}},loadGPU=()=>Promise.reject(stale());
 for(const mode of ['webgpu','auto']){
  events.length=0;
  await assert.rejects(createTourRenderer({mode,navigator:nav,secure:true,loadGPU,onStaleBuild:()=>true,createGL:()=>{throw Error('must not fall back');},onDiagnostic:e=>events.push(e.event)}),e=>e.code==='STALE_BUILD_RELOAD');
  assert(!events.includes('webgpu-initialization-failed')&&!events.includes('webgl-fallback'),mode);
 }
 // If the reload already happened for this build, auto mode still falls back as before.
 const session=await createTourRenderer({mode:'auto',navigator:nav,secure:true,loadGPU,onStaleBuild:()=>false,createGL:()=>({dispose(){},info:{}}),onDiagnostic:e=>events.push(e.event)});
 assert.equal(session.backend,'webgl2');
});

test('the reloaded page reads why it was reloaded exactly once',async()=>{
 resetStaleBuildState();const {takeStaleBuildNote}=await import('./stale-build.mjs'),storage={...memory(),removeItem(k){this._r=k;}};const m=new Map();storage.getItem=k=>m.get(k)??null;storage.setItem=(k,v)=>m.set(k,v);storage.removeItem=k=>m.delete(k);
 reloadForStaleBuild(stale(),{build:'/assets/index-A.js',storage,location:{reload(){}},document:null,delay:0});
 const note=takeStaleBuildNote(storage);assert.equal(note.build,'/assets/index-A.js');assert.match(note.module,/webgpu-runtime/);assert.equal(takeStaleBuildNote(storage),null);
});
