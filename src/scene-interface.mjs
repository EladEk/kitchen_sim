const previousVisibility=new WeakMap();

// Update overlays in place: do not rebuild the house, refit the camera or
// change any saved annotation preference when the interface is hidden.
export function applySceneUiVisibility(model,settings){
 if(!model)return;
 model.group.traverse(o=>{
  if(!['electrical-highlight','electrical-annotation-hit','lighting-marker','building-apartment-highlight','building-unit-label'].includes(o.userData.part))return;
  if(settings.cleanView){if(!previousVisibility.has(o))previousVisibility.set(o,o.visible);o.visible=false;}
  else if(previousVisibility.has(o)){o.visible=previousVisibility.get(o);previousVisibility.delete(o);}
 });
 if(model.dimensionGroup)model.dimensionGroup.visible=settings.dimensions&&!settings.cleanView;
}
