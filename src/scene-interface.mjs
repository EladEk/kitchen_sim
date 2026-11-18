import {SERVICE_COLORS} from './service-colors.mjs';
const previousVisibility=new WeakMap();

// Update overlays in place: do not rebuild the house, refit the camera or
// change any saved annotation preference when the interface is hidden.
export function applySceneUiVisibility(model,settings){
 if(!model)return;
 model.group.traverse(o=>{
  if(o.userData.part==='water-supply')for(const m of [o.material].flat())m?.color?.set(settings.showElectrical&&settings.showWater!==false?SERVICE_COLORS.water:'#9aa6a5');
  const layer=o.userData.serviceLayer;if(layer)o.visible=layer==='lighting'?settings.showLighting!==false:layer==='water'?settings.showElectrical!==false&&settings.showWater!==false:layer==='electrical'?settings.showElectrical!==false||Boolean(o.userData.hasFixture)&&settings.showInlineFixtures!==false:true;
  if(o.userData.electricalMarkerMat)for(const m of [o.material].flat()){m.opacity=settings.showElectrical!==false?.96:.34;m.emissiveIntensity=settings.showElectrical!==false?.24:.05;}
  if(o.userData.electricalHighlightRing){o.visible=settings.showElectrical!==false&&!settings.cleanView;return;}
  if(!['electrical-highlight','electrical-annotation-hit','lighting-marker','building-apartment-highlight','building-unit-label'].includes(o.userData.part))return;
  if(settings.cleanView){if(!previousVisibility.has(o))previousVisibility.set(o,o.visible);o.visible=false;}
  else if(previousVisibility.has(o)){o.visible=previousVisibility.get(o);previousVisibility.delete(o);}
 });
 if(model.buildingContext?.group?.userData.shadowOnly)model.buildingContext.group.visible=settings.buildingShadows!==false;
 model.refreshInteractionTargets?.();
 if(model.dimensionGroup)model.dimensionGroup.visible=settings.dimensions&&!settings.cleanView;
}
