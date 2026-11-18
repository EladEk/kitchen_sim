import {lightOutput,lightColour} from './lighting-controls.mjs';
import {warmDimColor} from './photometric-lighting.mjs';
// A small persistent index. No geometry, textures or materials are recreated.
export function createSceneStateUpdater(group,daylight,initialSettings){
 const lights=[],emissives=[],seen=new Set(),shadows=[];let current=initialSettings;
 group.traverse(o=>{
  if(o.isLight){if(o.userData.fixtureLight)lights.push({object:o,power:o.userData.nominalIntensity??o.intensity});if(o.castShadow)shadows.push(o);}
  for(const m of [o.material].flat().filter(Boolean))if(m.emissive&&!seen.has(m)&&m.emissiveIntensity>0){seen.add(m);emissives.push({material:m,power:m.emissiveIntensity,id:o.userData.lightingId,led:!!m.userData.kitchenLed});}
 });
 return value=>{
  current=value||current;const state=daylight?.(current),on=current.lampsOn!==false;
  for(const {object,power}of lights){const id=object.userData.lightingId,output=id?lightOutput(current,id):null,led=object.userData.part==='kitchen-linear-area-light',amount=on&&(!led||current.led!==false)?(output?output.power:led?(current.intensity??100)/100:1):0;
   object.intensity=power*amount;object.color.copy(warmDimColor(output?.color||lightColour(current.light==='night'?3000:object.userData.kelvin||4000),amount,current.light==='night'));object.visible=amount>0&&(!object.userData.kitchenFurnishing||current.cabinetVisibility!=='hidden');
  }
  for(const e of emissives){const amount=on&&(!e.led||current.led!==false)?(e.id?lightOutput(current,e.id).power:1):0;e.material.emissiveIntensity=e.power*amount;if(e.id)e.material.emissive.copy(warmDimColor(lightOutput(current,e.id).color,amount,current.light==='night'));}
  for(const light of shadows)light.castShadow=current.buildingShadows!==false;
  return state;
 };
}
export function updateSceneKinematics(model,settings){
 if(!model)return;const doors=new Set(settings.openDoors||[]),shutters=new Set(settings.closedShutters||[]),parts=new Set(settings.openParts||[]),closed=new Set(settings.closedBuildingDoors||[]);
 for(const m of model.motions||[]){const active=m.id.startsWith('door:')?doors.has(m.id.slice(5)):m.id.startsWith('shutter:')?shutters.has(m.id.slice(8)):parts.has(m.id);m.target=active?m.openTarget:m.closedTarget??0;}
 model.updateKinematics?.(settings);
 model.group.traverse(o=>{if(o.userData.activeOpening)o.visible=settings.activePart===o.userData.activeOpening&&!settings.cleanView;const d=o.userData.tourDoor;if(d){o[d.axis][d.property]=closed.has(d.id)?d.closed:d.open;o.updateMatrix();}});
 model.refreshInteractionTargets?.();
}
