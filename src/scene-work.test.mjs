import test from 'node:test';
import assert from 'node:assert/strict';
import {waitForScenePaint,scheduleSceneWork} from './scene-work.mjs';
function clock(){let id=0;const frames=new Map(),timers=new Map();return {frames,timers,requestFrame:fn=>(frames.set(++id,fn),id),cancelFrame:i=>frames.delete(i),schedule:fn=>(timers.set(++id,fn),id),cancel:i=>timers.delete(i),frame(){const jobs=[...frames];frames.clear();jobs.forEach(([,fn])=>fn());},timeout(){const jobs=[...timers];timers.clear();jobs.forEach(([,fn])=>fn());}};}
test('heavy scene work waits for a real paint opportunity and cancels its fallback after the second frame',async()=>{
 const c=clock();let started=false;const done=waitForScenePaint(c).then(()=>started=true);
 assert(!started);c.frame();await Promise.resolve();assert(!started);assert.equal(c.frames.size,1);c.frame();await done;assert(started);assert.equal(c.frames.size,0);assert.equal(c.timers.size,0);
});
test('aborted preparation releases frames/timers and cannot mutate an unmounted scene',async()=>{
 const c=clock(),controller=new AbortController(),promise=waitForScenePaint({...c,signal:controller.signal});c.frame();controller.abort();await assert.rejects(promise,{name:'AbortError'});assert.equal(c.frames.size,0);assert.equal(c.timers.size,0);
});
test('rapid view changes prepare only the latest scene and cancellation never reports a load failure',async()=>{
 const c=clock(),calls=[],failures=[];const old=scheduleSceneWork(()=>calls.push('old'),{...c,onError:e=>failures.push(e)});old();scheduleSceneWork(()=>calls.push('latest'),{...c,onError:e=>failures.push(e)});c.frame();c.frame();await Promise.resolve();await Promise.resolve();assert.deepEqual(calls,['latest']);assert.equal(failures.length,0);
});
test('a throttled animation clock has a bounded fallback, and preparation failures reach the error view',async()=>{
 const c=clock();let complete=false;const done=waitForScenePaint(c).then(()=>complete=true);c.timeout();await done;assert(complete);assert.equal(c.frames.size,0);
 const errors=[];scheduleSceneWork(()=>{throw Error('scene failed');},{...c,onError:e=>errors.push(e.message)});c.frame();c.frame();await Promise.resolve();await Promise.resolve();assert.deepEqual(errors,['scene failed']);
});
