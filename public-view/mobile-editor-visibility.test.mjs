import test from 'node:test';
import assert from 'node:assert/strict';
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

test('editor entry and exit refit the apartment through the measured view-preparation path (R178)',()=>{
 const s=source('./DistrictViewer.jsx');
 assert.match(s,/useEffect\(\(\)=>runtime\.current\?\.fit\(\),\[mode,target,building,level,roomFocus,!!liveSession\]\)/);
 assert.match(s,/fit:\(\)=>\{needsFit=true;return queueViewWork\(/);
 assert.match(source('./editor-viewport.mjs'),/never refit/,'ordinary dock resizes keep the camera pose');
 assert.doesNotMatch(s,/frameEditor/,'one refit mechanism only');
});
