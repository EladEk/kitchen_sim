// Recover mobile GPU contexts without replacing the scene with another plan.
// Visibility and bfcache events never move the camera or change user settings.
export function createRestartBudget({now=Date.now,limit=2,windowMs=30000}={}){
 let attempts=[];return {allow(automatic=false){if(!automatic)return true;const time=now();attempts=attempts.filter(t=>time-t<windowMs);if(attempts.length>=limit)return false;attempts.push(time);return true;}};
}
export function bindSceneLifecycle({canvas,renderer,windowTarget=window,documentTarget=document,onLost,onSuspend,onResume,onRestart,schedule=setTimeout,cancel=clearTimeout,retryMs=1400}){
 let disposed=false,lost=false,timer=null;
 const visible=()=>documentTarget.visibilityState!=='hidden';
 const clear=()=>{if(timer!==null)cancel(timer);timer=null;};
 const recover=delay=>{clear();if(disposed||!visible())return;timer=schedule(()=>{timer=null;if(!disposed&&visible())onRestart();},delay);};
 const contextLost=()=>{try{return renderer.getContext().isContextLost();}catch{return true;}};
 const loss=event=>{event?.preventDefault();if(disposed)return;lost=true;onSuspend();onLost();recover(retryMs);};
 const restored=()=>{if(disposed||!lost)return;recover(0);};
 const resume=()=>{if(disposed)return;if(!visible()){clear();onSuspend();return;}if(lost||contextLost()){if(!lost){lost=true;onLost();}recover(contextLost()?retryMs:0);}else onResume();};
 const hide=()=>{clear();onSuspend();};
 canvas.addEventListener('webglcontextlost',loss);canvas.addEventListener('webglcontextrestored',restored);documentTarget.addEventListener('visibilitychange',resume);windowTarget.addEventListener('pagehide',hide);windowTarget.addEventListener('pageshow',resume);
 return {dispose(){disposed=true;clear();canvas.removeEventListener('webglcontextlost',loss);canvas.removeEventListener('webglcontextrestored',restored);documentTarget.removeEventListener('visibilitychange',resume);windowTarget.removeEventListener('pagehide',hide);windowTarget.removeEventListener('pageshow',resume);}};
}
export function saveScenePose(runtime,key){
 return {key,position:runtime.camera.position.clone(),quaternion:runtime.camera.quaternion.clone(),target:runtime.controls.target.clone(),minDistance:runtime.controls.minDistance,maxDistance:runtime.controls.maxDistance,maxPolarAngle:runtime.controls.maxPolarAngle,...Object.fromEntries(['floor','baseY','cars','riding','stair','yaw','pitch'].filter(k=>k in runtime).map(k=>[k,runtime[k]]))};
}
export function restoreScenePose(runtime,pose,key){
 if(!runtime||!pose||pose.key!==key)return false;runtime.camera.position.copy(pose.position);runtime.camera.quaternion.copy(pose.quaternion);runtime.controls.target.copy(pose.target);for(const k of ['minDistance','maxDistance','maxPolarAngle'])runtime.controls[k]=pose[k];for(const k of ['floor','baseY','cars','riding','stair','yaw','pitch'])if(k in pose)runtime[k]=pose[k];if(runtime.controls.enabled)runtime.controls.update();runtime.publish?.();return true;
}
export function releaseSceneRenderer(renderer){
 renderer.setAnimationLoop(null);renderer.dispose();
 // Dispose GPU context as well as Three objects when replacing a canvas.
 // Otherwise repeat navigation can exhaust the browser's context limit.
 try{renderer.forceContextLoss();}catch{}
 renderer.domElement.remove();
}
