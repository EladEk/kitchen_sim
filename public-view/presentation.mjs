import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
export function createArchitecturalPresentation(renderer,scene,camera,{mobile=false}={}){
 const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),ao=new GTAOPass(scene,camera,512,512),aa=new ShaderPass(FXAAShader),output=new OutputPass();
 const ratio=Math.min(renderer.getPixelRatio(),mobile?1.1:1.75);composer.setPixelRatio(ratio);
 ao.blendIntensity=.65;ao.updateGtaoMaterial({radius:.55,thickness:1,distanceFallOff:1,scale:1});ao.updatePdMaterial({radius:4,lumaPhi:8,depthPhi:2,normalPhi:3});
 composer.addPass(render);composer.addPass(ao);composer.addPass(aa);composer.addPass(output);
 // Transparent balcony panes must not become opaque occluders in the normal pass.
 const draw=ao.render.bind(ao);ao.render=(...args)=>{const hidden=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&[o.material].flat().some(m=>m?.transparent&&m.opacity<.98)){hidden.push(o);o.visible=false;}});try{draw(...args);}finally{hidden.forEach(o=>o.visible=true);}};
 let failed=false,slow=0,previous=0,reduced=false;
 return {resize(w,h){composer.setSize(w,h);aa.material.uniforms.resolution.value.set(1/(w*ratio),1/(h*ratio));},render(now){
  const dt=now-previous;previous=now;if(dt>0&&dt<250){slow=dt>50?slow+1:Math.max(0,slow-1);if(slow>45)reduced=true;}
  if(renderer.xr.isPresenting||failed){renderer.render(scene,camera);return;}
  ao.enabled=!reduced;try{composer.render();}catch{failed=true;renderer.setRenderTarget(null);renderer.render(scene,camera);}
 },dispose(){for(const pass of [render,ao,aa,output])pass.dispose?.();composer.dispose();}};
}
