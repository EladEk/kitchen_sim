import {furnitureFootprintBoxes} from '../src/furniture-shape.mjs';
import {FURNITURE_PALETTE,furniturePartColor,furnitureMaterialProperties} from './furniture-palette.mjs';
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {dimensionedFurnitureParts} from '../src/dimensioned-furniture.mjs';
import {cabinetMotions} from '../src/cabinet-motion.mjs';
import {walkingInstanceCapacity} from './walking-display.mjs';
import {createSpatialCollisionIndex} from './walking-world.mjs';
import {DISTRICT,buildingTransform,mirroredGeometry} from './district.mjs';
import {normalizeWorkspace,parseScope,scopeKey,unitContext,itemInRoom} from './apartment-editing.mjs';

export function createApartmentEditorScene({nav,overrides=null}){
 const group=new T.Group();group.name='local-apartment-furniture';
 const cube=new T.BoxGeometry(1,1,1),soft=new RoundedBoxGeometry(1,1,1,2,.07),mirrors=new Map([[cube,mirroredGeometry(cube,[0,0])],[soft,mirroredGeometry(soft,[0,0])]]),palette={};
 for(const name of Object.keys(FURNITURE_PALETTE)){palette[name]=new T.MeshStandardMaterial({color:'#ffffff',...furnitureMaterialProperties(name)});palette[name].userData={architecturalInterior:true};}
 const proxy=new T.MeshBasicMaterial({colorWrite:false,depthWrite:false,transparent:true,opacity:1,side:T.DoubleSide}),flip=new T.Matrix4().makeScale(-1,1,1);
 const physicalMeshes=[],placements=[],visualBatches=[],assemblies=[],poses=new Map(),itemsByKey=new Map();
 const ghostMaterials=new Map();let ghostKey="",ghostTime=0;
 let index=null,disposed=false,focusedRoom=null,viewKey=null,editing=false;
 const itemKey=(scope,id)=>scope+'|'+id;
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 const inRoom=r=>!focusedRoom||r.scope.building===focusedRoom.building&&r.scope.floor===focusedRoom.floor&&r.scope.unit===focusedRoom.unit&&itemInRoom(r.item,{selectedRoom:focusedRoom,polygons:focusedRoom.polygons});
 function clear(){index?.dispose();index=null;group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group.clear();physicalMeshes.length=placements.length=visualBatches.length=assemblies.length=0;itemsByKey.clear();viewKey=null;ghostKey="";}
 function pose(m){
  const t=m.state.progress,tween=t*t*(3-2*t),p=m.spec.pivot;
  m.local.identity();
  if(p)m.local.makeTranslation(...p).multiply(new T.Matrix4().makeRotationY(m.spec.angle*tween)).multiply(new T.Matrix4().makeTranslation(-p[0],-p[1],-p[2]));
  else m.local.makeTranslation(...m.spec.delta.map(v=>v*tween));
  m.world.copy(m.record.base).multiply(m.local);m.inverse.copy(m.world).invert();
 }
 function refreshBatch(b){let count=0;for(const i of b.active){b.mesh.setMatrixAt(count,b.matrices[i]);b.mesh.setColorAt(count++,b.colors[i]);}b.mesh.count=count;b.mesh.instanceMatrix.needsUpdate=true;if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;b.mesh.computeBoundingSphere();}
 function updateMotion(m,changed){pose(m);for(const p of m.visuals){p.batch.matrices[p.index].copy(m.world).multiply(p.local);if(m.record.mirror)p.batch.matrices[p.index].multiply(flip);changed.add(p.batch);}}
 function sync(value){
  if(disposed)return;const workspace=normalizeWorkspace(value,nav),used=new Set();clear();
  for(const [key,record]of Object.entries(workspace.units)){
   const scope=parseScope(key,nav),context=unitContext(nav,scope,overrides),b=DISTRICT.find(b=>b.id===scope.building),transform=buildingTransform(b),root=new T.Group();
   root.userData={editorScope:key,editorBuilding:scope.building,editorFloor:scope.floor,editorUnit:scope.unit};group.add(root);const buckets=new Map();
   function add(geometry,material,m,physical=false,id=null,color='#ffffff'){
    const k=[geometry.uuid,material.uuid,physical].join(':');if(!buckets.has(k))buckets.set(k,{geometry,material,physical,matrices:[],ids:[],colors:[],active:[],scope,key,items:record.items});
    const batch=buckets.get(k),i=batch.matrices.length;batch.matrices.push(m.clone());batch.ids.push(id);batch.colors.push(new T.Color(color));batch.active.push(i);return {batch,index:i};
   }
   for(const item of record.items){
    const base=transform.clone().multiply(new T.Matrix4().makeTranslation(item.x,context.elevation+.03+(item.y||0),item.z)).multiply(new T.Matrix4().makeRotationY(item.yaw));
    const r={item,scope,key,base,inverse:base.clone().invert(),mirror:b.mirror,root,elevation:context.elevation+(item.y||0),hidden:false,motions:[]};placements.push(r);itemsByKey.set(itemKey(key,item.id),r);
    const parts=dimensionedFurnitureParts(item),byPart=new Map();
    for(const spec of cabinetMotions(item,parts)){
     const k=itemKey(key,item.id)+'|'+spec.id;used.add(k);const state=poses.get(k)||{progress:0,target:0};poses.set(k,state);if(editing)state.progress=state.target=0;
     const m={spec,state,record:r,box:new T.Box3(new T.Vector3(...spec.min),new T.Vector3(...spec.max)),local:new T.Matrix4(),world:new T.Matrix4(),inverse:new T.Matrix4(),visuals:[]};pose(m);assemblies.push(m);r.motions.push(m);for(const name of spec.parts)byPart.set(name,m);
    }
    for(const [x,z,w,d]of furnitureFootprintBoxes(item)){
     const physical=base.clone().multiply(new T.Matrix4().makeTranslation(x,item.h/2,z)).multiply(new T.Matrix4().makeScale(w,item.h,d));if(b.mirror)physical.multiply(flip);
     const ref=add(b.mirror?mirrors.get(cube):cube,proxy,physical,true,item.id);r.proxy=ref;
    }
    for(const part of parts){
     const [x,y,z,w,h,d]=part.box,geometry=/pillow|duvet|mattress|seat|back|arm/.test(part.part)?soft:cube,local=new T.Matrix4().makeTranslation(x,y,z).multiply(new T.Matrix4().makeScale(w,h,d)),motion=byPart.get(part.part),matrix=(motion?.world||base).clone().multiply(local);if(b.mirror)matrix.multiply(flip);
     const ref=add(b.mirror?mirrors.get(geometry):geometry,palette[part.material],matrix,false,item.id,furniturePartColor(item,part));if(motion)motion.visuals.push({...ref,local});
    }
   }
   for(const batch of buckets.values()){
    const mesh=new T.InstancedMesh(batch.geometry,batch.material,walkingInstanceCapacity(batch.matrices.length));batch.mesh=mesh;mesh.count=batch.matrices.length;
    batch.matrices.forEach((m,i)=>{mesh.setMatrixAt(i,m);if(!batch.physical)mesh.setColorAt(i,batch.colors[i]);});
    mesh.userData={editorPhysical:batch.physical,editorScope:key,editorBuilding:scope.building,editorItemIds:batch.ids,...(batch.physical?{action:'edit-furniture'}:{tourNonPhysical:true,renderFixture:true})};mesh.castShadow=!batch.physical&&!batch.material.transparent;mesh.receiveShadow=!batch.physical;mesh.computeBoundingSphere();root.add(mesh);if(!batch.physical){let material=ghostMaterials.get(batch.material);if(!material){material=batch.material.clone();material.transparent=true;material.opacity=.18;material.depthWrite=false;ghostMaterials.set(batch.material,material);}batch.ghost=new T.InstancedMesh(batch.geometry,material,walkingInstanceCapacity(batch.matrices.length));batch.ghost.count=0;batch.ghost.userData={tourNonPhysical:true,renderFixture:true};root.add(batch.ghost);}if(batch.physical)physicalMeshes.push(mesh);else visualBatches.push(batch);
   }
  }
  for(const k of poses.keys())if(!used.has(k))poses.delete(k);
  group.updateMatrixWorld(true);index=createSpatialCollisionIndex(group,{visibleOnly:false,include:o=>o.userData.editorPhysical});
 }
 function updateView(state,current){
  const active=current?.building?.id||state.building,walking=state.mode==='walk',floor=state.where?.floor??0,target=/^unit:(\d+):([0-8])$/.exec(state.target||''),focused=state.building!=='district'&&!walking&&(state.level!==9||!!state.target);
  focusedRoom=focused&&state.roomFocus&&state.roomFocus.building===active?state.roomFocus:null;
  for(const root of group.children){const d=root.userData;root.visible=walking?d.editorBuilding===active&&Math.abs(d.editorFloor-floor)<=1:focused?d.editorBuilding===active&&d.editorFloor<=Number(state.level)&&(!target||d.editorUnit===+target[1]&&d.editorFloor===+target[2]):true;}
  const hidden=new Set(state.liveHiddenIds||[]),next=(focusedRoom?`${active}:${focusedRoom.floor}:${focusedRoom.unit}:${focusedRoom.id}`:'all')+'|'+[...hidden].join(',');if(next===viewKey)return;viewKey=next;
  for(const r of placements)r.hidden=hidden.has(r.item.id);
  for(const b of visualBatches){const selected=focusedRoom&&b.scope.building===active&&b.scope.floor===focusedRoom.floor&&b.scope.unit===focusedRoom.unit,allowed=selected?new Set(b.items.filter(r=>itemInRoom(r,{selectedRoom:focusedRoom,polygons:focusedRoom.polygons})).map(r=>r.id)):null;b.active=[];for(let i=0;i<b.matrices.length;i++)if(!hidden.has(b.ids[i])&&(!allowed||allowed.has(b.ids[i])))b.active.push(i);refreshBatch(b);}
 }
 function occlusion(camera,target,enabled,now=performance.now()){
  if(enabled&&now-ghostTime<120)return;ghostTime=now;const ids=new Set();
  if(enabled){const direction=target.clone().sub(camera.position),distance=direction.length(),ray=new T.Ray(camera.position,direction.normalize());for(const r of placements){if(r.hidden||!visible(r.root)||!inRoom(r))continue;const local=ray.clone().applyMatrix4(r.inverse),hit=local.intersectBox(new T.Box3(new T.Vector3(-r.item.w/2,0,-r.item.d/2),new T.Vector3(r.item.w/2,r.item.h,r.item.d/2)),new T.Vector3());if(hit&&hit.applyMatrix4(r.base).distanceTo(camera.position)<distance-.1)ids.add(itemKey(r.key,r.item.id));}}
  const key=[...ids].sort().join(',')+'|'+viewKey;if(key===ghostKey)return;ghostKey=key;
  for(const b of visualBatches){let solid=0,ghost=0;for(const i of b.active){const mesh=ids.has(itemKey(b.key,b.ids[i]))?b.ghost:b.mesh,index=mesh===b.ghost?ghost++:solid++;mesh.setMatrixAt(index,b.matrices[i]);mesh.setColorAt(index,b.colors[i]);}for(const [mesh,count]of [[b.mesh,solid],[b.ghost,ghost]]){mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}}
 }
 function toggle(scope,id,point,motionId){
  if(disposed||editing)return false;const r=itemsByKey.get(itemKey(typeof scope==='string'?scope:scopeKey(scope),id));if(!r?.motions.length)return false;
  let m=r.motions.find(m=>m.spec.id===motionId);
  if(!m&&point){let best=Infinity;for(const candidate of r.motions){const p=point.clone().applyMatrix4(candidate.inverse),distance=candidate.box.distanceToPoint(p);if(distance<best){best=distance;m=candidate;}}}
  m ||= r.motions[0];m.state.target=m.state.target?0:1;
  if(m.spec.type==='slide-door'&&m.state.target)for(const other of r.motions)if(other!==m&&other.spec.type==='slide-door')other.state.target=0;
  return true;
 }
 function tick(dt){
  if(disposed)return false;const changed=new Set();for(const m of assemblies){const s=m.state;if(s.progress===s.target)continue;const step=Math.max(0,Math.min(dt,.1))/.32;s.progress=s.target> s.progress?Math.min(s.target,s.progress+step):Math.max(s.target,s.progress-step);updateMotion(m,changed);}
  for(const b of changed)refreshBatch(b);return changed.size>0;
 }
 function setEditing(value){
  const next=!!value;if(next===editing)return false;editing=next;if(!editing)return false;const changed=new Set();for(const m of assemblies)if(m.state.progress||m.state.target){m.state.progress=m.state.target=0;updateMotion(m,changed);}for(const b of changed)refreshBatch(b);return !!changed.size;
 }
 function blocksPosition(position,radius=.19){
  const feet=position.y-1.62;
  for(const r of placements){if(feet+.3>=r.elevation+.03+r.item.h||feet+1.2<r.elevation+.03)continue;const p=position.clone().applyMatrix4(r.inverse);if(furnitureFootprintBoxes(r.item).some(([cx,cz,w,d])=>Math.hypot(Math.max(0,Math.abs(p.x-cx)-w/2),Math.max(0,Math.abs(p.z-cz)-d/2))<radius))return true;}
  for(const m of assemblies){if(!m.state.progress)continue;const p=position.clone().applyMatrix4(m.inverse),{min,max}=m.box;if(p.y-1.62+.3>=max.y||p.y-1.62+1.2<min.y)continue;if(Math.hypot(Math.max(min.x-p.x,0,p.x-max.x),Math.max(min.z-p.z,0,p.z-max.z))<radius)return true;}
  return false;
 }
 function motionHit(ray,options={}){
  if(editing)return null;let closest=null;
  for(const m of assemblies){const r=m.record;if(r.hidden||!visible(r.root)||!inRoom(r))continue;
   const local=ray.ray.clone().applyMatrix4(m.inverse),p=local.intersectBox(m.box,new T.Vector3());if(!p)continue;
   if(options.floor&&Math.min(Math.abs(p.y-m.box.min.y),Math.abs(p.y-m.box.max.y))>.0001)continue;
   p.applyMatrix4(m.world);const distance=p.distanceTo(ray.ray.origin);if(distance<ray.near||distance>ray.far||closest&&distance>=closest.distance)continue;
   closest={distance,point:p,object:r.proxy.batch.mesh,instanceId:r.proxy.index,buildingId:r.scope.building,furnitureMotionId:m.spec.id};
  }
  return closest;
 }
 function closestHit(a,b){return b&&(!a||b.distance<a.distance+.00001)?b:a;}
 function pick(ray){
  const hit=ray.intersectObjects(physicalMeshes.filter(visible),false).find(hit=>{const r=itemsByKey.get(itemKey(hit.object.userData.editorScope,hit.object.userData.editorItemIds[hit.instanceId]));return r&&!r.hidden&&inRoom(r);})||null;if(hit)hit.buildingId=hit.object.userData.editorBuilding;return closestHit(hit,motionHit(ray));
 }
 return {group,sync,updateView,pick,occlusion,blocksPosition,toggle,tick,setEditing,
  firstHit(ray,options){const hit=index?.firstHit(ray,options)||null;if(hit)hit.buildingId=hit.object.userData.editorBuilding;return closestHit(hit,motionHit(ray,options));},
  getMotionState(scope,id){return (itemsByKey.get(itemKey(typeof scope==='string'?scope:scopeKey(scope),id))?.motions||[]).map(m=>({id:m.spec.id,type:m.spec.type,progress:m.state.progress,target:m.state.target,matrix:m.world.clone(),bounds:m.box.clone()}));},
  get stats(){return {...(index?.stats||{records:0}),assemblies:assemblies.length};},
  dispose(){if(disposed)return;disposed=true;clear();poses.clear();cube.dispose();soft.dispose();for(const g of mirrors.values())g.dispose();mirrors.clear();for(const m of Object.values(palette))m.dispose();for(const m of ghostMaterials.values())m.dispose();proxy.dispose();group.removeFromParent();}
 };
}
export function withApartmentEdits(base,edits){return {canStand:position=>!edits.blocksPosition(position)&&(base.canStand?.(position)??true),firstHit(ray,options={}){const a=base.firstHit(ray,options),b=edits.firstHit(ray,options);return b&&(!a||b.distance<a.distance)?b:a;},refreshVariant:(...a)=>base.refreshVariant(...a),refreshDoors:(...a)=>base.refreshDoors(...a),get memory(){return {...base.memory,indexBytes:(base.memory?.indexBytes||0)+(edits.stats.bufferBytes||0)};},get stats(){return base.stats;},dispose(){base.dispose();}};}
