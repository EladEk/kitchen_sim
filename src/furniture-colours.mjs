export const FURNITURE_COLOURS=Object.freeze({upholstery:'#b5aa99',seam:'#8a8174',bedding:'#d8c8ab',accent:'#8b8a7c'});

// Recolour the shared decoded PBR materials; retain all fabric/normal maps,
// sheen and mesh compression. The role survives repeated template extraction.
export function applyFurnitureColours(root){
 const seen=new Set();root.traverse(o=>{if(!o.isMesh)return;for(const m of [o.material].flat()){
  if(seen.has(m))continue;seen.add(m);let role=m.userData.furnitureColourRole;
  if(!role){const hex=m.color?.getHexString();if(m.name==='Derived linen upholstery'||m.name==='modern_arm_chair_01_pillow')role='upholstery';else if(m.userData.surfaceKind==='fabric')role=['e8e4d9','a2aca2'].includes(hex)?'bedding':hex==='8f8b7f'?'seam':'upholstery';}
  if(role&&FURNITURE_COLOURS[role]){m.color.set(FURNITURE_COLOURS[role]);m.userData={...m.userData,surfaceKind:'fabric',architecturalInterior:true,furnitureMaterial:true,furnitureColourRole:role,selectedFinishColor:FURNITURE_COLOURS[role]};if(m.sheenColor)m.sheenColor.copy(m.color).lerp(m.color.clone().set('#ffffff'),.18);}
 }});
}
