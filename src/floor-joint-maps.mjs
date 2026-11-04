import * as THREE from 'three';
// Texture-space equivalent of the live generic floor shader for path tracing.
// Ordered product photos are never substituted with this inferred material.
export function floorJointMaps({tile=[.8,.8],joint=.004,size=512}={}){
 const color=new Uint8Array(size*size*4),bump=new Uint8Array(color.length),rough=new Uint8Array(color.length);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const edge=Math.min(Math.min(x,size-x)*tile[0]/size,Math.min(y,size-y)*tile[1]/size),coverage=Math.max(0,Math.min(1,.5+(joint/2-edge)/(Math.min(...tile)/size))),bevel=Math.max(0,Math.min(1,(joint/2+.0012-edge)/.0012)),noise=Math.sin(x*12.9898+y*78.233)*43758.5453,grain=noise-Math.floor(noise),i=(y*size+x)*4;
  const c=Math.round((247+grain*6)*(1-coverage*.38)),b=Math.round(180-bevel*80+(grain-.5)*2),r=Math.round((.56*(1-coverage)+.92*coverage)*255);
  color.set([c,c,c,255],i);bump.set([b,b,b,255],i);rough.set([r,r,r,255],i);
 }
 const make=(data,srgb=false)=>{const t=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1/tile[0],1/tile[1]);t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.colorSpace=srgb?THREE.SRGBColorSpace:THREE.NoColorSpace;t.needsUpdate=true;return t;};
 return {map:make(color,true),bumpMap:make(bump),roughnessMap:make(rough)};
}
