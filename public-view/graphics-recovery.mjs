// WebGPU device-loss policy. Pure state so DistrictViewer can keep it across
// renderer restarts and tests can drive it without a GPU.
//  1st loss            -> recreate the WebGPU renderer/device, restore the pose
//  2nd loss in 10 min  -> fall back to WebGL2 and remember it for this device
// A remembered fallback expires after 14 days or when the user picks WebGPU again.
export const WEBGPU_UNSTABLE_KEY='homestudio-webgpu-unstable';
export const LOSS_WINDOW_MS=10*60*1000;
export const UNSTABLE_TTL_MS=14*24*60*60*1000;
export const RECOVERY_MESSAGES=Object.freeze({
 'retry-webgpu':'החיבור למעבד הגרפי אבד. משחזר את התצוגה ואת המיקום שלכם…',
 'fallback-webgl2':'המעבד הגרפי נעצר שוב. עוברים למצב תאימות WebGL2 כדי שהסיור ימשיך…'
});
export function nextDeviceLossAction(losses=[],{now=Date.now(),engine='webgpu'}={}){
 const recent=losses.filter(t=>Number.isFinite(t)&&now-t>=0&&now-t<LOSS_WINDOW_MS).concat(now);
 if(engine!=='webgpu')return {action:'report',losses:recent};
 return {action:recent.length<=1?'retry-webgpu':'fallback-webgl2',losses:recent};
}
export function readWebGPUUnstable(storage,now=Date.now()){
 try{const raw=storage?.getItem(WEBGPU_UNSTABLE_KEY);if(!raw)return false;const at=Number(JSON.parse(raw)?.at);if(Number.isFinite(at)&&now-at>=0&&now-at<UNSTABLE_TTL_MS)return true;storage.removeItem(WEBGPU_UNSTABLE_KEY);return false;}catch{return false;}
}
export function markWebGPUUnstable(storage,now=Date.now(),reason='device-lost'){
 try{storage?.setItem(WEBGPU_UNSTABLE_KEY,JSON.stringify({at:now,reason:String(reason).slice(0,80)}));}catch{}
}
export function clearWebGPUUnstable(storage){try{storage?.removeItem(WEBGPU_UNSTABLE_KEY);}catch{}}
