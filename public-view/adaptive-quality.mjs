const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Time-based hysteresis avoids reacting to loading, tab suspension or one slow
// frame. Lower quality in small steps; require a long clear interval to recover.
export function createAdaptiveQuality({mobile=false,pixelRatio=1,mode='auto'}={}){
 let scale=1,previous=0,average=0,slow=0,fast=0,settling=2500,currentMode=['auto','quality','performance'].includes(mode)?mode:'auto';
 const maximum=Math.min(pixelRatio,mobile?1.25:1.8);
 function profile(){
  const value=currentMode==='quality'?1:currentMode==='performance'?.66:scale;
  const tier=value>.89?0:value>.77?1:value>.65?2:3;
  return {scale:value,tier,ratio:Math.max(.6,maximum*value),shadowSize:(mobile?[2048,1024,1024,512]:[4096,2048,1024,512])[tier],shadowInterval:[0,50,90,140][tier],detailScale:[1,.85,.65,.5][tier],effects:tier<2};
 }
 return {
  get profile(){return profile();},get mode(){return currentMode;},
  ratioForSize(width,height){return Math.min(profile().ratio,Math.sqrt((mobile?1400000:3200000)/Math.max(1,width*height)));},
  setMode(value){currentMode=['auto','quality','performance'].includes(value)?value:'auto';this.reset();return profile();},
  reset(){previous=0;average=slow=fast=0;settling=2500;},
  sample(now,{paused=false,xr=false}={}){
   const dt=previous?now-previous:0;previous=now;
   if(paused||xr||!Number.isFinite(dt)||dt<=0||dt>250){average=slow=fast=0;return false;}
   if(currentMode!=='auto')return false;
   average=average?average+(dt-average)*(1-Math.exp(-dt/650)):dt;
   if(settling>0){settling-=dt;return false;}
   const bad=22,good=17;
   slow=average>bad?slow+dt:Math.max(0,slow-dt*2);
   fast=average<good?fast+dt:0;
   const before=scale;
   if(slow>1900){scale=clamp(Math.round((scale-.08)*100)/100,.58,1);slow=fast=0;settling=1700;}
   else if(fast>12000){scale=clamp(Math.round((scale+.04)*100)/100,.58,1);slow=fast=0;settling=2500;}
   return scale!==before;
  }
 };
}
