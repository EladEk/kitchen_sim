import test from 'node:test';
import assert from 'node:assert/strict';
import {installNativePreparation} from './native-preparation.mjs';

test('asynchronous transmission updates read the framebuffer being compiled and restore all target state on failure',async()=>{
 const frame={width:492,height:705},mrt={name:'normal'},renderer={target:null,mrt,needsFrameBufferTarget:true,getRenderTarget(){return this.target;},getActiveCubeFace:()=>2,getActiveMipmapLevel:()=>1,getMRT(){return this.mrt;},setMRT(v){this.mrt=v;},_getFrameBufferTarget:()=>frame,setRenderTarget(v,face,level){this.target=v;this.restored=[face,level];},async compileAsync(){await Promise.resolve();assert.equal(this.target,frame);this.setMRT(null);throw Error('cancelled pipeline');}};
 installNativePreparation(renderer);await assert.rejects(renderer.compileAsync(),/cancelled pipeline/);assert.equal(renderer.target,null);assert.equal(renderer.mrt,mrt);assert.deepEqual(renderer.restored,[2,1]);
});
test('an existing postprocessing target is preserved rather than replaced by the canvas target',async()=>{
 const target={width:433,height:656};let current=target;const renderer={needsFrameBufferTarget:true,getRenderTarget:()=>current,getActiveCubeFace:()=>0,getActiveMipmapLevel:()=>0,getMRT:()=>null,setMRT(){},setRenderTarget:v=>current=v,_getFrameBufferTarget:()=>assert.fail('must retain MRT target'),async compileAsync(){assert.equal(current,target);return true;}};installNativePreparation(renderer);assert.equal(await renderer.compileAsync(),true);assert.equal(current,target);
});
