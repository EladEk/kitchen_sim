// One public-safe facade recipe, shared by the editable apartment and district.
// The colour follows the existing private apartment's stone finish.
export const FACADE_COLOR='#e6dfd3';
export const FACADE_ROUGHNESS=.82;
// Metres, shared by live shaders and the progressive photo snapshot.
export const FACADE_COURSES=Object.freeze({width:.94,height:.48,joint:.007,recess:.003,groutShade:.48,toneMin:.91,toneRange:.16});
const fract=n=>n-Math.floor(n);
const hash=(x,y,s)=>fract(Math.sin(x*127.1+y*311.7+s*19.19)*43758.5453);
export function facadeCourseSample(u,v){
 const c=FACADE_COURSES,row=Math.floor(v/c.height),along=u+(row%2)*c.width/2;
 const x=fract(along/c.width)*c.width,y=fract(v/c.height)*c.height,edge=Math.min(x,c.width-x,y,c.height-y);
 const blend=Math.min(1,Math.max(0,(edge-c.joint/2)/.0015));
 const tone=c.toneMin+hash(Math.floor(along/c.width),row,0)*c.toneRange;
 return {shade:c.groutShade+(tone-c.groutShade)*blend,height:c.recess*blend,roughness:blend<1?1:FACADE_ROUGHNESS};
}
export function facadePixels(size=256){
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*2);
 const byte=v=>Math.round(Math.max(0,Math.min(255,v)));
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  // Fine limestone pores, with restrained mottling rather than wet patches.
  const fine=hash(x,y,7),patch=hash(Math.floor(x/6),Math.floor(y/6),11);
  const pore=fine>.965?(fine-.965)/.035:0;
  const c=byte(247+(fine-.5)*8+(patch-.5)*5-pore*30),h=byte(128+(fine-.5)*10-pore*28),i=(y*size+x)*4;
  color.set([c,c,c,255],i);height.set([h,h,h,255],i);roughness.set([252,252,252,255],i);detail.set([h,252],i/2);
 }
 return {color,height,roughness,detail,size};
}
