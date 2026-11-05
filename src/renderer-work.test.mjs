import test from 'node:test';
import assert from 'node:assert/strict';
import {createRendererWork} from './renderer-work.mjs';
import {createLoadingProgress} from './loading-progress.mjs';

test('a mobile viewport resize is coalesced until asynchronous GPU preparation finishes',async()=>{
 let height=705,textureHeight=0,resizeCalls=0,release;
 const gate=createRendererWork(()=>{textureHeight=height;resizeCalls++;});gate.resize();
 const job=gate.run(async()=>{assert.equal(textureHeight,705);await new Promise(r=>release=r);assert.equal(textureHeight,705,'the compilation framebuffer must keep its allocated size');});
 await Promise.resolve();height=730;gate.resize();height=746;gate.resize();assert.equal(resizeCalls,1);release();await job;assert.equal(textureHeight,746);assert.equal(resizeCalls,2);gate.dispose();
});
test('the latest selection cannot move the camera while a cancelled compile still owns it',async()=>{
 let release,active=0,maximum=0;const calls=[],old=new AbortController(),stale=new AbortController(),gate=createRendererWork();
 const first=gate.run(async()=>{active++;maximum=Math.max(maximum,active);calls.push('old');await new Promise(r=>release=r);active--;},{signal:old.signal});await Promise.resolve();old.abort();
 const skipped=gate.run(()=>calls.push('stale'),{signal:stale.signal});stale.abort();
 const latest=gate.run(()=>{maximum=Math.max(maximum,++active);calls.push('latest');active--;});release();await Promise.all([first,skipped,latest]);assert.equal(maximum,1);assert.deepEqual(calls,['old','latest']);gate.dispose();
});
test('a failed preparation releases ownership; disposing does not apply a queued resize',async()=>{
 let resized=0;const gate=createRendererWork(()=>resized++);await assert.rejects(gate.run(()=>{gate.resize();throw Error('GPU lost');}),/GPU lost/);assert.equal(gate.busy,false);assert.equal(resized,1);await gate.run(()=>{gate.resize();gate.dispose();});assert.equal(resized,1);assert.equal(await gate.run(()=>assert.fail('disposed work')),false);
});
test('a destination continuation cannot reset 96 percent or accept an older phase completion',()=>{
 const values=[],progress=createLoadingProgress(v=>values.push(v));progress.reset();const old=progress.phase(0,99);old(96/99);progress.continue();const finish=progress.phase(20,99);finish(0);old(1);assert.equal(progress.value,96);finish(1);assert.equal(progress.value,99);progress.complete();assert.deepEqual(values,[0,96,99,100]);progress.reset();assert.equal(progress.value,0,'a new user operation may start a new progress bar');
});
