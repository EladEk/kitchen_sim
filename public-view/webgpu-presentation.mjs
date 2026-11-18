import {RenderPipeline} from 'three/webgpu';
import {Fn,vec4,vec3,float,uniform,pass,mrt,output,normalView,materialRoughness,materialMetalness,renderOutput,mix,velocity,select,min,max} from 'three/tsl';
import {ao} from 'three/addons/tsl/display/GTAONode.js';
import {ssgi} from 'three/addons/tsl/display/SSGINode.js';
import {ssr} from 'three/addons/tsl/display/SSRNode.js';
import {denoise} from 'three/addons/tsl/display/DenoiseNode.js';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {fxaa} from 'three/addons/tsl/display/FXAANode.js';
import {traa} from 'three/addons/tsl/display/TRAANode.js';
import {photorealQuality} from './photoreal-quality.mjs';

export function presentationAOWeight({effects=true,ao=true,enhanced=false}={}){
 return effects&&ao?(enhanced ? .52 : .42):0;
}
// Disabled effects keep their targets but skip their GPU passes after warmup.
// After the editor dock resizes the viewport those targets are stale (and on
// some mobile drivers hold Inf/NaN half-floats). mix(x,stale,0) is still NaN,
// so a disabled effect must be selected out, never multiplied by zero.
export function gatedEffect(weight,enabled,disabled){
 return select(weight.greaterThan(0),enabled,disabled);
}
// The canvas is opaque. Never let a scene alpha below 1 reveal the page behind
// the 3D view (WebGL2 already renders opaque).
export const OPAQUE_OUTPUT_ALPHA=1;
// Bounded HDR input to bloom: sky/sun texels above half-float range became Inf.
export const BLOOM_INPUT_LIMIT=32;
export function surfaceReflectionWeight(parameters){
 const reflectance=mix(float(.42),float(1),parameters.g);
 return parameters.b.mul(reflectance).mul(float(1).sub(parameters.r).pow(2));
}

export function createNodePresentation(renderer,scene,camera,{mobile=false,enhanced=false,tier=0,capture=false}={}){
 // Keep attachments and shader topology stable across automatic reductions.
 // Initial device/user mode decides temporal AA; no full scene recompile when
 // a phone reduces AO, resolution, POM steps or shadow samples while moving.
 const quality=photorealQuality({mobile,enhanced,tier}),owned=[],groups=[],pipeline=new RenderPipeline(renderer);
 const scenePass=pass(scene,camera,{samples:quality.temporal?0:renderer.samples});owned.push(scenePass);
 const surface=Fn(builder=>{
  const m=builder.material,d=m.userData||{},r=m.roughnessNode||(m.roughness!==undefined?materialRoughness:float(1));
  const eligible=d.floorRendering||d.publicFinish==='floor'||d.architecturalGlass||m.metalness>.3||m.roughness<.35;
  return vec4(r,m.metalnessNode||(m.metalness!==undefined?materialMetalness:float(0)),eligible?1:0,1);
 })();
 scenePass.setMRT(mrt({output,normal:normalView,...(!mobile?{surface}:{}),...(quality.temporal?{velocity}:{})}));
 const beauty=scenePass.getTextureNode('output'),normal=scenePass.getTextureNode('normal'),depth=scenePass.getTextureNode('depth');
 const weights={temporal:uniform(quality.temporal?1:0),ao:uniform(presentationAOWeight({ao:quality.ao,enhanced})),gi:uniform(quality.gi?1:0),ssr:uniform(quality.ssr?1:0),bloom:uniform(quality.bloom?1:0)};
 const group=(name,...nodes)=>{owned.push(...nodes);groups.push({name,nodes:nodes.map(node=>({node,type:node.updateBeforeType}))});};
 let temporal=null,colour=beauty.rgb;
 if(quality.temporal){temporal=traa(beauty,depth,scenePass.getTextureNode('velocity'),camera);group('temporal',temporal);colour=gatedEffect(weights.temporal,mix(beauty.rgb,temporal.rgb,weights.temporal),beauty.rgb);}
 const cavity=ao(depth,normal,camera);cavity.resolutionScale=quality.aoScale;cavity.samples.value=capture?32:quality.aoSamples;cavity.radius.value=.45;cavity.scale.value=.85;
 const smoothAO=denoise(cavity,depth,normal,camera);group('ao',cavity,smoothAO);colour=colour.mul(gatedEffect(weights.ao,mix(1,smoothAO.r,weights.ao),float(1)));
 let gi=null,reflection=null;
 if(!mobile){
  gi=ssgi(beauty,depth,normal,camera);gi.sliceCount.value=2;gi.stepCount.value=6;gi.radius.value=1.5;gi.giIntensity.value=.25;gi.aoIntensity.value=0;
  const diffuse=denoise(gi.getGINode(),depth,normal,camera);group('gi',gi,diffuse);colour=colour.add(gatedEffect(weights.gi,diffuse.rgb.mul(weights.gi),vec3(0)));
  // r185's mirror/blur SSR multiplies raw ray hits by metalnessNode even
  // with reflectNonMetals=true. Use eligibility as its trace mask, then apply
  // the real metalness reflectance once below; g=0 must not erase porcelain.
  const parameters=scenePass.getTextureNode('surface');reflection=ssr(beauty,depth,normal,{camera,roughnessNode:parameters.r,metalnessNode:parameters.b,reflectNonMetals:false});
  reflection.resolutionScale=capture?1:quality.ssrScale;reflection.quality.value=capture?.75:quality.ssrQuality;reflection.intensity.value=.14;reflection.maxDistance.value=6;reflection.thickness.value=.12;group('ssr',reflection);
  // Green is actual metalness; blue only gates SSR-eligible surfaces.
  colour=colour.add(gatedEffect(weights.ssr,reflection.rgb.mul(surfaceReflectionWeight(parameters)).mul(weights.ssr),vec3(0)));
 }
 const glow=bloom(vec4(min(max(colour,vec3(0)),vec3(BLOOM_INPUT_LIMIT)),OPAQUE_OUTPUT_ALPHA),.035,.2,1.1);glow.setResolutionScale(.25);group('bloom',glow);colour=colour.add(gatedEffect(weights.bloom,glow.rgb.mul(weights.bloom),vec3(0)));
 if(temporal)pipeline.outputNode=renderOutput(vec4(colour,OPAQUE_OUTPUT_ALPHA));
 else{const antialias=fxaa(renderOutput(vec4(colour,OPAQUE_OUTPUT_ALPHA)));owned.push(antialias);pipeline.outputNode=antialias;}
 pipeline.outputColorTransform=false;
 let preparedKey='',disposed=false,primed=false,temporalActive=!!temporal;
 const resetHistory=()=>{temporal?._historyRenderTarget.setSize(1,1);};
 function setQuality({tier=0,enhanced=false,effects=true}={}){
  const next=photorealQuality({mobile,enhanced,tier});Object.assign(quality,next);
  const taa=!!temporal&&effects&&next.temporal;if(taa&&!temporalActive)resetHistory();temporalActive=taa;
  weights.temporal.value=taa?1:0;weights.ao.value=presentationAOWeight({effects,ao:next.ao,enhanced});weights.gi.value=effects&&next.gi?1:0;weights.ssr.value=effects&&next.ssr?1:0;weights.bloom.value=effects&&next.bloom?1:0;
  cavity.samples.value=next.aoSamples;
  if(reflection){reflection.resolutionScale=next.ssrScale;reflection.quality.value=next.ssrQuality;}
 }
 const render=()=>{
  const tone=renderer.toneMapping,space=renderer.outputColorSpace,xr=renderer.xr.enabled,view=camera.view?{...camera.view}:null;
  // Allocate each effect once during warmup. Thereafter a disabled effect keeps
  // its target/bindings but performs no GPU pass; its contribution is zero.
  for(const {name,nodes}of groups)for(const {node,type}of nodes)node.updateBeforeType=!primed||weights[name].value>0?type:'none';
  try{pipeline.render();primed=true;}
  finally{
   if(temporal){if(camera.view?.enabled)temporal.clearViewOffset();camera.view=view;camera.updateProjectionMatrix();}
   renderer.toneMapping=tone;renderer.outputColorSpace=space;renderer.xr.enabled=xr;renderer.setMRT(null);renderer.setRenderTarget(null);
  }
 };
 return {quality,setQuality,resetHistory,
  resize(w,h){scenePass.setResolutionScale(temporal?1:Math.min(1,w/(renderer.domElement.width||w),h/(renderer.domElement.height||h)));resetHistory();},
  async prepare(key,warmup,{draw=false,onProgress=()=>{},...options}={}){
   if(key!==preparedKey){resetHistory();preparedKey=key;}
   const target=renderer.getRenderTarget(),mrt=renderer.getMRT();scenePass.setup({renderer});scenePass.setSize(renderer.domElement.width,renderer.domElement.height);
   renderer.setRenderTarget(scenePass.renderTarget);renderer.setMRT(scenePass.getMRT());
   try{return await warmup.prepare(key,{...options,draw,onProgress,renderDepth:2,renderFrame:()=>{renderer.setMRT(mrt);renderer.setRenderTarget(target);render();}});}
   finally{renderer.setMRT(mrt);renderer.setRenderTarget(target);}
  },
  render,dispose(){if(disposed)return;disposed=true;pipeline.dispose();for(const node of owned)node.dispose?.();}
 };
}
