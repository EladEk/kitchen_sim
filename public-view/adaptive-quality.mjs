const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Time-based hysteresis avoids reacting to loading, tab suspension or one slow
// frame. Lower quality in small steps; require a long clear interval to recover.
// Mobile tile-based GPUs (Mali/Adreno/PowerVR/Xclipse) share system memory with the
// browser. A high-DPR phone in "quality" mode used to get desktop tier 0: full
// post effects, 2048 shadows and no adaptation, until the GPU process was killed.
const MOBILE_GPU=/\b(arm|mali|qualcomm|adreno|imagination|powervr|samsung|xclipse)\b/i;
export function isLowEndGpu({mobile=false,vendor='',architecture='',description='',deviceMemory=8}={}){
 if(!mobile)return false;
 return MOBILE_GPU.test([vendor,architecture,description].join(' '))||Number(deviceMemory)<=4;
}
export function gpuInfoOf(renderer){
 try{const b=renderer?.backend,info=b?.device?.adapterInfo||b?.adapter?.info||{};return {vendor:info.vendor||'',architecture:info.architecture||'',description:info.description||''};}catch{return {vendor:'',architecture:'',description:''};}
}
// Effective device-pixel cap: phones never render above 1.25x (1.0x on low-end
// GPUs) regardless of a 3x+ screen, and a pixel budget bounds the target size.
export function mobilePixelRatio({mobile=false,lowEnd=false,pixelRatio=1}={}){
 return Math.min(Number(pixelRatio)||1,2,mobile?(lowEnd?1:1.25):1.8);
}
export function createAdaptiveQuality({mobile=false,pixelRatio=1,mode='auto',lowEnd=false}={}){
 lowEnd=!!(mobile&&lowEnd);
 let scale=mobile?.84:1,guard=1,previous=0,average=0,slow=0,fast=0,settling=2500,currentMode=['auto','quality','performance'].includes(mode)?mode:'auto';
 const maximum=mobilePixelRatio({mobile,lowEnd,pixelRatio});
 function profile(){
  // Phones keep a safety guard even in "quality": sustained multi-second frames step it down.
  const value=currentMode==='quality'?(mobile?guard:1):currentMode==='performance'?.66:Math.min(scale,mobile?guard:1);
  let tier=mobile&&currentMode==='auto'?1:value>.89?0:value>.77?1:value>.65?2:3;
  if(lowEnd)tier=Math.max(1,tier);else if(mobile&&value<1)tier=Math.max(1,tier);
  // Low-end mobile: no screen-space GI/AO/SSR or room reflection probes (large
  // half-float targets); desktop keeps effects through tier 1 exactly as before.
  const effects=lowEnd?false:tier<2;
  return {scale:value,tier,lowEnd,ratio:Math.max(.6,maximum*Math.min(1,value)),shadowSize:(lowEnd?[1024,1024,512,512]:mobile?[2048,1024,1024,512]:[4096,2048,1024,512])[tier],shadowInterval:[0,50,90,140][tier],detailScale:[1,.85,.65,.5][tier],effects};
 }
 return {
  get profile(){return profile();},get mode(){return currentMode;},
  ratioForSize(width,height){return Math.min(profile().ratio,Math.sqrt((lowEnd?700000:mobile?1400000:3200000)/Math.max(1,width*height)));},
  setMode(value){currentMode=['auto','quality','performance'].includes(value)?value:'auto';this.reset();return profile();},
  reset(){previous=0;average=slow=fast=0;settling=2500;},
  sample(now,{paused=false,xr=false}={}){
   const dt=previous?now-previous:0;previous=now;
   if(paused||xr||!Number.isFinite(dt)||dt<=0||dt>250){average=slow=fast=0;return false;}
   average=average?average+(dt-average)*(1-Math.exp(-dt/650)):dt;
   if(currentMode!=='auto'){
    // Mobile "quality": only react to a device that is clearly drowning (≈<12 fps for 3 s).
    if(!mobile||currentMode!=='quality')return false;
    if(settling>0){settling-=dt;return false;}
    slow=average>85?slow+dt:Math.max(0,slow-dt*2);
    if(slow>3000&&guard>.66){guard=Math.round((guard-.12)*100)/100;slow=0;settling=2500;return true;}
    return false;
   }
   if(settling>0){settling-=dt;return false;}
   const bad=mobile?38:22,good=mobile?25:17;
   slow=average>bad?slow+dt:Math.max(0,slow-dt*2);
   fast=average<good?fast+dt:0;
   const before=scale;
   if(slow>1900){scale=clamp(Math.round((scale-.08)*100)/100,.58,1);slow=fast=0;settling=1700;}
   else if(fast>12000){scale=clamp(Math.round((scale+.04)*100)/100,.58,mobile?.84:1);slow=fast=0;settling=2500;}
   return scale!==before;
  }
 };
}
