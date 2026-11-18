import {EffectComposer,RenderPass,EffectPass,BloomEffect,FXAAEffect} from 'postprocessing';
import {HomeToneMappingEffect} from './home-tone-mapping.mjs';
import {N8AOPostPass} from 'n8ao';
import {HalfFloatType,NoToneMapping,NeutralToneMapping} from 'three';
// realism-effects 1.1.2 imports the removed WebGLMultipleRenderTargets export.
// Its GI/reflection equivalent uses maintained Three TSL nodes on WebGPU.
export function createWebGLPresentation(renderer,scene,camera,{mobile=false}={}){
 let composer;const owned=[],autoClear=renderer.autoClear;
 try{
  composer=new EffectComposer(renderer,{frameBufferType:HalfFloatType,multisampling:0});const render=new RenderPass(scene,camera),ao=new N8AOPostPass(scene,camera,1,1);owned.push(ao);
  ao.setQualityMode(mobile?'Low':'Medium');// R177: back to R176's tighter contact AO; the wider/deeper R153 setting
  // greyed whole hallway ceilings (owner photos show them clean white).
  Object.assign(ao.configuration,{aoRadius:.8,intensity:.65,halfRes:true,gammaCorrection:false,transparencyAware:false});
  const glow=new BloomEffect({intensity:.08,luminanceThreshold:1.4,luminanceSmoothing:.25,mipmapBlur:true,resolutionScale:.25}),tone=new HomeToneMappingEffect(),aa=new FXAAEffect();composer.addPass(render);composer.addPass(ao);composer.addPass(new EffectPass(camera,glow,tone));
  // FXAA must get its own pass: inside the tone-mapping EffectPass it samples the
  // raw HDR input buffer for its neighbours, and wherever that differs from the
  // mapped centre it returned the raw texel, so the frame shipped un-tone-mapped.
  composer.addPass(new EffectPass(camera,aa));
  const draw=ao.render.bind(ao),hidden=[];ao.render=(...args)=>{scene.traverseVisible(o=>{if(o.isMesh&&(o.userData.celestialBackground||[o.material].flat().some(m=>m?.alphaTest>0||m?.transparent&&m.opacity<.98))){hidden.push(o);o.visible=false;}});try{draw(...args);}finally{for(const o of hidden)o.visible=true;hidden.length=0;}};
  return {resize(w,h){for(const target of [composer.inputBuffer,composer.outputBuffer,composer.depthRenderTarget])target?.setSize(w,h);for(const pass of composer.passes)pass.setSize(w,h);},render(){
   // The composer owns tone mapping (HomeToneMappingEffect, fed the renderer's
   // exposure). The renderer itself must not map the final pass again.
   const mapping=renderer.toneMapping;tone.exposure=renderer.toneMappingExposure;tone.neutral=mapping===NeutralToneMapping;renderer.toneMapping=NoToneMapping;
   try{composer.render();}finally{renderer.toneMapping=mapping;}
  },dispose(){composer.dispose();renderer.autoClear=autoClear;}};
 }catch(e){composer?.dispose();renderer.autoClear=autoClear;for(const o of owned)o.dispose?.();throw e;}
}
