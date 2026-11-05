import test from 'node:test';
import assert from 'node:assert/strict';
import {createFrameTimings} from './frame-timings.mjs';
test('the first interactive frame separates postprocessing time and late shader compilation from other scene work',()=>{
 let now=100;const counts={nodeBuilds:40,syncPipelines:3,asyncPipelines:10},trace=createFrameTimings({clock:()=>now,counters:()=>({...counts})});assert.equal(trace.measure('district',()=>{now+=3;return 42;}),42);trace.measure('presentation',()=>{now+=114000;counts.nodeBuilds+=400;counts.syncPipelines+=300;});trace.measure('photo',()=>now+=2);assert.deepEqual(trace.finish(),{elapsedMs:114005,districtMs:3,presentationMs:114000,photoMs:2,nodeBuilds:400,syncPipelines:300,asyncPipelines:0});
});
test('a failed phase preserves elapsed evidence and propagates the original renderer failure',()=>{let now=0;const trace=createFrameTimings({clock:()=>now});assert.throws(()=>trace.measure('presentation',()=>{now=17;throw Error('lost device');}),/lost device/);assert.deepEqual(trace.finish(),{elapsedMs:17,presentationMs:17});});
