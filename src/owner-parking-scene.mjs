import * as THREE from 'three';
import {createRealisticProps} from '../public-view/realistic-props.mjs';
import {ownerCars} from './owner-parking.mjs';
export function buildOwnerCars({group,resources}){
 for(const car of ownerCars()){
  const root=new THREE.Group();root.position.set(car.x,.039,car.z);root.rotation.y=Math.PI;root.userData={part:'private-owner-car',parking:car.label,illustrative:true};group.add(root);
  const props=createRealisticProps({cars:[{...car,x:0,z:0,model:car.label==='24'?'suv':'hatchback'}]});
  props.update(new THREE.Vector3(0,1.62,0),0);
  // These two parked personal cars are static close-up models. Remove empty
  // distance tiers so bounding-box and plan inspectors never see empty meshes.
  for(const mesh of [...props.group.children])if(mesh.isInstancedMesh&&mesh.count===0){mesh.dispose();mesh.removeFromParent();}
  root.add(props.group);resources.push({dispose:()=>props.dispose()});
 }
}
