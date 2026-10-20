// Viewing preferences do not change cabinet geometry or opening states.
export const CABINET_VISIBILITY=['solid','translucent','hidden'];
export const cabinetVisibility=settings=>CABINET_VISIBILITY.includes(settings?.cabinetVisibility)?settings.cabinetVisibility:'solid';
export const electricalLabelsVisible=settings=>settings?.showElectricalLabels===true;
export function kitchenVisibilitySettings(input={}){
 return {cabinetVisibility:cabinetVisibility(input),showElectricalLabels:electricalLabelsVisible(input)};
}
export function objectVisible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
export function opaqueMesh(mesh){const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];return materials.some(m=>m&&m.visible!==false&&m.opacity>=.98);}

export function applyKitchenVisibility(roots,mode,resources){
 const copies=new Map();
 for(const root of roots){
  root.visible=mode!=='hidden';
  root.traverse(mesh=>{
   if(!mesh.isMesh)return;
   mesh.userData.kitchenFurnishing=true;
   if(mode!=='translucent')return;
   const ghost=material=>{if(!copies.has(material)){const copy=material.clone();copy.transparent=true;copy.opacity=Math.min(material.opacity,.24);copy.depthWrite=false;copies.set(material,copy);resources.push(copy);}return copies.get(material);};
   mesh.material=Array.isArray(mesh.material)?mesh.material.map(ghost):ghost(mesh.material);
   mesh.castShadow=false;mesh.receiveShadow=false;
  });
 }
 return copies;
}

export function cabinetSvgStyle(settings){const mode=cabinetVisibility(settings);return {opacity:mode==='translucent' ? .24 : 1,display:mode==='hidden'?'none':undefined};}
