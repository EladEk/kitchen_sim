import {getModule} from './model.mjs';

// Owner-requested proposal. The original survey rectangle and position are kept
// separately; 165 cm is a visualization choice, not an installation measurement.
const oven=getModule('oven');
export const K09_RELOCATION={
 cabinetId:oven.id,accessPart:'oven:lift-up',status:'proposal',
 position:[(oven.x+oven.w-28)/1000,1.65,.25],normal:[-1,0],inspectionOffset:[-.35,.15,1.2],
 he:'חיבור מוצע בדופן התא שמעל לתנור',en:'Proposed connection on the side of the compartment above the oven',
 noteHe:'הצעה: בדופן הימנית הפנימית, בתא הקלפה מעל לתנור, עם גישה מקדימה בפתיחת הקלפה. גובה מרכז מוצע 165 ס״מ; יש לקבוע את הביצוע עם החשמלאי והנגר לפי מפרט התנור והארון.',
 noteEn:'Proposal: inside the right side of the compartment above the oven, reached from the front through its lift-up flap. Proposed centre height: 165 cm. The electrician and cabinetmaker must set the installation from the actual oven and cabinet specifications.'
};

export function applyKitchenElectricalRelocation(observation,kitchenAnchor){
 if(observation.label!=='K09')return observation;
 const r=K09_RELOCATION;
 return {...observation,observedPosition:[...observation.position],observedHeight:observation.height,observedNormal:[...observation.normal],relocation:r,
  position:[kitchenAnchor[0]-r.position[0],r.position[1],kitchenAnchor[1]-r.position[2]],height:r.position[1],normal:r.normal.map(n=>-n),vertical:true,displayWall:'long',
  inspectionOffset:[-r.inspectionOffset[0],r.inspectionOffset[1],-r.inspectionOffset[2]]};
}
