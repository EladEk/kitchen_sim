import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {dimensionedFurnitureParts} from '../src/dimensioned-furniture.mjs';import {cabinetMotions} from '../src/cabinet-motion.mjs';import {CABINET_KINDS} from '../src/cabinet-furniture.mjs';
import {createApartmentEditorScene,withApartmentEdits} from './apartment-editor-scene.mjs';import {selectResidentFurniture} from './furniture-interaction.mjs';import {FURNITURE_TYPES,scopeKey,emptyWorkspace,updateUnit} from './apartment-editing.mjs';import {DISTRICT,buildingTransform} from './district.mjs';
const scope={building:'4102',floor:0,unit:1},nav={storey:3.1,floors:[{level:0,elevation:0,units:[{number:1,polygon:[[0,0],[20,0],[20,20],[0,20]]}],map:{walls:[],doors:[],rooms:[],furniture:[]}}]},make=(kind='wardrobe')=>{const [w,d,h]=FURNITURE_TYPES[kind].size.map(v=>v/100);return {id:'cab',kind,x:4,z:4,w,d,h,yaw:0,color:'#b68b60'};},ws=(item=make(),s=scope)=>updateUnit(emptyWorkspace(),scopeKey(s),[item]),advance=scene=>{for(let i=0;i<5;i++)scene.tick(.08);},rayTo=(a,b)=>new T.Raycaster(a,b.clone().sub(a).normalize(),0,10);

test('walking/VR taps operate cabinets; editing is reachable only inside an explicit 3D edit session',()=>{
 const data={action:'edit-furniture',editorScope:scopeKey(scope),editorItemIds:['cab']},hit={instanceId:0,point:new T.Vector3(),furnitureMotionId:'door-1'},calls=[];
 const onEdit=(...args)=>calls.push(['edit',...args]),onToggle=(...args)=>{calls.push(['toggle',...args]);return true;};
 for(const state of [{mode:'walk',roomFocus:{id:'bedroom'}},{mode:'building',liveSession:null},{mode:'building',liveSession:{stage:'categories'}},{mode:'walk',liveSession:{stage:'categories'}}]){const before=structuredClone(state);selectResidentFurniture({state,data,hit,nav,onEdit,onToggle});assert.deepEqual(state,before);}
 assert.deepEqual(calls.map(c=>c[0]),['toggle','edit']);assert.equal(calls[0][4],'door-1');
 selectResidentFurniture({state:{mode:'building'},walking:true,data,hit,nav,onEdit,onToggle});assert.equal(calls.at(-1)[0],'toggle');
 assert.equal(selectResidentFurniture({state:{mode:'walk'},data:{...data,editorItemIds:[]},hit,nav,onEdit,onToggle}),false);
});

test('every closed cabinet, glass door, corner door and drawer has a grouped assembly; open shelving has none',()=>{
 const kinds=['wardrobe','shoe_cabinet','kitchen_tall','kitchen_wall','dresser','nightstand','tv_console','kitchen_base',...CABINET_KINDS];
 for(const kind of kinds){const item=make(kind),parts=dimensionedFurnitureParts(item),motions=cabinetMotions(item,parts);if(['wardrobe_open','cube_storage','kitchen_open_shelf'].includes(kind)){assert.equal(motions.length,0);continue;}assert(motions.length>0,kind);const membership=motions.flatMap(m=>m.parts);assert.equal(new Set(membership).size,membership.length,kind+' moving parts are owned once');for(const m of motions){assert(m.parts.length>=2,kind+' handle/frame follows its front');assert(m.min.every(Number.isFinite));assert(m.max.every(Number.isFinite));}}
 const parts=dimensionedFurnitureParts(make()),body=parts.find(p=>p.part==='body');assert(body.box[5]<.03,'wardrobe back is a board, not a solid block');assert(parts.some(p=>p.part==='interior-shelf-0.5'));
 const drawers=dimensionedFurnitureParts(make('dresser'));assert(drawers.some(p=>p.part==='tray-0-bottom'));
});

test('hinges open, close and reverse without touching the layout, camera or room; opened leaves remain clickable and solid',()=>{
 const scene=createApartmentEditorScene({nav}),item=make(),workspace=ws(item),before=JSON.stringify(workspace);try{
  scene.sync(workspace);const first=scene.getMotionState(scope,item.id)[0],closed=first.matrix.clone();assert(scene.toggle(scope,item.id,null,first.id));scene.tick(.12);const half=scene.getMotionState(scope,item.id)[0];assert(half.progress>0&&half.progress<1);assert(scene.toggle(scope,item.id,null,first.id));advance(scene);assert.equal(scene.getMotionState(scope,item.id)[0].progress,0);
  scene.toggle(scope,item.id,null,first.id);advance(scene);const opened=scene.getMotionState(scope,item.id)[0];assert.equal(opened.progress,1);assert.notDeepEqual(opened.matrix.elements,closed.elements);
  const center=opened.bounds.getCenter(new T.Vector3()),p=center.clone().applyMatrix4(opened.matrix),normal=new T.Vector3(0,0,1).transformDirection(opened.matrix),origin=p.clone().addScaledVector(normal,1.5),hit=scene.pick(rayTo(origin,p));assert(hit);assert.equal(hit.furnitureMotionId,first.id,'opened door is pickable outside the cabinet footprint');assert.equal(hit.object.userData.editorItemIds[hit.instanceId],item.id);
  const foot=p.clone();foot.y=1.62+.03;assert(scene.blocksPosition(foot,.08));const world=withApartmentEdits({firstHit:()=>null,canStand:()=>true,memory:{}},scene);assert.equal(world.canStand(foot),false);assert.equal(world.firstHit(rayTo(origin,p)).furnitureMotionId,first.id);
  scene.toggle(scope,item.id,hit.point,hit.furnitureMotionId);advance(scene);assert.deepEqual(scene.getMotionState(scope,item.id)[0].matrix.elements,closed.elements);assert.equal(JSON.stringify(workspace),before);
 }finally{scene.dispose();scene.dispose();}
});

test('sliding doors share rails without both swapping across a closed front; entering edit closes all assemblies',()=>{
 const scene=createApartmentEditorScene({nav}),item=make('sliding_wardrobe');try{scene.sync(ws(item));scene.toggle(scope,item.id,null,'sliding-door-0');advance(scene);let poses=scene.getMotionState(scope,item.id);assert.deepEqual(poses.map(m=>m.progress),[1,0]);scene.toggle(scope,item.id,null,'sliding-door-1');advance(scene);poses=scene.getMotionState(scope,item.id);assert.deepEqual(poses.map(m=>m.progress),[0,1]);assert(scene.setEditing(true));assert(scene.getMotionState(scope,item.id).every(m=>m.progress===0&&m.target===0));assert.equal(scene.toggle(scope,item.id),false);scene.setEditing(false);assert(scene.toggle(scope,item.id));}finally{scene.dispose();}
});

test('all mirrored and rotated buildings keep positive render matrices, open state through sync and stable GPU resources',()=>{
 for(const building of DISTRICT){const scene=createApartmentEditorScene({nav}),s={...scope,building:building.id},item={...make('kitchen_wall_glass'),yaw:Math.PI/2,y:1.4};try{const workspace=ws(item,s);scene.sync(workspace);const resources=new Set();scene.group.traverse(o=>{if(o.isMesh){resources.add(o.geometry);resources.add(o.material);}});const first=scene.getMotionState(s,item.id)[0];scene.toggle(s,item.id,null,first.id);advance(scene);for(let i=0;i<6;i++){scene.toggle(s,item.id,null,first.id);advance(scene);}scene.group.traverse(o=>{if(!o.isInstancedMesh)return;assert(resources.has(o.geometry)&&resources.has(o.material));const m=new T.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);assert(m.elements.every(Number.isFinite));assert(m.determinant()>0);}});
  scene.sync(workspace);assert.equal(scene.getMotionState(s,item.id)[0].progress,1);const m=scene.getMotionState(s,item.id)[0],p=m.bounds.getCenter(new T.Vector3()).applyMatrix4(m.matrix),normal=new T.Vector3(0,0,1).transformDirection(m.matrix),hit=scene.pick(rayTo(p.clone().addScaledVector(normal,1),p));assert(hit,building.id);assert.equal(hit.buildingId,building.id);
  scene.sync(emptyWorkspace());assert.equal(scene.stats.assemblies,0);scene.sync(workspace);assert.equal(scene.getMotionState(s,item.id)[0].progress,0,'removed cabinets lose temporary pose');
 }finally{scene.dispose();}}
});

test('room isolation and hidden editing drafts also hide animated door hit targets; non-cabinets never open the editor on tour',()=>{
 const scene=createApartmentEditorScene({nav}),item=make();try{scene.sync(ws(item));const b=DISTRICT.find(b=>b.id===scope.building),p=new T.Vector3(4,1,4).applyMatrix4(buildingTransform(b)),origin=new T.Vector3(4,1,6).applyMatrix4(buildingTransform(b)),ray=rayTo(origin,p);assert(scene.pick(ray));scene.updateView({building:scope.building,mode:'building',level:0,target:'unit:1:0',liveHiddenIds:[item.id]},{});assert.equal(scene.pick(ray),null);scene.sync(ws(make('sofa')));assert.equal(scene.toggle(scope,'cab'),false);}finally{scene.dispose();}
});
