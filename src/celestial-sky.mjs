import {getMoonPosition,getMoonIllumination} from 'suncalc';
import {normalizeSolar,solarPosition,israelDate,israelUtcOffset,lampsOnly} from './solar-lighting.mjs';
const RAD=Math.PI/180,clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function israelClock(now=new Date()){
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now).map(p=>[p.type,p.value]));
 return {date:israelDate(now),minutes:Number(parts.hour)*60+Number(parts.minute)};
}
export function effectiveSolar(value,now=new Date()){
 const s=normalizeSolar(value);return s.live?{...s,...israelClock(now)}:s;
}
export function skyDirection(azimuth,elevation,northBearing=0,kitchen=false){
 const a=(azimuth-northBearing)*RAD,h=elevation*RAD,f=kitchen?-1:1;
 return [f*Math.sin(a)*Math.cos(h),Math.sin(h),-f*Math.cos(a)*Math.cos(h)];
}
export function celestialState(settings={},now=new Date(),{kitchen=false}={}){
 const solar=effectiveSolar(settings.solar,now),[y,m,d]=solar.date.split('-').map(Number),offset=israelUtcOffset(solar.date,solar.minutes),wall=Date.UTC(y,m-1,d,Math.floor(solar.minutes/60),solar.minutes%60);
 const instant=solar.live?new Date(Math.floor(now.getTime()/60000)*60000):new Date(wall-offset*3600000);
 const actualOffset=(wall-instant.getTime())/3600000;
 const sun=solarPosition(solar,actualOffset),moon=getMoonPosition(instant,solar.latitude,solar.longitude),illumination=getMoonIllumination(instant),dark=lampsOnly(settings);
 const daylight=clamp(Math.sin(sun.elevation*RAD),0,1),twilight=clamp((sun.elevation+12)/12,0,1),moonUp=moon.altitude>0;
 return {solar,instant,sun:{...sun,direction:skyDirection(sun.azimuth,sun.elevation,solar.northBearing,kitchen)},moon:{...moon,elevation:moon.altitude,aboveHorizon:moonUp,direction:skyDirection(moon.azimuth,moon.altitude,solar.northBearing,kitchen),fraction:illumination.fraction,phase:illumination.phase,limbAngle:(illumination.angle-moon.parallacticAngle)*RAD,angularRadius:Math.asin(1737.4/moon.distance)},dark,daylight,twilight,
  sunIntensity:dark?0:daylight>0?3*Math.sqrt(daylight):0,
  moonIntensity:dark?0:moonUp?.025*illumination.fraction*clamp((6-sun.elevation)/12,0,1):0,
  environmentIntensity:dark?0:Math.max(.015,daylight*1.15+twilight*.09),
  settings:{...settings,solar}};
}
// Analytic all-sky HDR. Sun and Moon directions/phase are astronomical;
// atmospheric colours/clouds/stars illustrate a clear sky, not live weather.
export function skyPixels(state,{width=1024,height=512}={}){
 const data=new Float32Array(width*height*4),sun=state.sun.direction,moon=state.moon.direction;
 const day=clamp(state.sun.elevation/18,0,1),twilight=state.twilight,night=1-clamp((state.sun.elevation+8)/14,0,1),warm=Math.exp(-Math.pow((state.sun.elevation-1)/9,2));
 const cx=Math.cos(state.moon.limbAngle),sx=Math.sin(state.moon.limbAngle),phaseCos=2*state.moon.fraction-1,phaseSin=Math.sqrt(Math.max(0,1-phaseCos*phaseCos));
 let right=[-moon[2],0,moon[0]],len=Math.hypot(...right);right=right.map(v=>v/Math.max(len,1e-8));const up=[right[1]*moon[2]-right[2]*moon[1],right[2]*moon[0]-right[0]*moon[2],right[0]*moon[1]-right[1]*moon[0]];
 // Orthonormal camera-facing disk basis. Orientation follows the bright-limb zenith angle.
 const sunRadius=.2666*RAD,moonRadius=state.moon.angularRadius;
 const sinPhi=new Float32Array(width),cosPhi=new Float32Array(width);
 for(let x=0;x<width;x++){const phi=(x+.5)/width*Math.PI*2;sinPhi[x]=Math.sin(phi);cosPhi[x]=Math.cos(phi);}
 for(let y=0;y<height;y++){
  const theta=(y+.5)/height*Math.PI,dy=-Math.cos(theta),ring=Math.sin(theta),horizon=Math.exp(-Math.abs(dy)*7);
  for(let x=0;x<width;x++){
   const dx=-ring*cosPhi[x],dz=-ring*sinPhi[x],sunDot=dx*sun[0]+dy*sun[1]+dz*sun[2],moonDot=dx*moon[0]+dy*moon[1]+dz*moon[2];
   let r,g,b;
   if(state.dark){r=.0003;g=.0005;b=.001;}
   else if(dy<0){r=.025*day+.001;g=.027*day+.001;b=.025*day+.002;}
   else{
    r=.16*day+.002*night+horizon*(.29*day+.16*twilight+warm*.2);
    g=.31*day+.004*night+horizon*(.26*day+.09*twilight+warm*.06);
    b=.62*day+.012*night+horizon*(.16*day+.08*twilight);
    const glow=state.sun.elevation>-12?Math.pow(Math.max(0,sunDot),48)*(.15*day+.5*warm):0;
    r+=glow;g+=glow*(1-.5*warm);b+=glow*(1-.85*warm);
    if(state.sun.elevation>-.3&&sunDot>Math.cos(sunRadius)){
     const radiance=14;r+=radiance;g+=radiance*(.95-.55*warm);b+=radiance*(.85-.72*warm);
    }
    if(state.moon.elevation>-.3&&moonDot>Math.cos(moonRadius)){
     const nx=(dx*right[0]+dy*right[1]+dz*right[2])/Math.sin(moonRadius),ny=(dx*up[0]+dy*up[1]+dz*up[2])/Math.sin(moonRadius),nz=Math.sqrt(Math.max(0,1-nx*nx-ny*ny));
     const lit=Math.max(0,(nx*sx+ny*cx)*phaseSin+nz*phaseCos),earthshine=.015*(1-state.moon.fraction),shade=lit+earthshine;
     r+=shade*.8;g+=shade*.85;b+=shade*.95;
    }
    const hash=Math.abs(Math.sin(x*127.1+y*311.7)*43758.5453)%1;
    if(night>.1&&hash>.99935){const star=(hash-.99935)/.00065*night*.45;r+=star;g+=star;b+=star*1.15;}
   }
   data.set([r,g,b,1],(y*width+x)*4);
  }
 }
 return {data,width,height};
}
