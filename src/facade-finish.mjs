// One public-safe facade recipe, shared by the editable apartment and district.
// The colour follows the existing private apartment's stone finish.
export const FACADE_COLOR='#d9d2c5';
export const FACADE_ROUGHNESS=.96;
const fract=n=>n-Math.floor(n),mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,s)=>fract(Math.sin(x*127.1+y*311.7+s*19.19)*43758.5453);
function noise(u,v,n,s){const x=u*n,y=v*n,a=Math.floor(x),b=Math.floor(y),fx=fract(x),fy=fract(y),f=fx*fx*(3-2*fx),g=fy*fy*(3-2*fy),h=(x,y)=>hash((x+n)%n,(y+n)%n,s);return mix(mix(h(a,b),h(a+1,b),f),mix(h(a,b+1),h(a+1,b+1),f),g);}
export function facadePixels(size=256){
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*2);
 const byte=v=>Math.round(Math.max(0,Math.min(255,v)));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const n=noise(x/size,y/size,8,3),cloud=noise(x/size,y/size,4,8),fine=hash(x,y,7),c=byte(248+(cloud-.5)*3+(n-.5)*3+(fine-.5)*5),h=byte(128+(n-.5)*8+(fine-.5)*12),i=(y*size+x)*4;
  color.set([c,c,c,255],i);height.set([h,h,h,255],i);roughness.set([252,252,252,255],i);detail.set([h,252],i/2);
 }
 return {color,height,roughness,detail,size};
}
