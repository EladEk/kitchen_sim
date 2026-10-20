// Bitmap texture detail is integrated into the actual Three.js materials.
// Nothing in this module alters survey geometry or source photographs.
export const MATERIAL_ATLAS='/materials/interior-atlas-r22.png';
export const PHOTO_MATERIALS={stone:{cell:[0,0],repeat:.4},wood:{cell:[1,0],repeat:1},porcelain:{cell:[0,1],repeat:1},fabric:{cell:[1,1],repeat:6},terrace:{cell:[1,0],repeat:1.5}};
let atlas;
const cache=new Map();
function atlasImage(){
 if(!atlas)atlas=new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>reject(Error('Material atlas unavailable'));image.src=MATERIAL_ATLAS;});
 return atlas;
}
export function photographicSurfaceData(kind){
 if(typeof Image==='undefined'||typeof document==='undefined'||!PHOTO_MATERIALS[kind])return null;
 if(cache.has(kind))return cache.get(kind);
 const task=atlasImage().then(image=>{
  const {cell}=PHOTO_MATERIALS[kind],size=512,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const context=canvas.getContext('2d',{willReadFrequently:true}),halfX=image.naturalWidth/2,halfY=image.naturalHeight/2;
  context.drawImage(image,cell[0]*halfX+2,cell[1]*halfY+2,halfX-4,halfY-4,0,0,size,size);
  const pixels=context.getImageData(0,0,size,size).data,color=new Uint8Array(pixels.length),height=new Uint8Array(pixels.length),roughness=new Uint8Array(pixels.length);let average=0;
  for(let i=0;i<pixels.length;i+=4)average+=(pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722)/(size*size);
  const clamp=n=>Math.round(Math.max(0,Math.min(255,n)));
  for(let i=0;i<pixels.length;i+=4){const lum=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722,detail=lum-average,value=clamp(247+detail*1.55),h=clamp(128+detail*1.6),r=clamp((kind==='stone'?212:240)-detail*.3);color.set([value,value,value,255],i);height.set([h,h,h,255],i);roughness.set([r,r,r,255],i);}
  return {size,color,height,roughness};
 });cache.set(kind,task);return task;
}
