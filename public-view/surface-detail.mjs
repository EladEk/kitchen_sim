import * as THREE from 'three';

const profiles={limestone:[.87,.0018,1],porcelain:[.58,.00035,1],cement:[.91,.0015,1],plaster:[.96,.0006,3],paint:[.65,.00015,3],wood:[.69,.0007,1],fabric:[.99,.0012,8],paving:[.9,.0022,1],asphalt:[.96,.0015,1],grass:[1,.008,1]};
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,s=0)=>fract(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453);
const smooth=t=>t*t*(3-2*t);
function noise(u,v,n,s){const x=u*n,y=v*n,a=Math.floor(x),b=Math.floor(y),f=smooth(fract(x)),g=smooth(fract(y)),h=(x,y)=>hash((x+n)%n,(y+n)%n,s);return mix(mix(h(a,b),h(a+1,b),f),mix(h(a,b+1),h(a+1,b+1),f),g);}
const bytes=v=>Math.round(Math.max(0,Math.min(255,v)));
const dataCache=new Map();
export function surfacePixels(kind,size=256){
 const key=kind+':'+size;if(dataCache.has(key))return dataCache.get(key);
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=x/size,v=y/size,n=noise(u,v,12,4),cloud=noise(u,v,4,9),fine=hash(x,y,3);let c=246+(cloud-.5)*9+(fine-.5)*7,h=128+(n-.5)*24+(fine-.5)*20,r=238,green=0;
  if(kind==='limestone'){const pores=fine>.985?-.8:0;c+=pores*32;h+=pores*45;r=235+(n-.5)*12;}
  else if(kind==='porcelain'){c=250+(cloud-.5)*5+(fine-.5)*2;h=128+(fine-.5)*6;r=226+(n-.5)*18;}
  else if(kind==='paving'){c=241+(cloud-.5)*19+(n-.5)*14+(fine-.5)*12;h=128+(fine-.5)*42+(n-.5)*16;r=241+(fine-.5)*12;}
  else if(kind==='asphalt'){const aggregate=fine>.91?18:fine<.16?-12:0;c=238+(cloud-.5)*12+aggregate;h=128+(fine-.5)*58;r=240+(fine-.5)*18;}
  else if(kind==='grass'){const blades=Math.sin(v*Math.PI*240+noise(u,v,8,1)*5);c=224+(cloud-.5)*32+blades*9+(fine-.5)*14;h=128+blades*30+(fine-.5)*35;r=251;green=8;}
  else if(kind==='wood'){const grain=Math.sin(u*Math.PI*140+noise(u,v,8,3)*7);c=240+(cloud-.5)*12+grain*8;h=128+grain*16;r=225+(n-.5)*20;}
  else if(kind==='fabric'){const weave=Math.sin(x*Math.PI/2)*Math.cos(y*Math.PI/2);c=246+weave*5+(n-.5)*5;h=128+weave*35+(fine-.5)*12;r=250;}
  else if(kind==='plaster'||kind==='paint'){c=251+(cloud-.5)*4+(fine-.5)*3;h=128+(fine-.5)*(kind==='plaster'?28:8);r=kind==='plaster'?249:226;}
  const i=(y*size+x)*4;color.set([bytes(c-green/2),bytes(c+green/2),bytes(c-green),255],i);height.set([bytes(h),bytes(h),bytes(h),255],i);roughness.set([bytes(r),bytes(r),bytes(r),255],i);
 }
 const value={color,height,roughness,size};dataCache.set(key,value);return value;
}

export function createSurfaceDetails({mobile=false}={}){
 const maps=new Map(),owned=new Set();let disposed=false;
 function get(kind){
  if(maps.has(kind))return maps.get(kind);
  const data=surfacePixels(kind,mobile?256:512),out={};
  for(const channel of ['color','height','roughness']){const t=new THREE.DataTexture(data[channel],data.size,data.size,THREE.RGBAFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=mobile?4:8;t.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.repeat.setScalar(profiles[kind]?.[2]||1);t.needsUpdate=true;out[channel]=t;owned.add(t);}
  maps.set(kind,out);return out;
 }
 function apply(material,kind){const p=profiles[kind];if(!p)return material;const m=get(kind);Object.assign(material,{map:m.color,bumpMap:m.height,roughnessMap:m.roughness,roughness:p[0],bumpScale:p[1]});material.needsUpdate=true;return material;}
 // All three channels are sampled from the same generated albedo, giving
 // pores matching relief/roughness. Canvas is only used to prepare GPU maps.
 async function loadStone(url){
  if(!url||typeof document==='undefined')return;
  const image=await new Promise(resolve=>{new THREE.TextureLoader().load(url,t=>resolve(t),undefined,()=>resolve(null));});
  if(!image)return;if(disposed){image.dispose();return;}
  const size=mobile?512:1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;const ctx=canvas.getContext('2d');
  if(ctx){ctx.drawImage(image.image,0,0,size,size);const pixels=ctx.getImageData(0,0,size,size).data,c=new Uint8Array(pixels),h=new Uint8Array(pixels.length),r=new Uint8Array(pixels.length);let average=0;
   for(let i=0;i<c.length;i+=4)average+=(c[i]*.2126+c[i+1]*.7152+c[i+2]*.0722)/(size*size);
   for(let i=0;i<c.length;i+=4){const value=c[i]*.2126+c[i+1]*.7152+c[i+2]*.0722,relief=bytes(128+(value-average)*1.4),rough=bytes(237+Math.max(-12,Math.min(12,(average-value)*.4)));h.set([relief,relief,relief,255],i);r.set([rough,rough,rough,255],i);}
   const stone=get('limestone');for(const [channel,data] of [['color',c],['height',h],['roughness',r]]){stone[channel].image={data,width:size,height:size};stone[channel].needsUpdate=true;}
  }image.dispose();
 }
 return {get,apply,loadStone,dispose(){disposed=true;for(const t of owned)t.dispose();},cancel(){disposed=true;},get textures(){return [...owned];}};
}
