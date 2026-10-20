// Remove a bounded broad lighting slope from the owner's phone photograph.
// No generated grain, blur, sharpening or mirrored pattern is introduced.
// This is an illumination estimate, not calibrated material reflectance.
export const PHOTO_LIGHTING_GAIN_LIMIT=.15;
const linear=Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const srgb=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));
export function prepareFloorPhoto(pixels,size){
 if(pixels.length!==size*size*4||size<2)throw Error('Invalid floor photograph dimensions');
 let mean=0,slopeX=0,slopeY=0,variance=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,u=(x+.5)/size-.5,v=(y+.5)/size-.5;
  const l=.2126*linear[pixels[i]]+.7152*linear[pixels[i+1]]+.0722*linear[pixels[i+2]];
  mean+=l;slopeX+=u*l;slopeY+=v*l;variance+=u*u;
 }
 mean/=size*size;slopeX/=variance;slopeY/=variance;
 const color=new Uint8Array(pixels),low=1-PHOTO_LIGHTING_GAIN_LIMIT,high=1+PHOTO_LIGHTING_GAIN_LIMIT;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,illumination=mean+slopeX*((x+.5)/size-.5)+slopeY*((y+.5)/size-.5);
  const gain=Math.max(low,Math.min(high,mean/Math.max(.0001,illumination)));
  for(let c=0;c<3;c++)color[i+c]=Math.min(255,srgb(linear[pixels[i+c]]*gain));
 }
 return {color,lightingCorrection:{method:'bounded-linear-light-plane',maxGain:high,minGain:low,calibrated:false}};
}
