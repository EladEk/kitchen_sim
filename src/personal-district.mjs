import * as THREE from 'three';
import clipping from 'polygon-clipping';
import {createHomeScene} from './home-scene.js';
import {normalizeHomeSettings,DOORS,PLOT,HOUSE_OUTLINE,TERRACE,SERVICE_APRON,PUBLIC_ENTRY,GARDEN_LAYOUT,yardForSettings,CONSTRUCTION_WALLS,SERVICE_YARD,furnitureForSettings,ROOMS,PLAN_SCALE,PLAN_ORIGIN} from './home-model.mjs';
import {clearHomeSurfaceCache} from './surface-materials.mjs';
import {batchPersonalTour} from './personal-tour-batching.mjs';
import {HOME_STORAGE} from './studio-state.mjs';
import {DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {extractFloorMap} from '../public-view/floor-map-geometry.mjs';

export function createPersonalDistrictVariant({model,siteData,settings,kitchenSettings,mobile=false,signal,onCollisionChange=()=>{},storage=globalThis.localStorage}){
 if(signal?.aborted)throw new DOMException('Canceled','AbortError');
 const root=model.clone(true),slots=[];root.traverse(o=>{if(o.userData.variantSlot===4)slots.push(o);});
 if(!slots.length)throw Error('נדרש רענון של נתוני R125 לתכנון האישי.');
 for(const slot of slots){slot.traverse(o=>{if(o.isInstancedMesh)o.dispose();});slot.removeFromParent();}slots.length=0;
 let current=normalizeHomeSettings({...settings,cutaway:false,showElectrical:false,showWater:false});
 const home=createHomeScene(current,{mode:'walk',kitchenSettings,context:false,daylight:false});
 const walls=new Map(CONSTRUCTION_WALLS.map(w=>[w.id,w]));
 const localLights=[];
 home.group.traverse(o=>{
  if(o.userData.securityOverlay){o.userData.tourNonPhysical=true;if(o.userData.action==='security-camera')o.userData.renderFixture=true;else{o.visible=false;o.traverse(v=>{v.userData.tourNonPhysical=true;});}}
  if(o.userData.part==='lighting-marker'||/annotation|highlight/.test(o.userData.part||'')){o.visible=false;o.traverse(v=>{v.userData.tourNonPhysical=true;});}
  if(o.isLight){o.castShadow=false;if(o.userData.fixtureLight)localLights.push(o);}
  if(o.isMesh){const part=o.userData.part||'';o.userData.level=0;o.userData.ceiling=/ceiling/.test(part);o.userData.exterior=true;
   if(o.userData.wallId&&walls.has(o.userData.wallId))o.userData.exterior=!!walls.get(o.userData.wallId).external;
  }
 });
 localLights.sort((a,b)=>b.intensity-a.intensity);localLights.slice(mobile?4:8).forEach(light=>{light.visible=false;});localLights.length=0;
 for(const motion of home.motions)motion.object.userData={...motion.object.userData,tourMotionId:motion.id,level:0};
 // Capture the supplied apartment before static batching removes part tags.
 // Its map is local to this authorized entry and follows the saved furniture.
 const mapMotions=home.motions.filter(m=>m.id.startsWith('door:')).map(m=>{const d=DOORS.find(d=>'door:'+d.id===m.id);return {...m,closed:d.type==='slider'?-d.width/4:0,open:d.type==='slider'?d.width/4:(d.swing||-1)*Math.PI*.48,kind:d.id==='entry'?'entry':d.type==='slider'?'glazed':'interior',defaultOpen:current.openDoors.includes(d.id)};});
 const mapLayer=extractFloorMap(home.group,{motions:mapMotions,furniture:()=>null});
 if(current.furniture)for(const f of furnitureForSettings(current)){if(!['sofa','coffee','console','bed','desk','dining','wardrobe','office-cabinet'].includes(f.kind))continue;const c=Math.cos(f.rotation),s=Math.sin(f.rotation),polygon=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,z])=>[f.position[0]+x*c+z*s,f.position[1]-x*s+z*c]);mapLayer.furniture.push({kind:f.kind==='console'?'media':f.kind,polygon});}
 mapLayer.rooms=ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)).map(r=>({id:r.id,unit:4,he:r.he,kind:r.kind,label:r.walk,polygons:[r.polygon]}));
 const mapOverrides=new Map([['4102:0:4',{polygons:[HOUSE_OUTLINE],layer:mapLayer,originalPlan:{url:'/house/house-plan.jpg',x:-PLAN_ORIGIN[0]*PLAN_SCALE,z:-PLAN_ORIGIN[1]*PLAN_SCALE,width:1318*PLAN_SCALE,height:1120*PLAN_SCALE}}]]);
 const stats=batchPersonalTour(home);home.group.userData.variantSlot=4;root.add(home.group);root.updateMatrixWorld(true);const models=new Map([['4102',root]]);
 const plot=PLOT.map(([x,z])=>{const p=new THREE.Vector3(x,0,z).applyMatrix4(buildingTransform(DISTRICT[0]));return [p.x,p.z];});
 const yard=yardForSettings(current),lawn=clipping.difference([PLOT],[HOUSE_OUTLINE],[TERRACE],[SERVICE_APRON],[PUBLIC_ENTRY],[GARDEN_LAYOUT.paving],[yard.service.shed.polygon]);
 const grassPolygons=lawn.map(poly=>poly.map(ring=>ring.map(([x,z])=>{const p=new THREE.Vector3(x,0,z).applyMatrix4(buildingTransform(DISTRICT[0]));return [p.x,p.z];})));
 const site={...siteData,groundCover:{...siteData.groundCover,grass:siteData.groundCover.grass.map(layer=>({...layer,polygons:layer.polygons.length?clipping.difference(layer.polygons,[plot]):[]}))}};
 const dynamicState=new Map();for(const m of home.motions)dynamicState.set(m.id,{closed:m.axis==='scale'?.015:0,open:m.openTarget??(Math.abs(m.target)>1e-5?m.target:m.axis==='rotation'?-Math.PI*.48:.34)});
 for(const d of DOORS){const state=dynamicState.get('door:'+d.id);if(state){state.closed=d.type==='slider'?-d.width/4:0;state.open=d.type==='slider'?d.width/4:(d.swing||-1)*Math.PI*.48;}}
 for(const d of [SERVICE_YARD.shed.door].filter(Boolean)){const state=dynamicState.get(d.id);if(state)state.open=d.swing*Math.PI*.49;}
 let disposed=false;
 function onSelect(data){
  if(disposed)return false;let id,key;
  if(data.action==='door'){id='door:'+data.doorId;key='openDoors';}
  else if(data.action==='shutter'){id='shutter:'+data.shutterId;key='closedShutters';}
  else if(data.action==='part'){id=data.partId;key='openParts';}
  else return false;
  const motion=home.motions.find(m=>m.id===id),values=dynamicState.get(id);if(!motion||!values)return false;
  const value=key==='openDoors'?data.doorId:key==='closedShutters'?data.shutterId:id,selected=(current[key]||[]).includes(value),next=!selected;
  current={...current,[key]:next?[...(current[key]||[]),value]:(current[key]||[]).filter(v=>v!==value)};
  const target=key==='closedShutters'?(next?1:.015):(next?values.open:values.closed);motion.object[motion.axis][motion.property]=target;motion.target=target;root.updateMatrixWorld(true);onCollisionChange('4102');
  try{const stored=JSON.parse(storage?.getItem(HOME_STORAGE)||'{}');storage?.setItem(HOME_STORAGE,JSON.stringify({...stored,[key]:current[key]}));}catch{}
  return true;
 }
 return {models,siteData:site,stats,onSelect,mapOverrides,mapDoorOpen:(building,id)=>building==='4102'&&id.startsWith('door:')?current.openDoors.includes(id.slice(5)):null,siteOptions:{includeFence:f=>!(f.building==='4102'&&f.units.includes(4)),includeCar:b=>!(b.building==='4102'&&['24','25'].includes(b.label)),lawnRegions:[{y:-.035,polygons:grassPolygons}]},
  dispose(){if(disposed)return;disposed=true;root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});home.dispose();root.removeFromParent();root.clear();models.clear();mapOverrides.clear();dynamicState.clear();slots.length=0;clearHomeSurfaceCache();}};
}
