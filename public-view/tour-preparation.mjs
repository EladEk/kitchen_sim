// Lighting follows individual rooms. The prepared neighborhood already covers
// the whole floor; apartment/common-area boundaries share that preparation.
export function tourPreparationKey(location){
 const {at={},b}=location;
 return `walk:${b?.id||at.building||'outside'}:${at.floor??0}`;
}
export const walkingPreparationNeighborhood=storey=>({radius:48,height:Math.max(4,storey*1.5)});
