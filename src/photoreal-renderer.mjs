import * as THREE from 'three';
import {createPhotoScene,photoSceneSignature,photoCameraSignature,PhotoSceneLimit} from './photoreal-scene.mjs';
// Native scene controls and WebXR always own the original canvas. A separate,
// pointer-transparent photo canvas is shown only while the scene is stationary.
export function installPhotorealRenderer({renderer,scene,camera,host,lang=()=> 'he',mobile=()=>globalThis.matchMedia?.('(pointer: coarse)').matches===true,backendFactory=null}){
 let enabled=false,disposed=false,busy=false,backend=null,tracer=null,snapshot=null,photoRenderer=null,canvas=null,worker=null,token=0,sceneKey='',cameraKey='',stableAt=0,lastCheck=0,lastStatus=0,steps=0,lastError='',lastWidth=0,lastHeight=0,dirty=true,lastLang='';
 const release=(...objects)=>{for(const object of objects){try{object?.dispose?.();}catch{/* A renderer teardown still releases the backing GPU device resources. */}}};
 const controls=document.createElement('div');controls.className='photo-controls';controls.dataset.sceneUiToggle='';
 const button=document.createElement('button');button.type='button';button.className='photo-toggle';button.setAttribute('aria-pressed','false');
 const label=document.createElement('span');label.className='photo-status';label.setAttribute('role','status');label.setAttribute('aria-live','polite');controls.append(button,label);const slot=host.closest('.hs-app,.kitchen-app,main')?.querySelector('[data-photo-controls-slot]');(slot||host).append(controls);
 const he=()=>lang()==='he',say=(a,b)=>{label.textContent=he()?a:b;},hide=()=>{if(canvas)canvas.style.visibility='hidden';};
 function updateButton(){lastLang=lang();button.textContent=enabled?(he()?'חזרה לסיור חלק':'Back to live view'):(he()?'✦ איכות צילום':'✦ Photo quality');button.setAttribute('aria-pressed',String(enabled));button.title=he()?'חישוב תאורה והשתקפויות בזמן שהמבט עומד. VR משתמש בתצוגה בזמן אמת.':'Progressive light transport while still. VR uses live rendering.';}
 function cleanup(){controls.setAttribute('aria-busy','false');token++;const old=[tracer,worker,snapshot,photoRenderer],oldCanvas=canvas;tracer=null;worker=null;snapshot=null;photoRenderer=null;canvas=null;backend=null;busy=false;dirty=true;steps=0;release(...old);oldCanvas?.remove();}
 function off(){enabled=false;hide();cleanup();updateButton();say('סיור ו־VR בזמן אמת','Live tour and VR');}
 button.addEventListener('click',()=>{if(enabled){off();return;}enabled=true;lastError='';stableAt=performance.now();dirty=true;updateButton();say('עצור את המבט לחישוב התמונה','Hold the view still to render');});updateButton();
 async function createBackend(){
  if(globalThis.navigator?.gpu){let r;
   try{const [{WebGPURenderer},{WebGPUPathTracer}]=await Promise.all([import('three/webgpu'),import('three-gpu-pathtracer/webgpu')]);
    r=new WebGPURenderer({antialias:false,alpha:false});await r.init();if(!r.backend?.isWebGPUBackend)throw Error('No native WebGPU');
    const t=new WebGPUPathTracer(r);t.maxBounces=10;t.maxTransparentBounces=8;t.frameBudget=mobile()?50000:250000;t.maxSamples=512;t.dynamicLowRes=false;t.renderDelay=0;
    return {renderer:r,tracer:t,backend:'WebGPU'};
   }catch{r?.dispose();}
  }
  const [{WebGLPathTracer},{GenerateMeshBVHWorker}]=await Promise.all([import('three-gpu-pathtracer'),import('three-mesh-bvh/worker')]);
  const r=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});
  if(!r.extensions.has('EXT_color_buffer_float')){r.dispose();throw Error('Float targets unsupported');}
  const t=new WebGLPathTracer(r),w=new GenerateMeshBVHWorker();t.setBVHWorker(w);t.bounces=8;t.transmissiveBounces=8;t.textureSize.set(mobile()?512:1024,mobile()?512:1024);t.tiles.set(mobile()?3:2,mobile()?3:2);t.dynamicLowRes=false;t.renderDelay=0;t.fadeDuration=0;t.minSamples=1;
  return {renderer:r,tracer:t,worker:w,backend:'WebGL2'};
 }
 function size(){if(!photoRenderer)return;const w=host.clientWidth||renderer.domElement.clientWidth||900,h=host.clientHeight||renderer.domElement.clientHeight||600;
  if(w===lastWidth&&h===lastHeight)return;lastWidth=w;lastHeight=h;const maxPixels=mobile()?1200000:4000000,ratio=Math.min(globalThis.devicePixelRatio||1,mobile()?1.5:2,Math.sqrt(maxPixels/(w*h)));
  photoRenderer.setPixelRatio(ratio);photoRenderer.setSize(w,h,false);tracer?.updateCamera();steps=0;
 }
 async function prepare(){
  if(disposed||busy||!enabled||renderer.xr.isPresenting)return;busy=true;controls.setAttribute('aria-busy','true');const current=++token,buildKey=sceneKey;say('מכין תאורה מציאותית…','Preparing photo lighting…');
  try{
   if(!tracer){const result=await (backendFactory||createBackend)();if(disposed||current!==token){release(result.tracer,result.worker,result.renderer);return;}tracer=result.tracer;photoRenderer=result.renderer;worker=result.worker||null;backend=result.backend;
    photoRenderer.toneMapping=renderer.toneMapping;photoRenderer.toneMappingExposure=renderer.toneMappingExposure;photoRenderer.outputColorSpace=THREE.SRGBColorSpace;canvas=photoRenderer.domElement;canvas.className='photo-canvas';canvas.style.visibility='hidden';host.append(canvas);lastWidth=lastHeight=0;size();
   }
   snapshot?.dispose();snapshot=createPhotoScene(scene,{maxTriangles:mobile()?900000:2500000});
   if(backend==='WebGL2')await tracer.setSceneAsync(snapshot.scene,camera);else tracer.setScene(snapshot.scene,camera);
   if(disposed||current!==token)return;dirty=sceneKey!==buildKey;steps=0;say('התמונה מתנקה בהדרגה…','Image refining progressively…');
  }catch(error){if(disposed||current!==token)return;lastError=error instanceof PhotoSceneLimit?'complex':'unsupported';enabled=false;cleanup();updateButton();say(lastError==='complex'?'הסצנה גדולה לצילום במכשיר הזה; נסה קומה או דירה':'צילום לא זמין במכשיר הזה — הסיור ו־VR נשארו זמינים',lastError==='complex'?'Select a floor or apartment for photo mode':'Photo mode unavailable; live tour and VR remain available');}
  finally{if(current===token){busy=false;controls.setAttribute('aria-busy','false');}}
 }
 const onXR=()=>{hide();cleanup();stableAt=performance.now();if(enabled)say('VR · תצוגה סטריאוסקופית בזמן אמת','VR · real-time stereo');};renderer.xr.addEventListener('sessionstart',onXR);renderer.xr.addEventListener('sessionend',onXR);
 const onPointer=()=>{stableAt=performance.now();hide();};host.addEventListener('pointerdown',onPointer);host.addEventListener('wheel',onPointer,{passive:true});
 return {
  render(now=performance.now(),{suspend=false}={}){
   if(lastLang!==lang())updateButton();if(disposed||!enabled)return false;if(renderer.xr.isPresenting||suspend){hide();stableAt=now;return false;}
   const cameraNext=photoCameraSignature(camera);if(cameraNext!==cameraKey){cameraKey=cameraNext;stableAt=now;hide();if(!busy)tracer?.updateCamera();steps=0;}
   if(now-lastCheck>350){lastCheck=now;const key=photoSceneSignature(scene);if(key!==sceneKey){sceneKey=key;dirty=true;stableAt=now;hide();}}
   if(now-stableAt<1100||busy)return false;
   if(dirty||!tracer){void prepare();return false;}
   try{size();tracer.renderSample();steps++;if(steps>1)canvas.style.visibility='visible';
    if(now-lastStatus>1200){lastStatus=now;say('איכות צילום · '+backend+' · השאר את המבט יציב','Photo quality · '+backend+' · keep the view still');}
    return true;
   }catch{lastError='unsupported';off();say('חזרנו לסיור בזמן אמת','Returned to live rendering');return false;}
  },capture(){return enabled&&canvas?.style.visibility==='visible'?canvas.toDataURL('image/png'):null;},
  dispose(){disposed=true;enabled=false;cleanup();controls.remove();renderer.xr.removeEventListener('sessionstart',onXR);renderer.xr.removeEventListener('sessionend',onXR);host.removeEventListener('pointerdown',onPointer);host.removeEventListener('wheel',onPointer);}
 };
}
