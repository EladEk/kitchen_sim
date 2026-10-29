import * as THREE from 'three';
import {DISTRICT,buildingTransform} from './district.mjs';
import {createSelection} from './selection.mjs';

export function createSelectionController({root,model,district,nav}){
 let section,key,current;
 if(model.parent!==root)root.add(model);
 return {
  update(state,{walking=false}={}){
   const b=DISTRICT.find(b=>b.id===state.building)||DISTRICT[0],focused=!walking&&(Number(state.level)!==9||!!state.target);
   root.visible=true;root.matrixAutoUpdate=false;root.matrix.copy(buildingTransform(b));root.matrixWorldNeedsUpdate=true;root.updateMatrixWorld(true);
   district.setActiveBuilding(b.id);district.group.visible=!focused;model.visible=!focused;
   if(focused){const next=b.id+'|'+state.level+'|'+state.target;if(next!==key){if(section){root.remove(section.group);section.dispose();}section=createSelection(model,nav,{...state,level:Number(state.level)});if(!section.group.children.length)throw Error('Empty selected building section');root.add(section.group);key=next;}section.group.visible=true;}else if(section)section.group.visible=false;
   root.updateMatrixWorld(true);current={content:focused?section.group:model,building:b,focused};return current;
  },
  get current(){return current;},
  dispose(){if(section){root.remove(section.group);section.dispose();}}
 };
}
export function fitSelectionCamera(camera,controls,view){
 view.content.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(view.content);if(box.isEmpty())throw Error('No visible selection bounds');
 const target=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(-.65,.9,-1).normalize().transformDirection(buildingTransform(view.building)),right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),vt=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),ht=vt*camera.aspect;
 let distance=5;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const delta=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,delta.dot(direction)+Math.max(Math.abs(delta.dot(right))/ht,Math.abs(delta.dot(up))/vt)*1.15+.2);}
 camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld(true);controls.target.copy(target);controls.update();return box;
}

export function buildingSelectionState(current,building){return {building,mode:'building',level:building==='district'?9:current.level,target:building==='district'?'':current.target};}
