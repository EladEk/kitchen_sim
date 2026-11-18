import {MEDITERRANEAN_ATMOSPHERE} from './atmosphere-settings.mjs';
import {Color} from 'three';

const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
const rgb=hex=>new Color(hex).toArray();
const blend=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
const palette={day:rgb('#7ea8d8'),horizon:rgb('#e6e4de'),cobalt:rgb('#284f96'),amber:rgb('#f2b37c'),sunset:rgb('#e88052'),night:rgb('#141d2b'),urban:rgb('#2c2a30'),groundHorizon:rgb('#b8afa0'),groundNadir:rgb('#9a9183')};

// Linear HDR clear-sky approximation. Astronomy supplies the real sun vector;
// hour is a deterministic fallback for standalone material previews.
export function analyticSkyState({sunDirection,hour=13.5,turbidity=MEDITERRANEAN_ATMOSPHERE.turbidity}={}){
 const h=Number.isFinite(hour)?hour:13.5,angle=(h-6)/12*Math.PI;
 const raw=sunDirection?.isVector3?sunDirection.toArray():sunDirection||[Math.cos(angle),Math.sin(angle),.25];
 const length=Math.hypot(...raw)||1,sun=raw.map(v=>v/length),elevation=sun[1];
 const day=smooth(.02,.45,elevation),twilight=smooth(-.12,.02,elevation),warm=1-smooth(.02,.45,elevation);
 const sunset=blend(palette.amber,palette.sunset,1-smooth(.02,.2,elevation));
 return {sun,elevation,altitude:Math.asin(clamp(elevation,-1,1)),azimuth:Math.atan2(sun[0],-sun[2]),turbidity:clamp(Number(turbidity)||MEDITERRANEAN_ATMOSPHERE.turbidity,1,10),
  zenith:blend(palette.night,blend(palette.cobalt,palette.day,day),twilight),horizon:blend(palette.urban,blend(sunset,palette.horizon,day),twilight),warm,day,twilight};
}
export function sampleAnalyticSky(state,x,up,z,out=[0,0,0]){
 const s=state;
 if(up<0){
  const t=Math.pow(clamp(-up),.55),energy=.025+.85*Math.sqrt(clamp(s.elevation));
  for(let i=0;i<3;i++)out[i]=(palette.groundHorizon[i]+(palette.groundNadir[i]-palette.groundHorizon[i])*t)*energy;
 }else{
  const mu=clamp(x*s.sun[0]+up*s.sun[1]+z*s.sun[2],-1,1),height=Math.pow(clamp(up),.48),rayleigh=(1+mu*mu)*.012*s.twilight;
  const haze=clamp((s.turbidity-1)/9)*Math.exp(-up*6)*.12;
  const mie=Math.pow(Math.max(0,mu),24)*2.1*s.warm*s.twilight;
  const corona=Math.pow(Math.max(0,mu),1800)*8*s.day;
  for(let i=0;i<3;i++)out[i]=s.horizon[i]+(s.zenith[i]-s.horizon[i])*height+rayleigh*[.35,.65,1][i]+haze+mie*[1,.6,.28][i]+corona*[1,.94,.83][i];
 }
 return out;
}
export function architecturalSkyPixels(options={}, {width=512,height=256}={}){
 const state=analyticSkyState(options),data=new Float32Array(width*height*4),sample=[0,0,0];
 for(let y=0;y<height;y++){
  const theta=(y+.5)/height*Math.PI,up=-Math.cos(theta),ring=Math.sin(theta);
  for(let x=0;x<width;x++){
   const phi=(x+.5)/width*2*Math.PI;
   sampleAnalyticSky(state,-ring*Math.cos(phi),up,-ring*Math.sin(phi),sample);
   data.set([...sample,1],(y*width+x)*4);
  }
 }
 return {data,width,height,state};
}
