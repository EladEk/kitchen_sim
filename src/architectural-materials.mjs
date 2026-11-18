import {MeshPhysicalMaterial,MeshStandardMaterial} from 'three';
import {DRY_PORCELAIN} from './floor-appearance.mjs';

// Author-specified appearance targets. These are sRGB paint/stone swatches,
// converted by Three.Color on assignment, not measured spectral material data.
export const ARCHITECTURAL_MATERIALS=Object.freeze({
 wall:{color:'#f2efe9',roughness:.82,metalness:0,clearcoat:0,envMapIntensity:.8},
 ceiling:{color:'#f8f8f6',roughness:.94,metalness:0,clearcoat:0,specularIntensity:.15,envMapIntensity:1.1},
 facade:{color:'#e6dfd3',roughness:.82,metalness:0},
 secondary:{color:'#b8bcc0',roughness:.8,metalness:0},
 fascia:{color:'#7e8286',roughness:.85,metalness:0},
 soffit:{color:'#f2f1ed',roughness:.94,metalness:0},
 frame:{color:'#2d3136',roughness:.36,metalness:.85,clearcoat:.1,clearcoatRoughness:.42},
 fence:{color:'#2a2d32',roughness:.38,metalness:.85,clearcoat:.1,clearcoatRoughness:.42},
 glass:{color:'#f6faf8',transmission:.9,ior:1.52,thickness:.024,attenuationColor:'#dff0ec',attenuationDistance:.65,roughness:.035,specularIntensity:1,metalness:0,envMapIntensity:1.35,transparent:false,opacity:1,depthWrite:false},
 entranceFloor:{color:'#5a5856',roughness:.45,metalness:0},
 entryDoor:{color:'#454a4e',roughness:.40,metalness:.78,clearcoat:.14,clearcoatRoughness:.38},
 door:{color:'#f3f2ee',roughness:.36,metalness:0,clearcoat:.2},
 handle:{color:'#d4d8dc',roughness:.24,metalness:.96,anisotropy:.65,clearcoat:.1},
 floor:{color:DRY_PORCELAIN.color,roughness:.25,metalness:0,clearcoat:.28,envMapIntensity:.9},
 worktop:{metalness:0,clearcoat:.18,clearcoatRoughness:.25},
 cabinet:{roughness:.38,metalness:0,clearcoat:.2,clearcoatRoughness:.3},
 fabric:{roughness:.85,metalness:0,sheen:.65,sheenRoughness:.4,sheenColor:'#e8e3da'}
});
export function architecturalRole(object,material){
 const part=object.userData.part||'',data=material.userData||{};
 if(part==='worktop'||object.userData.id==='island-1'&&['stone','basalt','porcelain'].includes(data.surfaceKind))return 'worktop';
 if(/hvac-(bulkhead|grille-frame|horizontal-louvre|grille-stay)/.test(part))return 'ceiling';
 if(/balcony-soffit/.test(part))return 'soffit';
 if(/balcony-fascia|balcony-grey-beams/.test(part))return 'fascia';
 if(/balcony-grey-returns/.test(part))return 'secondary';
 if(/window-frame|shutter-box/.test(part))return 'frame';
 if(/laundry-screen|fence|rail-and-louvres/.test(part))return 'fence';
 if(/door-hardware|door-handle/.test(part))return 'handle';
 if(/building-glazing|observed-window-sash|balcony-glass|window-glass/.test(part))return 'glass';
 if(/entrance.*floor|entry-common-floor|service.*deck/.test(part))return 'entranceFloor';
 if(data.architecturalRole)return data.architecturalRole;
 if(data.architecturalCeiling)return 'ceiling';
 if(data.publicFinish==='stone')return 'facade';
 if(data.publicFinish==='floor'&&(data.floorCourses?.tile?.[0]??1)>=.8)return 'floor';
 if(data.surfaceKind==='door')return material.color.getHexString()==='454a4e'?'entryDoor':'door';
 if(data.surfaceKind==='plaster')return null; // retain lobby/custom paint colour
 if(data.surfaceKind==='fabric')return 'fabric';
 if(data.surfaceKind==='paint'&&data.furnitureMaterial)return 'cabinet';
 return null;
}
export function applyArchitecturalMaterials(root){
 const cache=new Map();
 root.traverse(object=>{
  if(!object.material)return;
  const convert=source=>{
   if(!source?.isMeshStandardMaterial||source.isNodeMaterial)return source;
   const role=architecturalRole(object,source);if(!role)return source;
   const key=source.uuid+':'+role;if(cache.has(key))return cache.get(key);
   const material=new MeshPhysicalMaterial();MeshStandardMaterial.prototype.copy.call(material,source);
   // Standard copy() replaces defines with {STANDARD}; WebGL2 needs PHYSICAL (IOR) for transmission glass.
   material.defines={...source.defines,STANDARD:'',PHYSICAL:''};
   material.onBeforeCompile=source.onBeforeCompile;material.customProgramCacheKey=source.customProgramCacheKey;
   const values={...ARCHITECTURAL_MATERIALS[role]};if(source.userData.selectedFinishColor)delete values.color;if(role==='glass'&&source.userData.architecturalGlass)Object.assign(values,{transmission:source.transmission,transparent:source.transparent,opacity:source.opacity});material.setValues(values);
   material.userData={...source.userData,architecturalRole:role};
   if(role==='secondary')Object.assign(material.userData,{publicFinish:'stone',surfaceKind:'limestone'});
   if(role==='entranceFloor')Object.assign(material.userData,{publicFinish:'floor',floorCourses:{tile:[.2,1.2],joint:.003}});
   if(role==='glass')Object.assign(material.userData,{architecturalGlass:true,transmissionBase:.9});
   // R177: lowered hallway ceilings/HVAC bulkheads get the ceiling role from their part
   // name only. Without this flag the room probe skipped them and they lit from the sky.
   if(role==='ceiling')material.userData.architecturalCeiling=true;
   cache.set(key,material);return material;
  };
  object.material=Array.isArray(object.material)?object.material.map(convert):convert(object.material);
 });return cache;
}

// Ordered exterior/wet products retain their explicit layout. Dry indoor
// porcelain uses the surveyed 100 cm grid with 4 mm joints.
export function porcelainProfile(data={}){
 const explicit=data.tile||data.floorCourses?.tile;
 const exterior=data.productId==='terrace-floor'||data.architecturalRole==='entranceFloor'||data.exterior===true||(!data.productId&&explicit&&Math.min(...explicit)<.8);
 const satin=!exterior&&(data.productId==='dry-floor'||!data.productId);
 return {tile:satin?[1,1]:(explicit||[1,1]),joint:satin?DRY_PORCELAIN.joint:(data.floorRendering?.jointMetres??data.floorCourses?.joint??.003),satin};
}
