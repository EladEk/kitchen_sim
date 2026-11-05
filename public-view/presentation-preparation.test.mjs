import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchitecturalPresentation} from './presentation.mjs';
test('mobile native preparation and first room display use the same postprocessing pipeline',async()=>{
 const calls=[];let created=0;const renderer={isWebGPURenderer:true,xr:{isPresenting:false},getPixelRatio:()=>1.25,setRenderTarget(){}},warmup={},presentation=createArchitecturalPresentation(renderer,{}, {},{mobile:true,pipelineFactory:(r,s,c,{enhanced})=>{assert.equal(enhanced,false);created++;return {resize(){},prepare(key,w,options){assert.equal(w,warmup);assert(options.draw);calls.push(key);return true;},render(){calls.push('draw');},dispose(){}};}});
 presentation.resize(394,597);await presentation.prepare('room:lobby',warmup,{draw:true,enhanced:true});presentation.render(16,{enhanced:true});await presentation.prepare('room:bathroom',warmup,{draw:true,enhanced:true});assert.equal(created,1);assert.deepEqual(calls,['room:lobby','draw','room:bathroom']);presentation.dispose();
});
