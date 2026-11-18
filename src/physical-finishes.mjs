import * as T from 'three';

// Small, seamless, neutral maps: paint and cloth detail must never recolour
// the selected finish. Shared by each scene's palette, not allocated per mesh.
export function microNormalTexture(kind='paint',size=128){
 const data=new Uint8Array(size*size*4),strength=kind==='fabric'?.16:kind==='ceiling'?.018:.035;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=x/size*Math.PI*2,b=y/size*Math.PI*2;
  const dx=strength*(Math.cos(a*31)*Math.sin(b*29)+.4*Math.cos(a*47+b*43)),dy=strength*(Math.sin(a*31)*Math.cos(b*29)+.4*Math.cos(a*47+b*43)),n=1/Math.hypot(dx,dy,1),i=(y*size+x)*4;
  data.set([Math.round((dx*n*.5+.5)*255),Math.round((dy*n*.5+.5)*255),Math.round((n*.5+.5)*255),255],i);
 }
 const map=new T.DataTexture(data,size,size);map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.setScalar(kind==='fabric'?18:12);map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;map.generateMipmaps=true;map.anisotropy=16;map.needsUpdate=true;return map;
}
export function physicalFinish(material,kind,{ceiling=false}={}){
 material.userData={...material.userData,surfaceKind:kind,physicalFinishRevision:165};
 if(['plaster','paint'].includes(kind)){
  material.roughness=ceiling?.94:kind==='plaster'?.82:.38;material.metalness=0;material.sheen=ceiling?0:.1;material.sheenRoughness=.8;material.sheenColor.set('#ffffff');material.specularIntensity=ceiling?.15:.35;
  if(kind==='paint'&&!ceiling){material.clearcoat=.2;material.clearcoatRoughness=.3;}
  if(ceiling)material.userData.architecturalCeiling=true;
 }else if(kind==='fabric'){
  material.roughness=.85;material.metalness=0;material.sheen=.65;material.sheenRoughness=.4;material.sheenColor.set('#e8e3da');material.specularIntensity=.2;material.clearcoat=0;
 }else if(kind==='porcelain'){
  material.roughness=.25;material.metalness=0;material.clearcoat=.28;material.clearcoatRoughness=.3;
 }else if(kind==='door'){
  material.roughness=.36;material.metalness=0;material.clearcoat=.2;material.clearcoatRoughness=.3;
 }else if(kind==='wood'){
  material.clearcoat=.2;material.clearcoatRoughness=.3;material.metalness=0;
 }else if(kind==='metal'){
  material.metalness=.92;material.roughness=.28;material.anisotropy=.45;material.anisotropyRotation=.25;
 }
 return material;
}

export function upgradeFurnitureMaterials(root){
 const converted=new Map();root.traverse(o=>{if(!o.isMesh||o.userData.furnitureCollisionProxy)return;
  o.castShadow=o.receiveShadow=true;
  const convert=source=>{
   if(!source?.isMeshStandardMaterial||source.isNodeMaterial)return source;if(converted.has(source))return converted.get(source);
   const m=source.isMeshPhysicalMaterial?source:new T.MeshPhysicalMaterial();if(m!==source){T.MeshStandardMaterial.prototype.copy.call(m,source);m.onBeforeCompile=source.onBeforeCompile;m.customProgramCacheKey=source.customProgramCacheKey;}
   const kind=source.userData.surfaceKind||(/linen|cloth|fabric|pillow|duvet|upholster/i.test(source.name)?'fabric':(/glass|glaz/i.test(source.name)||source.transmission>0)?'glass':source.metalness>.6&&source.roughness>.12?'metal':/wood|oak|walnut/i.test(source.name)?'wood':null);
   if(kind)physicalFinish(m,kind);if(kind==='glass'){m.transmission=.95;m.ior=1.5;m.thickness=.012;m.roughness=.08;m.metalness=0;m.transparent=false;m.opacity=1;m.userData.architecturalGlass=true;}if(kind==='fabric'&&!m.normalMap)m.normalMap=microNormalTexture('fabric');m.userData={...m.userData,furnitureMaterial:true};
   for(const value of Object.values(m))if(value?.isTexture&&!value.isRenderTargetTexture){value.anisotropy=16;value.needsUpdate=true;}
   converted.set(source,m);return m;
  };o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);
 });for(const [source,m]of converted)if(source!==m)source.dispose();return converted;
}

// A lightweight runtime palette for arbitrary added furniture. It deliberately
// has no dependency on the owner's photographed floor/catalogue modules.
export function createFurnitureSurfacePalette(resources){
 const normals=new Map();return kind=>{
  const m=physicalFinish(new T.MeshPhysicalMaterial({color:'#ffffff',roughness:.65}),kind);resources.push(m);
  if(['fabric','paint'].includes(kind)){if(!normals.has(kind)){const t=microNormalTexture(kind);normals.set(kind,t);resources.push(t);}m.normalMap=normals.get(kind);}
  if(kind==='wood'){
   const size=128,data=new Uint8Array(size*size*4);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const grain=Math.sin(x/size*Math.PI*48+Math.sin(y/size*Math.PI*2)*1.4),v=Math.round(225+grain*12);data.set([v,v,v,255],(y*size+x)*4);}
   const t=new T.DataTexture(data,size,size);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=16;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=true;t.needsUpdate=true;resources.push(t);m.roughness=.6;m.roughnessMap=m.bumpMap=t;m.bumpScale=.00035;
  }
  m.userData={...m.userData,architecturalInterior:true,furnitureMaterial:true};return m;
 };
}
