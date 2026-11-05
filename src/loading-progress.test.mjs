import test from 'node:test';
import assert from 'node:assert/strict';
import {createLoadingProgress,fetchLoadingBytes,fetchLoadingJSON} from './loading-progress.mjs';
import {loadPublicBaseline} from '../public-view/baseline-loading.mjs';
const tick=()=>new Promise(r=>setImmediate(r));
test('progress follows completed phases, never regresses or fabricates 100, and retires callbacks across resets',()=>{
 const values=[],p=createLoadingProgress(n=>values.push(n));p.report(5);const old=p.phase(10,70);old(.5);p.report(30);p.report(140);assert.deepEqual(values,[5,40,99]);p.complete();assert.equal(p.value,100);p.reset();old(1);assert.equal(p.value,0);const next=p.phase(20,80);next(.5);assert.equal(p.value,50);p.cancel();next(1);p.complete();assert.equal(p.value,50);p.reset();p.phase(0,100)(1);assert.equal(p.value,99);p.complete();assert.equal(p.value,100);
});
test('streamed bytes use decoded asset sizes rather than compressed Content-Length and decode split UTF-8 correctly',async()=>{
 const raw=new TextEncoder().encode(JSON.stringify({room:'חדר הורים'})),events=[];let stream;
 const job=fetchLoadingJSON('/asset',{expectedBytes:raw.length,onProgress:e=>events.push(e),fetcher:async()=>new Response(new ReadableStream({start(c){stream=c;c.enqueue(raw.subarray(0,8));}}),{headers:{'content-length':'3'}})});await tick();assert.equal(events.at(-1).loaded,8);assert.equal(events.at(-1).fraction,8/raw.length);assert(!events.some(e=>e.done));stream.enqueue(raw.subarray(8));stream.close();assert.deepEqual(await job,{room:'חדר הורים'});assert.equal(events.at(-1).fraction,1);assert.equal(events.at(-1).loaded,raw.length);
});
test('unknown-length downloads finish on actual receipt, and abort/HTTP failure cannot report completion',async()=>{
 const values=[];assert.deepEqual([...await fetchLoadingBytes('/unknown',{onProgress:e=>values.push(e),fetcher:async()=>new Response(new Uint8Array([1,2,3]))})],[1,2,3]);assert(values.slice(0,-1).every(e=>e.fraction===0));assert.equal(values.at(-1).fraction,1);
 const controller=new AbortController(),events=[];const job=fetchLoadingBytes('/cancel',{signal:controller.signal,expectedBytes:100,onProgress:e=>events.push(e),fetcher:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(10));}}))});await tick();controller.abort();await assert.rejects(job,{name:'AbortError'});assert(!events.some(e=>e.done));await assert.rejects(fetchLoadingBytes('/missing',{fetcher:async()=>new Response(null,{status:404})}),/404/);
});
test('baseline downloads validate their revision, weight actual files, and retain the existing three-result contract',async()=>{
 const bodies={'navigation.json':JSON.stringify({revision:117,he:'דירה'}),'building.json':JSON.stringify({object:{name:'building'}}),'site.json':JSON.stringify({site:true})},bytes=Object.fromEntries(Object.entries(bodies).map(([p,b])=>[p,Buffer.byteLength(b)])),values=[];
 const fetcher=async(url,options)=>{assert.equal(options.cache,'no-cache');const name=url.split('/').at(-1).split('?')[0];return new Response(name==='loading.json'?JSON.stringify({revision:'R117',bytes}):bodies[name]);};const data=await loadPublicBaseline({revision:'R117',onProgress:n=>values.push(n),fetcher});assert.deepEqual(data,[JSON.parse(bodies['navigation.json']),JSON.parse(bodies['building.json']),{site:true}]);assert.equal(values.at(-1),1);assert(values.every((v,i)=>!i||v>=values[i-1]));await assert.rejects(loadPublicBaseline({revision:'R118',fetcher}),/does not match/);
});
