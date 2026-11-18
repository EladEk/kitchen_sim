// The visible sky can be saturated blue without painting ivory stone blue.
// Keep directional radiance/contrast with restrained warm daylight chroma in
// BOTH the live renderer and the photo renderer. No second GPU sky capture.
export function daylightEnvironmentPixels(pixels,{saturation=0,warmGround=false}={}){
 const data=new Float32Array(pixels.data.length);
 for(let i=0;i<data.length;i+=4){
  const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
  const luminance=r*.2126+g*.7152+b*.0722;
  // Equirectangular DataTextures start at the nadir. Retain a little warm
  // ground colour and a gentle sky tint instead of a monochrome hemisphere.
  const chroma=warmGround?Math.max(saturation,i<pixels.width*pixels.height*2?.42:.10):saturation;
  data[i]=luminance+(r-luminance)*chroma;
  data[i+1]=luminance+(g-luminance)*chroma;
  data[i+2]=luminance+(b-luminance)*chroma;
  if(warmGround){data[i]*=1.022;data[i+1]*=.996;data[i+2]*=.968;}
  data[i+3]=pixels.data[i+3];
 }
 return {...pixels,data};
}
