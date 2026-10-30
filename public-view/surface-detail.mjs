import * as THREE from 'three';

const profiles={limestone:[.87,.0018,1],porcelain:[.58,.00035,1],cement:[.91,.0015,1],plaster:[.96,.0006,3],paint:[.65,.00015,3],wood:[.69,.0007,1],fabric:[.99,.0012,8],paving:[.9,.0022,1],asphalt:[.96,.0015,1],grass:[1,.008,1]};
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,s=0)=>fract(Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453);
const smooth=t=>t*t*(3-2*t);
function noise(u,v,n,s){const x=u*n,y=v*n,a=Math.floor(x),b=Math.floor(y),f=smooth(fract(x)),g=smooth(fract(y)),h=(x,y)=>hash((x+n)%n,(y+n)%n,s);return mix(mix(h(a,b),h(a+1,b),f),mix(h(a,b+1),h(a+1,b+1),f),g);}
const bytes=v=>Math.round(Math.max(0,Math.min(255,v)));
const dataCache=new Map(),CACHE_BYTES=8*1024*1024;let cacheBytes=0;
export const surfaceCacheStats=()=>({bytes:cacheBytes,entries:dataCache.size,limit:CACHE_BYTES});
export function clearSurfacePixelCache(){dataCache.clear();cacheBytes=0;}
export function surfacePixels(kind,size=256){
 if(!profiles[kind]||!Number.isInteger(size)||size<16||size>1024)throw new RangeError('Invalid surface profile or size');
 const key=kind+':'+size;if(dataCache.has(key)){const cached=dataCache.get(key);dataCache.delete(key);dataCache.set(key,cached);return cached;}
 const color=new Uint8Array(size*size*4),detail=new Uint8Array(size*size*2);
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
  const i=(y*size+x)*4;color.set([bytes(c-green/2),bytes(c+green/2),bytes(c-green),255],i);detail.set([bytes(h),bytes(r)],(y*size+x)*2);
 }
 const value={color,detail,height:detail,roughness:detail,size},cost=color.byteLength+detail.byteLength;
 while(cacheBytes+cost>CACHE_BYTES&&dataCache.size){const [oldKey,old]=dataCache.entries().next().value;cacheBytes-=old.color.byteLength+old.detail.byteLength;dataCache.delete(oldKey);}
 dataCache.set(key,value);cacheBytes+=cost;return value;
}

export function createSurfaceDetails({mobile=false}={}){
 const maps=new Map(),owned=new Set(),pending=new Set();let disposed=false;
 function get(kind){
  if(disposed)throw new Error('Surface details disposed');
  if(maps.has(kind))return maps.get(kind);
  const data=surfacePixels(kind,mobile?256:512),out={};
  for(const channel of ['color','detail']){const t=new THREE.DataTexture(data[channel],data.size,data.size,channel==='color'?THREE.RGBAFormat:THREE.RGFormat);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.magFilter=THREE.LinearFilter;t.minFilter=THREE.LinearMipmapLinearFilter;t.generateMipmaps=true;t.anisotropy=mobile?4:8;t.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;t.repeat.setScalar(profiles[kind]?.[2]||1);t.needsUpdate=true;out[channel]=t;owned.add(t);}
  out.height=out.roughness=out.detail;maps.set(kind,out);return out;
 }
 function apply(material,kind){const p=profiles[kind];if(!p)return material;const m=get(kind);Object.assign(material,{map:m.color,bumpMap:m.height,roughnessMap:m.roughness,roughness:p[0],bumpScale:p[1]});material.needsUpdate=true;return material;}
 // Bump uses R and roughness uses G: one RG texture preserves both channels.
 async function loadStone(url,{signal}={}){
  if(!url||typeof document==='undefined'||disposed)return;
  const image=await loadSurfaceTexture(url,{signal,pending});
  if(!image)return;if(disposed){image.dispose();return;}
  const size=mobile?512:1024,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  try{
   const ctx=canvas.getContext('2d');if(!ctx)return;
   ctx.drawImage(image.image,0,0,size,size);const pixels=ctx.getImageData(0,0,size,size).data,c=new Uint8Array(pixels),detail=new Uint8Array(size*size*2);let average=0;
   for(let i=0;i<c.length;i+=4)average+=(c[i]*.2126+c[i+1]*.7152+c[i+2]*.0722)/(size*size);
   for(let i=0;i<c.length;i+=4){const value=c[i]*.2126+c[i+1]*.7152+c[i+2]*.0722;detail.set([bytes(128+(value-average)*1.4),bytes(237+Math.max(-12,Math.min(12,(average-value)*.4)))],i/2);}
   const stone=get('limestone');for(const [channel,data] of [['color',c],['detail',detail]]){stone[channel].image={data,width:size,height:size};stone[channel].needsUpdate=true;}
  }finally{image.dispose();if(image.source)image.source.data=null;canvas.width=canvas.height=0;}
 }
 function dispose(){if(disposed)return;disposed=true;for(const cancel of [...pending])cancel();pending.clear();for(const t of owned){t.dispose();t.source.data=null;}owned.clear();maps.clear();}
 return {get,apply,loadStone,dispose,cancel:dispose,get textures(){return [...owned];}};
}

// TextureLoader cannot cancel its network request; settle ownership immediately
// on abort/deadline and dispose any late completion without retaining the scene.
export function loadSurfaceTexture(url,{signal,pending=new Set(),timeoutMs=8000,loader=new THREE.TextureLoader(),schedule=setTimeout,cancel=clearTimeout}={}){
 return new Promise(resolve=>{
  let done=false,timer=null;
  const finish=texture=>{if(done){texture?.dispose();if(texture?.source)texture.source.data=null;return;}done=true;if(timer!==null)cancel(timer);signal?.removeEventListener('abort',abort);pending.delete(abort);resolve(texture);};
  const abort=()=>finish(null);if(signal?.aborted){finish(null);return;}
  signal?.addEventListener('abort',abort,{once:true});pending.add(abort);timer=schedule(abort,timeoutMs);
  try{loader.load(url,finish,undefined,abort);}catch{abort();}
 });
}
