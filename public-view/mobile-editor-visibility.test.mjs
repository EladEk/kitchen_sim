import test from 'node:test';
import assert from 'node:assert/strict';
import {scheduleEditorFraming} from './editor-viewport.mjs';

function frames(){let queue=[],id=0,time=0;return {requestFrame:f=>{queue.push({id:++id,f});return id;},cancelFrame:h=>{queue=queue.filter(q=>q.id!==h);},now:()=>time,run(n=1,step=16){for(let i=0;i<n;i++){const q=queue;queue=[];time+=step;q.forEach(e=>e.f());}},get pending(){return queue.length;}};}

test('editor framing waits for the docked layout before refitting once',()=>{
 const f=frames();let calls=0;scheduleEditorFraming(()=>{calls++;return true;},f);
 f.run(2);assert.equal(calls,0,'two settle frames let ResizeObserver apply the bottom sheet / side dock');
 f.run(1);assert.equal(calls,1);f.run(5);assert.equal(calls,1,'framing happens once; later dock toggles never refit');assert.equal(f.pending,0);
});

test('editor framing retries while the renderer is busy, then gives up',()=>{
 const f=frames();let calls=0,busy=true;scheduleEditorFraming(()=>{calls++;return !busy;},{...f,timeoutMs:100});
 f.run(4);assert.equal(calls,2);busy=false;f.run(1);assert.equal(calls,3);f.run(3);assert.equal(calls,3);
 const g=frames();let tries=0;scheduleEditorFraming(()=>{tries++;return false;},{...g,timeoutMs:100});g.run(30);assert.ok(tries>0&&tries<10);assert.equal(g.pending,0);
});

test('leaving the editor cancels pending framing',()=>{
 const f=frames();let calls=0;const cancel=scheduleEditorFraming(()=>{calls++;},f);f.run(1);cancel();f.run(5);assert.equal(calls,0);
 assert.doesNotThrow(()=>scheduleEditorFraming(()=>{},{requestFrame:null})());
});

import {readFileSync} from 'node:fs';
import {gatedEffect,OPAQUE_OUTPUT_ALPHA,BLOOM_INPUT_LIMIT} from './webgpu-presentation.mjs';
import {uniform,float} from 'three/tsl';
const source=name=>readFileSync(new URL(name,import.meta.url),'utf8');

test('disabled WebGPU effects are selected out instead of multiplied by a zero weight',()=>{
 const node=gatedEffect(uniform(0),float(2),float(1));assert.ok(node?.isNode,'gate is a TSL select node');
 const s=source('./webgpu-presentation.mjs');
 for(const name of ['temporal','ao','gi','ssr','bloom'])assert.match(s,new RegExp(`gatedEffect\\(weights\\.${name},`),name);
 assert.doesNotMatch(s,/colour\.mul\(mix\(1,smoothAO\.r,weights\.ao\)\)/);
 assert.doesNotMatch(s,/glow\.rgb\.mul\(weights\.bloom\)\);\n/);
});

test('the 3D canvas is opaque on WebGPU, so the light page background never washes out the scene',()=>{
 assert.equal(OPAQUE_OUTPUT_ALPHA,1);assert.ok(BLOOM_INPUT_LIMIT>1&&BLOOM_INPUT_LIMIT<65504);
 const s=source('./webgpu-presentation.mjs');assert.doesNotMatch(s,/renderOutput\(vec4\(colour,beauty\.a\)\)/);assert.match(s,/renderOutput\(vec4\(colour,OPAQUE_OUTPUT_ALPHA\)\)/);
 assert.match(source('./webgpu-runtime.mjs'),/new WebGPURenderer\(\{antialias:true,alpha:false,/);
});

test('opening the furniture editor refits the apartment to the viewport left above the panel',()=>{
 const s=source('./DistrictViewer.jsx');
 assert.match(s,/runtime\.current\.frameEditor=\(\)=>\{/);
 assert.match(s,/rendererWork\.resize\(\);try\{photo\.suspend\(\);fitSelectionCamera\(camera,controls,selection\.current\)/);
 assert.match(s,/useEffect\(\(\)=>editing\?scheduleEditorFraming\(/);
});
