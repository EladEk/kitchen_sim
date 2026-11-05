import * as THREE from 'three';
import {loadSurfaceTexture} from './surface-detail.mjs';
import {installBuildingSurfaceUVs} from '../src/building-surface-uvs.mjs';

export function createScanMaterialController({scans,mobile=false,signal,loader=loadSurfaceTexture}={}){
 const maps=new Map(),sharedTextures=new Map(),owned=new Set(),bound=new Set(),pending=new Set();let disposed=false;
 async function load(kind,onProgress=()=>{}){
  if(maps.has(kind))return maps.get(kind);const p=scans[kind];
  const task=(async()=>{const out={};
   // Bound concurrent image decoding and transient canvas memory to one scan.
   const channels=['color','normal','roughness'].filter(channel=>p[channel]);let done=0;for(const channel of channels){if(disposed||signal?.aborted)break;if(!p[channel])continue;
    const sharedKey=JSON.stringify([p[channel],channel,p.metres,!!p.naturalColor]);if(sharedTextures.has(sharedKey)){out[channel]=sharedTextures.get(sharedKey);onProgress(++done/channels.length);continue;}
    const texture=await loader(p[channel],{signal,pending,onProgress:fraction=>onProgress((done+fraction)/channels.length)});if(!texture||disposed){texture?.dispose();continue;}
    const source=texture.image,max=mobile?512:1024;
    if(!texture.isCompressedTexture&&typeof document!=='undefined'&&(channel==='color'&&!p.naturalColor||Math.max(source.width,source.height)>max)){const canvas=document.createElement('canvas'),ratio=Math.min(1,max/Math.max(source.width,source.height));canvas.width=Math.max(1,Math.round(source.width*ratio));canvas.height=Math.max(1,Math.round(source.height*ratio));const context=canvas.getContext('2d');if(context){context.drawImage(source,0,0,canvas.width,canvas.height);if(channel==='color'&&!p.naturalColor){
      // Remove the scan's average tint, retaining measured grain and weave.
      // The selected finish remains the albedo authority, including dark wood.
      const pixels=context.getImageData(0,0,canvas.width,canvas.height),data=pixels.data,mean=[0,0,0],count=data.length/4;for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)mean[c]+=data[i+c]/count;for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)data[i+c]=Math.min(255,236*data[i+c]/Math.max(1,mean[c]));context.putImageData(pixels,0,0);
     }texture.image=canvas;}}
    texture.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.setScalar(1/p.metres);texture.anisotropy=mobile?4:8;texture.generateMipmaps=!texture.isCompressedTexture;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.needsUpdate=true;owned.add(texture);sharedTextures.set(sharedKey,texture);out[channel]=texture;onProgress(++done/channels.length);
   }return out;
  })();maps.set(kind,task);return task;
 }
 async function apply(root,{onProgress=()=>{}}={}){
  if(disposed||signal?.aborted)return;
  const groups=new Map();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean)){const kind=m.userData?.surfaceKind||m.userData?.scanKind;if(!scans[kind]||m.userData.productId||bound.has(m))continue;if(!groups.has(kind))groups.set(kind,new Set());groups.get(kind).add(m);}});
  let finished=0;onProgress(0);for(const [kind,materials] of groups){const p=scans[kind],textures=await load(kind,fraction=>onProgress((finished+fraction)/groups.size));if(disposed||signal?.aborted)return;
   for(const m of materials){if(bound.has(m))continue;if(textures.color){m.map=textures.color;if(p.naturalColor)m.color.set('#ffffff');}if(textures.normal){m.normalMap=textures.normal;m.normalScale.setScalar(p.strength);m.bumpMap=null;}if(textures.roughness)m.roughnessMap=textures.roughness;m.roughness=p.rough;m.metalness=0;m.envMapIntensity=p.environment;if(m.isMeshPhysicalMaterial&&kind==='fabric'){m.sheen=.85;m.sheenRoughness=.85;m.sheenColor.copy(m.color);m.specularIntensity=.3;m.clearcoat=0;}m.userData.scannedPBR={revision:106,source:p.source||'Poly Haven',metres:p.metres,...(p.technique?{technique:p.technique}:{})};installBuildingSurfaceUVs(m);m.needsUpdate=true;bound.add(m);}
   onProgress(++finished/groups.size);
  }
  if(!disposed&&!signal?.aborted)onProgress(1);
 }
 return {apply,get textures(){return [...owned];},get stats(){return {textures:owned.size,materials:bound.size};},dispose(){if(disposed)return;disposed=true;for(const cancel of [...pending])cancel();pending.clear();for(const t of owned){t.dispose();if(t.image?.getContext)t.image.width=t.image.height=0;if(t.source)t.source.data=null;}owned.clear();maps.clear();sharedTextures.clear();bound.clear();}};
}
