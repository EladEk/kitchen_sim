import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdaptiveQuality,isLowEndGpu,mobilePixelRatio,gpuInfoOf} from './adaptive-quality.mjs';
import {nextDeviceLossAction,readWebGPUUnstable,markWebGPUUnstable,clearWebGPUUnstable,LOSS_WINDOW_MS,UNSTABLE_TTL_MS,RECOVERY_MESSAGES,WEBGPU_UNSTABLE_KEY} from './graphics-recovery.mjs';
const memory=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};

test('DPR cap: phones never render at their 3x+ screen density',()=>{
 assert.equal(mobilePixelRatio({mobile:true,pixelRatio:3.25}),1.25);
 assert.equal(mobilePixelRatio({mobile:true,lowEnd:true,pixelRatio:3.25}),1);
 assert.equal(mobilePixelRatio({mobile:false,pixelRatio:2}),1.8,'desktop cap unchanged');
 assert.equal(mobilePixelRatio({mobile:true,pixelRatio:1}),1);
 const q=createAdaptiveQuality({mobile:true,lowEnd:true,pixelRatio:3.25,mode:'quality'});
 assert(q.ratioForSize(394,734)<=1);assert(394*734*q.ratioForSize(394,734)**2<=700000*1.001);
});

test('low-end GPU detection (the reported Mali phone) and tier selection',()=>{
 assert.equal(isLowEndGpu({mobile:true,vendor:'arm',architecture:'gen-5',deviceMemory:8}),true);
 assert.equal(isLowEndGpu({mobile:true,vendor:'qualcomm',architecture:'adreno-7xx'}),true);
 assert.equal(isLowEndGpu({mobile:true,vendor:'',deviceMemory:3}),true);
 assert.equal(isLowEndGpu({mobile:false,vendor:'arm'}),false,'ARM laptops/desktops keep full quality');
 assert.equal(isLowEndGpu({mobile:true,vendor:'nvidia',deviceMemory:8}),false);
 assert.deepEqual(gpuInfoOf({backend:{device:{adapterInfo:{vendor:'arm',architecture:'gen-5'}}}}),{vendor:'arm',architecture:'gen-5',description:''});
 assert.deepEqual(gpuInfoOf(null),{vendor:'',architecture:'',description:''});
 const phone=createAdaptiveQuality({mobile:true,lowEnd:true,pixelRatio:3.25,mode:'quality'}).profile;
 assert.equal(phone.tier,1);assert.equal(phone.shadowSize,1024);assert.equal(phone.effects,false);assert.equal(phone.ratio,1);
 const desktop=createAdaptiveQuality({mobile:false,pixelRatio:2,mode:'quality'}).profile;
 assert.deepEqual([desktop.tier,desktop.shadowSize,desktop.effects,desktop.ratio],[0,4096,true,1.8],'desktop quality unchanged');
 const strongPhone=createAdaptiveQuality({mobile:true,pixelRatio:3,mode:'quality'}).profile;
 assert.deepEqual([strongPhone.tier,strongPhone.shadowSize,strongPhone.effects],[0,2048,true]);
});

test('mobile "quality" mode still steps down when frames take far too long',()=>{
 const q=createAdaptiveQuality({mobile:true,pixelRatio:3,mode:'quality'});let t=1000,changed=false;
 q.sample(t);for(let i=0;i<200&&!changed;i++){t+=120;changed=q.sample(t)||changed;}
 assert(changed,'guard reacts to ~8 fps');assert(q.profile.scale<1);assert(q.profile.tier>=1);
 const d=createAdaptiveQuality({mobile:false,pixelRatio:2,mode:'quality'});t=1000;d.sample(t);for(let i=0;i<200;i++){t+=120;assert.equal(d.sample(t),false);}
 assert.equal(d.profile.tier,0,'desktop quality is never auto-lowered');
});

test('device-lost state machine: retry WebGPU once, then fall back to WebGL2',()=>{
 let s=nextDeviceLossAction([],{now:1000});assert.equal(s.action,'retry-webgpu');
 s=nextDeviceLossAction(s.losses,{now:1000+60000});assert.equal(s.action,'fallback-webgl2');
 const late=nextDeviceLossAction([1000],{now:1000+LOSS_WINDOW_MS+1});assert.equal(late.action,'retry-webgpu','an old loss is forgotten');assert.equal(late.losses.length,1);
 assert.equal(nextDeviceLossAction([],{now:5,engine:'webgl2'}).action,'report');
 for(const k of ['retry-webgpu','fallback-webgl2'])assert.match(RECOVERY_MESSAGES[k],/[\u0590-\u05FF]/,'Hebrew recovery message');
});

test('remembered WebGL2 fallback per device: persists, expires, can be cleared',()=>{
 const st=memory();assert.equal(readWebGPUUnstable(st,0),false);
 markWebGPUUnstable(st,1000,'unknown');assert.equal(readWebGPUUnstable(st,2000),true);
 assert.equal(readWebGPUUnstable(st,1000+UNSTABLE_TTL_MS+1),false);assert.equal(st.getItem(WEBGPU_UNSTABLE_KEY),null,'expired entry removed');
 markWebGPUUnstable(st,1000);clearWebGPUUnstable(st);assert.equal(readWebGPUUnstable(st,1001),false);
 st.setItem(WEBGPU_UNSTABLE_KEY,'not json');assert.equal(readWebGPUUnstable(st,1),false);
 assert.equal(readWebGPUUnstable(null),false);
});

import {effectiveGraphicsMode,readWebGPUUnstableRecord} from './graphics-recovery.mjs';
test('a forced engine is always honoured; only the automatic mode adapts to a remembered unstable WebGPU',()=>{
 assert.equal(effectiveGraphicsMode('webgpu',true),'webgpu');
 assert.equal(effectiveGraphicsMode('webgl2',false),'webgl2');
 assert.equal(effectiveGraphicsMode('auto',true),'webgl2');
 assert.equal(effectiveGraphicsMode('auto',false),'auto');
 const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 assert.equal(readWebGPUUnstableRecord(storage),null);markWebGPUUnstable(storage,Date.now(),'destroyed');
 assert.equal(readWebGPUUnstableRecord(storage).reason,'destroyed');
});
