import {materialReference} from 'three/tsl';

// No material instance is captured: sections/fades read their current clone.
// r185 renders shadow colour/alpha nodes using an override NodeMaterial that
// lacks physical properties. Its current source also identifies the correct
// material for a multi-material geometry group, unlike object.material alone.
export function materialProperty(property,type){
 return materialReference(property,type).onReference(function(state){
  this.reference=state.renderer?._currentSourceMaterial||state.material;
  return this.reference;
 });
}
