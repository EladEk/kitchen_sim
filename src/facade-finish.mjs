// One public-safe facade recipe, shared by the editable apartment and district.
// The colour follows the existing private apartment's stone finish.
export const FACADE_COLOR='#d9d2c5';
export const FACADE_ROUGHNESS=.96;
const fract=n=>n-Math.floor(n);
const hash=(x,y,s)=>fract(Math.sin(x*127.1+y*311.7+s*19.19)*43758.5453);
export function facadePixels(size=256){
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*2);
 const byte=v=>Math.round(Math.max(0,Math.min(255,v)));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const fine=hash(x,y,7),c=byte(253+(fine-.5)*2),h=128,i=(y*size+x)*4;
  color.set([c,c,c,255],i);height.set([h,h,h,255],i);roughness.set([252,252,252,255],i);detail.set([h,252],i/2);
 }
 return {color,height,roughness,detail,size};
}
