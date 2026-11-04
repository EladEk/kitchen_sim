import * as THREE from 'three';
import {photographicSurfaceData,PHOTO_MATERIALS} from './material-photographs.mjs';
import {orderedSurface} from './ordered-flooring.mjs';
import {orderedFloorPhotoData} from './ordered-floor-photo.mjs';
import {FLOOR_RENDERING,installFloorMaterial} from './floor-material.mjs';

// Metre-scale, seamless surface detail. These are illustrative finishes, not
// manufacturer scans. Shared textures are owned/disposed by each scene.
const fract=x=>x-Math.floor(x),lerp=(a,b,t)=>a+(b-a)*t;
const hash=(x,y,seed)=>fract(Math.sin(x*127.1+y*311.7+seed*19.19)*43758.5453);
function noise(x,y,period,seed){
 const xx=x*period,yy=y*period,ix=Math.floor(xx),iy=Math.floor(yy),fx=fract(xx),fy=fract(yy),u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
 const h=(a,b)=>hash((a+period)%period,(b+period)%period,seed);
 return lerp(lerp(h(ix,iy),h(ix+1,iy),u),lerp(h(ix,iy+1),h(ix+1,iy+1),u),v);
}
function surfaceData(kind,size=256,product=null){
 const color=new Uint8Array(size*size*4),height=new Uint8Array(size*size*4),roughness=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  if(product?.photo){const i=(y*size+x)*4;color.set([...product.photo.previewRgb,255],i);height.set([128,128,128,255],i);roughness.set([245,245,245,255],i);continue;}
  const u=x/size,v=y/size,n=noise(u,v,8,3),cloud=noise(u,v,4,8),fine=hash(x,y,7),grain=Math.sin(2*Math.PI*(u*74+Math.sin(v*2*Math.PI)*.8+n*.4)),wood=kind==='wood'||kind==='terrace',fabric=kind==='fabric';
  let shade=248+(n-.5)*8+(fine-.5)*5,relief=128+(fine-.5)*20,r=235;
  if(kind==='plaster'||kind==='paint'){shade=250+(cloud-.5)*6+(fine-.5)*4;relief=128+(fine-.5)*(kind==='plaster'?44:14);r=245;}
  else if(kind==='door'){const brushed=Math.sin(u*2*Math.PI*96+noise(u,v,8,12)*1.6);shade=248+(cloud-.5)*4+brushed*1.5+(fine-.5)*2;relief=128+brushed*8+(fine-.5)*10;r=229+(n-.5)*12;}
  else if(wood){shade=239+(cloud-.5)*14+grain*(kind==='wood'?7:3)+(fine-.5)*5;relief=128+grain*14+(fine-.5)*12;r=217;}
  else if(fabric){const weave=Math.sin(x*Math.PI/2)*Math.sin(y*Math.PI/2);shade=243+weave*5+(n-.5)*7;relief=128+weave*45+(fine-.5)*16;r=250;}
  else if(kind==='cement'||kind==='limestone'){shade=244+(cloud-.5)*14+(n-.5)*9+(fine-.5)*8;relief=128+(n-.5)*36+(fine-.5)*26;r=242;}
  else if(kind==='stone'||kind==='basalt'){const vein=Math.pow((Math.sin(2*Math.PI*(u*3+Math.sin(v*2*Math.PI)*.18+cloud*.3))+1)/2,18);shade=249-vein*12+(n-.5)*6;relief=128+(fine-.5)*8;r=kind==='basalt'?227:211;}
  else if(kind==='grass'){shade=226+(n-.5)*28+(fine-.5)*27;relief=128+(fine-.5)*90;r=252;}
  else if(kind==='soil'){shade=230+(cloud-.5)*20+(fine-.5)*40;relief=128+(fine-.5)*100;r=250;}
  // Product-specific, restrained fallback. Do not invent marble veins for a
  // matte-white tile or borrow the furniture oak image for Habitat Dawn.
  if(product?.pattern==='matte-white'){shade=253+(cloud-.5)*2+(fine-.5)*1.5;relief=128+(fine-.5)*5;r=244;}
  else if(product?.pattern==='cement-grey'){shade=249+(cloud-.5)*10+(n-.5)*4;relief=128+(fine-.5)*18;r=248;}
  else if(product?.pattern==='wood-look'){const line=Math.sin(2*Math.PI*(u*19+noise(u,v,4,11)*.15));shade=244+line*5+(cloud-.5)*8;relief=128+line*6;r=245;}
  const i=(y*size+x)*4;
  const clamp=v=>Math.round(Math.max(0,Math.min(255,v))),a=clamp(shade),b=clamp(relief),c=clamp(r);
  color.set([a,a,a,255],i);height.set([b,b,b,255],i);roughness.set([c,c,c,255],i);
 }
 return {color,height,roughness,size};
}
const dataCache=new Map();let dataBytes=0;const DATA_LIMIT=16*1024*1024;
export function clearHomeSurfaceCache(){dataCache.clear();dataBytes=0;}
export const homeSurfaceCacheStats=()=>({bytes:dataBytes,entries:dataCache.size,limit:DATA_LIMIT});
const PROFILES={plaster:[.94,.00085],paint:[.57,.00016],door:[.5,.00025],porcelain:[.6,.00028],cement:[.9,.0012],limestone:[.88,.0018],stone:[.38,.0002],basalt:[.62,.00045],wood:[.66,.001],terrace:[.86,.001],fabric:[.98,.0017],grass:[1,.012],soil:[1,.006]};
export function createSurfacePalette(resources){
 const textures=new Map(),materials=new Map();
 function surface(kind,color,options={}){
  const key=JSON.stringify([kind,color,options]);if(materials.has(key))return materials.get(key);
  const {productId,...materialOptions}=options,product=orderedSurface(productId),textureKey=product?`ordered:${product.sku}`:kind;
  if(!textures.has(textureKey)){
   if(!dataCache.has(textureKey)){const value=surfaceData(kind,256,product),bytes=value.color.byteLength+value.height.byteLength+value.roughness.byteLength;while(dataBytes+bytes>DATA_LIMIT&&dataCache.size){const [key,old]=dataCache.entries().next().value;dataBytes-=old.color.byteLength+old.height.byteLength+old.roughness.byteLength;dataCache.delete(key);}dataCache.set(textureKey,value);dataBytes+=bytes;}
   const data=dataCache.get(textureKey),maps={};
   const density=kind==='fabric'?16:kind==='paint'?8:kind==='plaster'?4:1;
   for(const channel of ['color','height','roughness']){const texture=new THREE.DataTexture(data[channel],data.size,data.size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=FLOOR_RENDERING[productId]?THREE.ClampToEdgeWrapping:THREE.RepeatWrapping;texture.repeat.set(product?1/product.tile[0]:density,product?1/product.tile[1]:density);texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=FLOOR_RENDERING[productId]?16:4;texture.colorSpace=channel==='color'?THREE.SRGBColorSpace:THREE.NoColorSpace;texture.needsUpdate=true;maps[channel]=texture;resources.push(texture);}
   textures.set(textureKey,maps);
   const photo=product?.photo?orderedFloorPhotoData(productId):product?null:photographicSurfaceData(kind);
   if(photo){let disposed=false;maps.color.addEventListener('dispose',()=>{disposed=true;});photo.then(data=>{if(disposed)return;for(const channel of ['color','height','roughness']){maps[channel].image={data:data[channel],width:data.size,height:data.size};if(!product)maps[channel].repeat.setScalar(PHOTO_MATERIALS[kind].repeat);maps[channel].wrapS=maps[channel].wrapT=FLOOR_RENDERING[productId]?THREE.ClampToEdgeWrapping:THREE.MirroredRepeatWrapping;maps[channel].needsUpdate=true;}},()=>{});}
  }
  const maps=textures.get(textureKey),[roughness,bumpScale]=PROFILES[kind]||PROFILES.porcelain;
  const physical=FLOOR_RENDERING[productId],Material=physical||kind==='fabric'?THREE.MeshPhysicalMaterial:THREE.MeshStandardMaterial;
  const material=new Material({color:product?.photo?'#ffffff':product?.color||color,map:maps.color,bumpMap:maps.height,bumpScale:product?.bumpScale??bumpScale,roughnessMap:maps.roughness,roughness:product?.roughness??roughness,...(physical?{ior:physical.ior,specularIntensity:physical.specularIntensity,clearcoat:0}:{}),...(kind==='fabric'?{sheen:.85,sheenColor:color,sheenRoughness:.85,specularIntensity:.22}:{}),...materialOptions});material.userData={surfaceKind:kind,...(product?{productId:product.productId,sku:product.sku,tile:product.tile,textureBasis:product.textureBasis,manufacturerScan:product.manufacturerScan,...(product.photo?{photoSource:product.photo.image,photoSample:product.photo.sample}:{} )}:{} )};if(physical)installFloorMaterial(material,product);resources.push(material);materials.set(key,material);return material;
 }
 return surface;
}

// Box UVs use physical metres on each face, so a 20 cm panel and an 8 m wall
// retain the same grain size. World-coordinate floor UVs align paving seams.
export {metricSurfaceUVs} from './metric-surface-geometry.mjs';
