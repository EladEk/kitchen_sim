import {trackSceneAsset} from './scene-loading.mjs';
import {orderedSurface} from './ordered-flooring.mjs';
import {prepareFloorPhoto} from './floor-photo-preparation.mjs';
const tasks=new Map();
export function orderedFloorPhotoData(productId){
 const photo=orderedSurface(productId)?.photo;
 if(!photo||typeof Image==='undefined'||typeof document==='undefined')return null;
 const key=photo.image+':'+(photo.rotate||0);
 if(!tasks.has(key))tasks.set(key,trackSceneAsset(new Promise((resolve,reject)=>{
  const image=new Image();
  image.onerror=()=>{tasks.delete(key);reject(Error('The source product image could not load: '+productId));};
  image.onload=()=>{
   try{
    const {size}=photo,sample=photo.runtimeSample||photo.sample,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw Error('Texture canvas unavailable');
    // The plank's native long axis is horizontal; floor UV v follows its 60 cm
    // length. Rotate the source sampling, never the physical tile grid.
    if(photo.rotate){context.translate(size/2,size/2);context.rotate(photo.rotate*Math.PI/180);context.drawImage(image,...sample,-size/2,-size/2,size,size);}
    else context.drawImage(image,...sample,0,0,size,size);
    const pixels=context.getImageData(0,0,size,size).data,prepared=productId==='dry-floor'?prepareFloorPhoto(pixels,size):{color:new Uint8Array(pixels)},height=new Uint8Array(pixels.length),roughness=new Uint8Array(pixels.length);
    // Actual flecks/mottling with bounded broad-lighting correction for the
    // owner's photo only. Catalogue RGB and the flat height remain unchanged.
    for(let i=0;i<pixels.length;i+=4){height.set([128,128,128,255],i);roughness.set([245,245,245,255],i);}
    resolve({size,...prepared,height,roughness,textureBasis:photo.textureBasis});
   }catch(error){tasks.delete(key);reject(error);}
  };
  image.src=photo.runtimeImage||photo.image;
 })));
 return tasks.get(key);
}
