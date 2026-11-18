import {Vector2} from 'three';

const halton=(index,base)=>{let f=1,r=0;for(let i=index;i>0;i=Math.floor(i/base)){f/=base;r+=f*(i%base);}return r;};
const overlay=o=>o.userData.sceneUi||o.userData.liveFurniturePreview||o.userData.securityOverlay||/lighting-marker|selection-outline|gizmo|clearance|measurement/.test(o.userData.part||'');

// The normal animation loop is paused by the caller. Only the rendered scene
// reaches the PNG; DOM panels/joysticks are never composited into the image.
export async function capture4KImage(renderer,scene,camera,{pipelineFactory,prepare=async()=>{},restore=()=>{},onProgress=()=>{},signal,clock=()=>performance.now(),yieldFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve)),createCanvas=()=>document.createElement('canvas')}={}){
 const w=3840,h=2160,size=renderer.getSize(new Vector2()),ratio=renderer.getPixelRatio(),aspect=camera.aspect,view=camera.view?{...camera.view}:null,target=renderer.getRenderTarget(),mrt=renderer.getMRT?.(),hidden=[];let pipeline,canvas,context,frames=0;
 const check=()=>{if(signal?.aborted)throw new DOMException('Photo capture cancelled','AbortError');};
 try{
  scene.traverse(o=>{if(o.visible&&overlay(o)){hidden.push(o);o.visible=false;}});
  check();renderer.setPixelRatio(1);renderer.setSize(w,h,false);camera.aspect=w/h;camera.clearViewOffset?.();camera.updateProjectionMatrix();await prepare();check();
  pipeline=pipelineFactory?.(renderer,scene,camera,{mobile:false,enhanced:true,tier:0,capture:true});pipeline?.resize?.(w,h);
  if(camera?.setViewOffset){try{canvas=createCanvas(w,h);canvas.width=w;canvas.height=h;context=canvas.getContext('2d',{alpha:false});if(!context)canvas=null;}catch{canvas=null;context=null;}}
  const budgetMs=renderer.isWebGPURenderer?600:2800,maxFrames=renderer.isWebGPURenderer?16:180;
  const renderFrame=()=>pipeline?pipeline.render():renderer.render(scene,camera);
  // Warm compilation/targets before timing the progressive exposure.
  {const result=renderFrame();if(result?.then)await result;}await yieldFrame();const start=clock();
  do{
   check();if(camera?.setViewOffset)camera.setViewOffset(w,h,halton(frames+1,2)-.5,halton(frames+1,3)-.5,w,h);
   {const result=renderFrame();if(result?.then)await result;}
   if(context){try{context.globalAlpha=1/(frames+1);context.drawImage(renderer.domElement,0,0,w,h);}catch{canvas=null;context=null;}}
   frames++;onProgress(Math.min(.98,Math.max((clock()-start)/budgetMs,frames/maxFrames)));await yieldFrame();
  }while((clock()-start<budgetMs||frames<4)&&frames<maxFrames);
  check();if(!canvas){camera.clearViewOffset?.();const result=renderFrame();if(result?.then)await result;}
  const output=canvas||renderer.domElement;
  const blob=await new Promise((resolve,reject)=>output.toBlob(b=>b?resolve(b):reject(Error('4K PNG encoding failed')),'image/png'));
  check();onProgress(1);return blob;
 }finally{
  try{pipeline?.dispose();}finally{for(const o of hidden)o.visible=true;
  camera.clearViewOffset?.();camera.view=view;camera.aspect=aspect;camera.updateProjectionMatrix();renderer.setPixelRatio(ratio);renderer.setSize(size.x,size.y,false);renderer.setMRT?.(mrt??null);renderer.setRenderTarget(target);await restore();}
 }
}
