import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {SSAOPass} from 'three/addons/postprocessing/SSAOPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';

// Geometry is unchanged. Contact occlusion adds depth at wall/floor junctions,
// cabinet recesses and furniture contacts; technical transparency stays clear.
export function createScenePresentation(renderer,scene,camera){
 const composer=new EffectComposer(renderer),render=new RenderPass(scene,camera),ao=new SSAOPass(scene,camera,512,512,16),aa=new ShaderPass(FXAAShader),output=new OutputPass();
 const ratio=Math.min(renderer.getPixelRatio(),1.5);composer.setPixelRatio(ratio);
 ao.kernelRadius=.28;ao.minDistance=.006/(camera.far-camera.near);ao.maxDistance=.45/(camera.far-camera.near);
 const drawAO=ao.render.bind(ao);
 ao.render=(...args)=>{const hidden=[];scene.traverse(o=>{if(o.isMesh&&o.visible&&(o.userData.electricalId||(Array.isArray(o.material)?o.material:[o.material]).some(m=>m.transparent&&m.opacity<.98))){hidden.push(o);o.visible=false;}});try{drawAO(...args);}finally{hidden.forEach(o=>{o.visible=true;});}};
 composer.addPass(render);composer.addPass(ao);composer.addPass(aa);composer.addPass(output);
 let failed=false;
 return {
  resize(width,height){composer.setSize(width,height);aa.material.uniforms.resolution.value.set(1/(width*ratio),1/(height*ratio));},
  render(quality='realistic',{transparentCabinets=false}={}){if(quality==='light'||failed){renderer.render(scene,camera);return;}ao.enabled=!transparentCabinets;ao.ssaoMaterial.uniforms.cameraProjectionMatrix.value.copy(camera.projectionMatrix);ao.ssaoMaterial.uniforms.cameraInverseProjectionMatrix.value.copy(camera.projectionMatrixInverse);try{composer.render();}catch{failed=true;renderer.setRenderTarget(null);renderer.render(scene,camera);}},
  dispose(){for(const pass of [render,ao,aa,output])pass.dispose?.();ao.ssaoMaterial.dispose();ao.noiseTexture.dispose();composer.dispose();}
 };
}
