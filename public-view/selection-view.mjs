import * as THREE from 'three';
import {DISTRICT,buildingTransform,districtLocation} from './district.mjs';
import {PLAN_CENTER} from './district-layout.mjs';
import {createSelection} from './selection.mjs';
import {createWalkingDisplay} from './walking-display.mjs';

export function createSelectionController({root,model,district,nav,variants=new Map(),doorController=null}){
 let section,key,current,walkBuilding,visibilityKey,activeModel=model;
 const displays=new Map(),interiorsByModel=new Map();for(const source of new Set([model,...variants.values()])){const interiors=[];source.traverse(o=>{if(o.isMesh&&o.userData.exterior===false)interiors.push({object:o,visible:o.visible});});interiorsByModel.set(source,interiors);}
 if(model.parent!==root)root.add(model);
 return {
  update(state,{walking=false,position=null}={}){
   let b=DISTRICT.find(b=>b.id===state.building)||DISTRICT[0];
   if(walking&&position){
    const distance=v=>Math.hypot(position.x-PLAN_CENTER[0]-v.x,position.z-PLAN_CENTER[1]-v.z),inside=districtLocation(position,nav).building;
    const nearest=inside?DISTRICT.find(v=>v.id===inside):DISTRICT.reduce((a,v)=>distance(a)<distance(v)?a:v);
    if(!walkBuilding||inside||distance(nearest)<distance(walkBuilding)*.8)walkBuilding=nearest;
    b=walkBuilding;
   }else if(!walking)walkBuilding=null;
   const source=variants.get(b.id)||model,doorsChanged=doorController?.activate(b.id,source);
   if(source!==activeModel){if(section){section.dispose();section=null;key=null;}root.clear();activeModel=source;root.add(source);if(displays.has(source))root.add(displays.get(source).group);visibilityKey=null;}
   const interiors=interiorsByModel.get(source);
   const floor=position?Math.max(0,Math.floor((position.y-1.62+.35)/nav.storey)):0,nextVisibility=walking&&position?'walk:'+floor:'all';
   if(visibilityKey!==nextVisibility){for(const {object,visible} of interiors)object.visible=visible&&(!walking||!position||Math.abs((object.userData.level??0)-floor)<=1);visibilityKey=nextVisibility;}
   const focused=!walking&&(Number(state.level)!==9||!!state.target);
   // Whole-building views use the same accurately merged display batches as
   // the other seven buildings. Keep the original for bounds/collisions and
   // restore it for walking and sections, where moving parts stay individual.
   const overview=!walking&&!focused;
   root.visible=!overview;root.matrixAutoUpdate=false;root.matrix.copy(buildingTransform(b));root.matrixWorldNeedsUpdate=true;root.updateMatrixWorld(true);
   doorController?.setSourceVisibility(source,focused);district.setActiveBuilding(b.id,{walking,floor,includeActive:overview});district.group.visible=!focused;
   let display=displays.get(source);if(walking&&!display){
    // Build from the complete source once, before the floor visibility mask.
    for(const {object,visible}of interiors)object.visible=visible;
    source.visible=true;display=createWalkingDisplay(source);displays.set(source,display);root.add(display.group);visibilityKey=null;
   }
   if(display){display.group.visible=walking;if(walking)display.update(floor);}source.visible=!focused&&!walking;
   if(focused){const next=state.level+'|'+state.target+'|'+(state.roomFocus?.id||'')+'|'+(state.wallHeight??'full');if(next!==key){if(section){root.remove(section.group);section.dispose();}section=createSelection(source,nav,{...state,level:Number(state.level)});if(!section.group.children.length)throw Error('Empty selected building section');root.add(section.group);key=next;}if(doorsChanged)section.sync();section.group.visible=true;}else if(section){root.remove(section.group);section.dispose();section=null;key=null;}
   root.updateMatrixWorld(true);current={content:focused?section.group:walking?display.group:source,building:b,focused,...(focused&&Number.isFinite(state.wallHeight)?{framingTop:Math.max(...section.regions.map(r=>(nav.floors.find(f=>f.level===r.level)?.elevation??r.level*nav.storey)+2.8))}:{})};return current;
  },
  get current(){return current;},
  sync(){section?.sync();displays.get(activeModel)?.sync();root.updateMatrixWorld(true);},
  dispose(){if(section){root.remove(section.group);section.dispose();section=null;}for(const display of displays.values())display.dispose();displays.clear();interiorsByModel.clear();}
 };
}
export function selectionBounds(content){
 content.updateWorldMatrix(true,true);const box=new THREE.Box3();
 content.traverseVisible(o=>{if(!o.isMesh||o.userData.sceneUi||(o.userData.securityOverlay||o.userData.tourNonPhysical)&&!o.userData.renderFixture)return;const mats=Array.isArray(o.material)?o.material:[o.material];if(!mats.some(m=>m&&m.visible!==false&&m.opacity!==0&&m.colorWrite!==false))return;let local;if(o.isInstancedMesh){if(!o.boundingBox)o.computeBoundingBox();local=o.boundingBox;}else{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();local=o.geometry.boundingBox;}if(local)box.union(local.clone().applyMatrix4(o.matrixWorld));});
 return box;
}
export function fitSelectionCamera(camera,controls,view){
 const box=selectionBounds(view.content);if(Number.isFinite(view.framingTop))box.max.y=Math.max(box.max.y,view.framingTop);if(box.isEmpty())throw Error('No visible selection bounds');
 const target=box.getCenter(new THREE.Vector3()),direction=new THREE.Vector3(-.65,.9,-1).normalize().transformDirection(buildingTransform(view.building)),right=new THREE.Vector3(0,1,0).cross(direction).normalize(),up=direction.clone().cross(right).normalize(),vt=Math.tan(THREE.MathUtils.degToRad(camera.fov)/2),ht=vt*camera.aspect;
 let distance=5;
 for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const delta=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,delta.dot(direction)+Math.max(Math.abs(delta.dot(right))/ht,Math.abs(delta.dot(up))/vt)*1.15+.2);}
 camera.position.copy(target).addScaledVector(direction,distance);camera.lookAt(target);camera.updateMatrixWorld(true);controls.target.copy(target);controls.update();return box;
}

export function buildingSelectionState(current,building){return {building,mode:'building',level:building==='district'?9:current.level,target:building==='district'?'':current.target};}
