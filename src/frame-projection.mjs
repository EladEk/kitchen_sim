import {Vector3} from 'three';

// Only parse anchors after a DOM/layout change. One vector serves all frames.
export function createElementProjection(){
 const anchors=new WeakMap(),projected=new Vector3();
 return (element,camera)=>{
  const value=element.dataset.point;let anchor=anchors.get(element);
  if(!anchor||anchor.value!==value){anchor={value,position:new Vector3(...value.split(',').map(Number))};anchors.set(element,anchor);}
  return projected.copy(anchor.position).project(camera);
 };
}
