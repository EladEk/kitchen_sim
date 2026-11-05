import {WebGPURenderer,PMREMGenerator,RenderPipeline,MeshBasicNodeMaterial,RectAreaLightNode,CubeRenderTarget} from 'three/webgpu';
import {BackSide,Mesh,SphereGeometry,Vector3,CubeCamera,HalfFloatType} from 'three';
import {RectAreaLightTexturesLib} from 'three/addons/lights/RectAreaLightTexturesLib.js';
import {Fn,uniform,vec2,vec3,vec4,float,positionGeometry,cameraViewMatrix,cameraProjectionMatrix,normalize,dot,cross,max,sqrt,sin,cos,smoothstep,mix,varying,pass,mrt,output,normalView,materialRoughness,materialMetalness,renderOutput,reflector} from 'three/tsl';
import {ao} from 'three/addons/tsl/display/GTAONode.js';
import {ssgi} from 'three/addons/tsl/display/SSGINode.js';
import {ssr} from 'three/addons/tsl/display/SSRNode.js';
import {denoise} from 'three/addons/tsl/display/DenoiseNode.js';
import {bloom} from 'three/addons/tsl/display/BloomNode.js';
import {fxaa} from 'three/addons/tsl/display/FXAANode.js';
import {createFinishAdapter} from './webgpu-finishes.mjs';
import {installNativePreparation} from './native-preparation.mjs';
export function createNodeCelestialDisks(){
 const u={sunDirection:uniform(new Vector3(0,1,0)),moonDirection:uniform(new Vector3(0,1,0)),moonRadius:uniform(.0045),moonFraction:uniform(0),limbAngle:uniform(0),sunVisible:uniform(0),moonVisible:uniform(0),daylight:uniform(0)},material=new MeshBasicNodeMaterial({side:BackSide,transparent:true,depthWrite:false,depthTest:true,fog:false});
 const clip=cameraProjectionMatrix.mul(vec4(cameraViewMatrix.mul(vec4(positionGeometry,0)).xyz,1));material.vertexNode=vec4(clip.xy,clip.w,clip.w);
 const d=normalize(varying(positionGeometry)),sd=dot(d,u.sunDirection),md=dot(d,u.moonDirection),se=max(sd.fwidth(),.0000001),me=max(md.fwidth(),.0000001),sm=smoothstep(float(Math.cos(.004653)).sub(se),float(Math.cos(.004653)).add(se),sd).mul(u.sunVisible),mm=smoothstep(cos(u.moonRadius).sub(me),cos(u.moonRadius).add(me),md).mul(u.moonVisible);
 const right=normalize(vec3(u.moonDirection.z.negate(),0,u.moonDirection.x)),up=cross(right,u.moonDirection),p=vec2(dot(d,right),dot(d,up)).div(sin(u.moonRadius)),nz=sqrt(max(0,float(1).sub(dot(p,p)))),pc=u.moonFraction.mul(2).sub(1),lit=max(0,p.x.mul(sin(u.limbAngle)).add(p.y.mul(cos(u.limbAngle))).mul(sqrt(max(0,float(1).sub(pc.mul(pc))))).add(nz.mul(pc))),ma=mm.mul(lit.mul(2).add(float(1).sub(u.daylight).mul(.025)).clamp());
 material.colorNode=mix(vec3(1.5,1.6,1.8),vec3(18,16.8,13),sm);material.opacityNode=max(sm,ma);material.alphaTestNode=float(.001);
 const geometry=new SphereGeometry(1,48,24),mesh=new Mesh(geometry,material);mesh.name='visible-sun-and-moon';mesh.frustumCulled=false;mesh.renderOrder=-10000;mesh.raycast=()=>{};mesh.userData.celestialBackground=true;
 return {mesh,update(s){u.sunDirection.value.fromArray(s.sun.direction);u.moonDirection.value.fromArray(s.moon.direction);for(const [k,v]of Object.entries({moonRadius:s.moon.angularRadius,moonFraction:s.moon.fraction,limbAngle:s.moon.limbAngle,sunVisible:!s.dark&&s.sun.elevation>0?1:0,moonVisible:!s.dark&&s.moon.elevation>0?1:0,daylight:s.daylight}))u[k].value=v;mesh.visible=u.sunVisible.value+u.moonVisible.value>0;},dispose(){geometry.dispose();material.dispose();}};
}
export function createNodePresentation(renderer,scene,camera,{mobile=false,enhanced=false}={}){
 const owned=[],pipeline=new RenderPipeline(renderer),scenePass=pass(scene,camera);owned.push(scenePass);
 const surface=Fn(builder=>{const m=builder.material;return vec4(m.roughnessNode||(m.roughness!==undefined?materialRoughness:float(1)),m.metalnessNode||(m.metalness!==undefined?materialMetalness:float(0)),0,1);})();
 scenePass.setMRT(mrt({output,normal:normalView,...(enhanced&&!mobile?{surface}:{})}));
 const beauty=scenePass.getTextureNode('output'),normal=scenePass.getTextureNode('normal'),depth=scenePass.getTextureNode('depth');let colour=beauty.rgb;
 if(enhanced&&!mobile){
  const gi=ssgi(beauty,depth,normal,camera);gi.sliceCount.value=2;gi.stepCount.value=6;gi.radius.value=2;gi.giIntensity.value=.6;gi.aoIntensity.value=.65;owned.push(gi);
  const diffuse=denoise(gi.getGINode(),depth,normal,camera),occlusion=denoise(gi.getAONode(),depth,normal,camera);owned.push(diffuse,occlusion);colour=colour.mul(occlusion.r).add(diffuse.rgb);
  const parameters=scenePass.getTextureNode('surface'),reflection=ssr(beauty,depth,normal,{camera,roughnessNode:parameters.r,metalnessNode:parameters.g,reflectNonMetals:true});reflection.resolutionScale=.5;reflection.quality.value=.35;reflection.intensity.value=.12;owned.push(reflection);colour=colour.add(reflection.rgb);
 }else{const cavity=ao(depth,normal,camera);cavity.resolutionScale=.5;cavity.radius.value=.8;cavity.scale.value=.65;owned.push(cavity);colour=colour.mul(mix(1,cavity.r,.55));}
 const glow=bloom(vec4(colour,beauty.a),.08,.25,1.4);glow.setResolutionScale(.25);owned.push(glow);const antialias=fxaa(renderOutput(vec4(colour.add(glow.rgb),beauty.a)));owned.push(antialias);pipeline.outputColorTransform=false;pipeline.outputNode=antialias;
 const render=()=>{const tone=renderer.toneMapping,space=renderer.outputColorSpace,xr=renderer.xr.enabled;try{pipeline.render();}finally{renderer.toneMapping=tone;renderer.outputColorSpace=space;renderer.xr.enabled=xr;renderer.setMRT(null);renderer.setRenderTarget(null);}};
 return {
  resize(w,h){scenePass.setResolutionScale(Math.min(1,w/(renderer.domElement.width||w),h/(renderer.domElement.height||h)));},
  async prepare(key,warmup,{draw=false,onProgress=()=>{},...options}={}){
   const target=renderer.getRenderTarget(),mrt=renderer.getMRT();
   scenePass.setup({renderer});scenePass.setSize(renderer.domElement.width,renderer.domElement.height);
   // Output quad (depth 0) → FXAA input texture quad (depth 1) → scene pass (depth 2).
   // Keep this matched to both mobile and enhanced graph regressions.
   renderer.setRenderTarget(scenePass.renderTarget);renderer.setMRT(scenePass.getMRT());
   try{return await warmup.prepare(key,{...options,draw,onProgress,renderDepth:2,renderFrame:()=>{renderer.setMRT(mrt);renderer.setRenderTarget(target);render();}});}
   finally{renderer.setMRT(mrt);renderer.setRenderTarget(target);}
  },
  render,dispose(){pipeline.dispose();for(const n of owned)n.dispose?.();}
 };
}
export async function createWebGPUTourRenderer(parameters={}){
 const {onDiagnostic=()=>{},...options}=parameters,emit=(event,error=null,details={})=>{try{onDiagnostic({event,error,details});}catch{}};const renderer=new WebGPURenderer({antialias:true,powerPreference:'high-performance',...options}),finishes=createFinishAdapter();let disposed=false;
 const dispose=()=>{if(disposed)return;disposed=true;finishes.dispose();renderer.dispose();renderer.domElement?.remove?.();};
 const originalError=renderer.onError.bind(renderer),originalLoss=renderer.onDeviceLost.bind(renderer);renderer.onError=info=>{emit('gpu-uncaptured-error',info);originalError(info);};renderer.onDeviceLost=info=>{emit('gpu-device-lost',info);originalLoss(info);};
 try{emit('gpu-adapter-device-initialization');await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Object.assign(Error('Native WebGPU unavailable: renderer initialized a compatibility backend'),{code:'WEBGPU_NATIVE_BACKEND_UNAVAILABLE'});emit('gpu-lighting-initialization');RectAreaLightNode.setLTC(RectAreaLightTexturesLib.init());}catch(e){dispose();throw e;}
 // r185 can report a scoped pipeline failure and still resolve compileAsync.
 // Refuse that draw so the viewer can rebuild using its compatibility path.
 const compilation={nodeBuilds:0,syncPipelines:0,asyncPipelines:0},backend=renderer.backend,createBuilder=backend.createNodeBuilder.bind(backend),createPipeline=backend.createRenderPipeline.bind(backend),draw=backend.draw.bind(backend);backend.createNodeBuilder=(...args)=>{compilation.nodeBuilds++;return createBuilder(...args);};backend.createRenderPipeline=(object,promises,...args)=>{compilation[promises?'asyncPipelines':'syncPipelines']++;return createPipeline(object,promises,...args);};backend.draw=(o,info)=>{if(backend.get(o.pipeline).error)throw Object.assign(Error('WebGPU shader pipeline failed'),{name:'SceneDrawError',code:'WEBGPU_PIPELINE_ERROR',details:{objectType:o.object?.type||'unknown',materialType:o.material?.type||'unknown'}});return draw(o,info);};
 installNativePreparation(renderer);
 const environmentFactory=source=>{const g=new PMREMGenerator(renderer);try{return g.fromEquirectangular(source);}finally{g.dispose();}};
 const probeFactory=(scene,position,mobile)=>{const cube=new CubeRenderTarget(mobile?128:256,{type:HalfFloatType,generateMipmaps:false}),capture=new CubeCamera(.08,24,cube),g=new PMREMGenerator(renderer),old=renderer.shadowMap.autoUpdate,xr=renderer.xr.enabled;capture.position.copy(position);renderer.shadowMap.autoUpdate=false;renderer.xr.enabled=false;try{capture.update(renderer,scene);return g.fromCubemap(cube.texture);}finally{renderer.shadowMap.autoUpdate=old;renderer.xr.enabled=xr;g.dispose();cube.dispose();}};
 const mirrorFactory=geometry=>{const node=reflector({resolutionScale:.35,bounces:false}),material=new MeshBasicNodeMaterial();material.colorNode=node.mul(vec3(.95));const mesh=new Mesh(geometry,material);mesh.add(node.target);const update=node.reflector.updateBefore.bind(node.reflector);let last=-Infinity;node.reflector.updateBefore=frame=>{const now=performance.now();if(renderer.xr.isPresenting||frame.scene.overrideMaterial||now-last<100)return;last=now;return update(frame);};mesh.dispose=()=>{node.dispose();material.dispose();};return mesh;};
 return {renderer,compilationStats:()=>({...compilation}),native:true,backend:'webgpu',reason:'supported',environmentFactory,disksFactory:createNodeCelestialDisks,pipelineFactory:createNodePresentation,probeFactory,mirrorFactory,adapt:root=>finishes.apply(root),restoreMaterials:()=>finishes.dispose(),dispose};
}
