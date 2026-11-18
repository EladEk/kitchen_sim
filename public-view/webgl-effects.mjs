import {EffectComposer,RenderPass,EffectPass,BloomEffect,FXAAEffect,ToneMappingEffect,ToneMappingMode} from 'postprocessing';
import {N8AOPostPass} from 'n8ao';
import {HalfFloatType} from 'three';
// realism-effects 1.1.2 imports the removed WebGLMultipleRenderTargets export.
// Its GI/reflection equivalent uses maintained Three TSL nodes on WebGPU.
export function createWebGLPresentation(renderer,scene,camera,{mobile=false}={}){
 let composer;const owned=[],autoClear=renderer.autoClear;
 try{
  composer=new EffectComposer(renderer,{frameBufferType:HalfFloatType,multisampling:0});const render=new RenderPass(scene,camera),ao=new N8AOPostPass(scene,camera,1,1);owned.push(ao);
  ao.setQualityMode(mobile?'Low':'Medium');Object.assign(ao.configuration,{aoRadius:.8,intensity:.65,halfRes:true,gammaCorrection:false,transparencyAware:false});
  const glow=new BloomEffect({intensity:.08,luminanceThreshold:1.4,luminanceSmoothing:.25,mipmapBlur:true,resolutionScale:.25}),tone=new ToneMappingEffect({mode:ToneMappingMode.AGX}),aa=new FXAAEffect();composer.addPass(render);composer.addPass(ao);composer.addPass(new EffectPass(camera,glow,tone,aa));
  const draw=ao.render.bind(ao),hidden=[];ao.render=(...args)=>{scene.traverseVisible(o=>{if(o.isMesh&&(o.userData.celestialBackground||[o.material].flat().some(m=>m?.alphaTest>0||m?.transparent&&m.opacity<.98))){hidden.push(o);o.visible=false;}});try{draw(...args);}finally{for(const o of hidden)o.visible=true;hidden.length=0;}};
  return {resize(w,h){for(const target of [composer.inputBuffer,composer.outputBuffer,composer.depthRenderTarget])target?.setSize(w,h);for(const pass of composer.passes)pass.setSize(w,h);},render(){composer.render();},dispose(){composer.dispose();renderer.autoClear=autoClear;}};
 }catch(e){composer?.dispose();renderer.autoClear=autoClear;for(const o of owned)o.dispose?.();throw e;}
}
