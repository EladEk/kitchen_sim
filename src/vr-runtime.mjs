import * as THREE from 'three';
import {objectVisible} from './kitchen-visibility.mjs';

const dead=v=>Math.abs(v||0)<.2?0:Math.max(-1,Math.min(1,v));
export function vrInput(sources=[]){
 const pads=[...sources].filter(s=>s.gamepad),left=pads.find(s=>s.handedness==='left'),right=pads.find(s=>s.handedness==='right'),axes=s=>{const a=s?.gamepad.axes||[],i=a.length>=4?2:0;return [dead(a[i]),dead(a[i+1])];};
 const [x,y]=axes(left||right||pads[0]),[turn]=axes(right),length=Math.max(1,Math.hypot(x,y));
 return {side:left?x/length:0,forward:(-y/length)||0,turn,exit:pads.some(s=>s.gamepad.mapping==='xr-standard'&&s.gamepad.buttons?.[5]?.pressed)};
}

// Ray selection stops at the first visible surface, including unselectable walls.
export function vrSurfaceHit(root,raycaster){
 if(!root)return null;
 return raycaster.intersectObject(root,true).find(h=>h.object.isMesh&&objectVisible(h.object)&&!['electrical-annotation-hit','electrical-highlight'].includes(h.object.userData.part)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m?.visible!==false&&m?.opacity>=.2))||null;
}

export function createVrRuntime({renderer,scene,camera,controls,getStart,move,canTeleport,onSelect,onState=()=>{},getModel=()=>null,getFloorHeight=null,raycast=null,environment=globalThis}){
 const xr=renderer.xr,system=environment.navigator?.xr,rig=new THREE.Group(),ray=new THREE.Raycaster(),resources=[],controllers=[],bindings=[];
 let state={status:'checking'},session=null,pending=null,disposed=false,saved=null,calibrate=true,startPose=null,lastTime=null,lastRayTime=-Infinity,turnHeld=false,exitHeld=false,floor=true;
 const headLocal=new THREE.Vector3(),headOrientation=new THREE.Quaternion(),headWorld=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3();
 rig.name='vr-player-rig';xr.enabled=true;xr.setFramebufferScaleFactor?.(.9);xr.setFoveation?.(1);
 const emit=(status,reason)=>{state={status,...(reason?{reason}:{})};if(!disposed)onState(state);};
 const permitted=()=>environment.isSecureContext!==false&&(environment.document?.permissionsPolicy||environment.document?.featurePolicy)?.allowsFeature?.('xr-spatial-tracking')!==false;
 const landing=hit=>hit?.object.userData.navigationSurface&&hit.distance<=6&&canTeleport?.([hit.point.x,hit.point.z])?[hit.point.x,hit.point.z]:null;
 function teleport(target){
  if(!target||calibrate)return;
  rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);
  rig.position.x+=target[0]-headWorld.x;rig.position.z+=target[1]-headWorld.z;
  rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);
 }
 async function probe(){
  if(disposed||session)return state;
  if(!permitted()){emit('unsupported',environment.isSecureContext===false?'https':'policy');return state;}
  if(!system?.isSessionSupported){emit('unsupported','device');return state;}
  try{const supported=await system.isSessionSupported('immersive-vr');if(!disposed&&!session)emit(supported?'ready':'unsupported',supported?undefined:'device');}
  catch{if(!disposed&&!session)emit('unsupported','policy');}return state;
 }
 const deviceChange=()=>{void probe();};system?.addEventListener?.('devicechange',deviceChange);
 function restore(){
  const s=session;session=null;lastTime=null;lastRayTime=-Infinity;turnHeld=exitHeld=false;rig.removeFromParent();controllers.forEach(c=>{c.marker.visible=false;});
  if(saved){camera.removeFromParent();saved.parent?.add(camera);camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.scale.copy(saved.scale);camera.rotation.order=saved.order;if(renderer.shadowMap)renderer.shadowMap.enabled=saved.shadows;
   Object.assign(camera,saved.projection);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);controls.target.copy(saved.target);controls.enabled=saved.enabled;saved=null;}
  s?.removeEventListener('end',onEnd);if(!disposed)emit('ready');
 }
 const onEnd=()=>{queueMicrotask(()=>{if(session)restore();});};
 for(let i=0;i<2;i++){
  const controller=xr.getController(i),grip=xr.getControllerGrip(i),geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-1)]),material=new THREE.LineBasicMaterial({color:i?'#91c5ff':'#d4efbc'}),line=new THREE.Line(geometry,material);
  line.name='vr-pointer';line.scale.z=4;line.userData.vrHelper=true;controller.add(line);resources.push(geometry,material);
  const markerGeo=new THREE.RingGeometry(.13,.17,32),markerMat=new THREE.MeshBasicMaterial({color:'#55bf78',side:THREE.DoubleSide,depthWrite:false}),marker=new THREE.Mesh(markerGeo,markerMat);
  marker.name='vr-floor-target';marker.rotation.x=-Math.PI/2;marker.visible=false;scene.add(marker);resources.push(markerGeo,markerMat);
  // Local lightweight grip; no device-profile/CDN downloads are required.
  const bodyGeo=new THREE.CylinderGeometry(.022,.018,.1,12),bodyMat=new THREE.MeshStandardMaterial({color:'#e4e7e1',roughness:.7}),body=new THREE.Mesh(bodyGeo,bodyMat);body.rotation.x=Math.PI/2;body.userData.vrHelper=true;grip.add(body);resources.push(bodyGeo,bodyMat);
  const select=()=>{if(!session||!xr.isPresenting)return;if(!raycast)getModel()?.group.updateWorldMatrix(true,true);controller.updateWorldMatrix(true,false);ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);const hit=raycast?raycast(ray):vrSurfaceHit(getModel()?.group,ray),target=landing(hit);if(target)teleport(target);else if(hit&&!hit.object.userData.navigationSurface)onSelect?.(hit.object.userData,hit);};
  controller.addEventListener('select',select);bindings.push(()=>{controller.removeEventListener('select',select);controller.remove(line);grip.remove(body);marker.removeFromParent();});controllers.push({controller,grip,line,marker});rig.add(controller,grip);
 }
 async function start(){
  if(disposed)return null;if(session)return session;if(pending)return pending;
  if(!system?.requestSession||!permitted()||state.status==='unsupported'){emit('unsupported',!permitted()?'policy':'device');return null;}
  emit('requesting');
  // requestSession must execute synchronously in the user's click handler.
  let requested;try{requested=system.requestSession('immersive-vr',{optionalFeatures:['local-floor','layers']});}catch(e){emit('error',e.name==='NotAllowedError'?'permission':'runtime');return null;}
  pending=(async()=>{
   let created;
   try{
    created=await requested;if(disposed){await created.end();return null;}
    session=created;session.addEventListener('end',onEnd);let space;
    try{space=await session.requestReferenceSpace('local-floor');floor=true;}catch{space=await session.requestReferenceSpace('local');floor=false;}
    if(disposed||session!==created){await created.end();return null;}
    startPose=getStart();saved={parent:camera.parent,position:camera.position.clone(),quaternion:camera.quaternion.clone(),scale:camera.scale.clone(),order:camera.rotation.order,target:controls.target.clone(),enabled:controls.enabled,shadows:renderer.shadowMap?.enabled,projection:Object.fromEntries(['fov','aspect','near','far','zoom','focus','filmGauge','filmOffset'].map(k=>[k,camera[k]]))};
    controls.enabled=false;if(renderer.shadowMap)renderer.shadowMap.enabled=false;rig.position.set(startPose.position[0],(startPose.position[1]||0)+(floor?0:1.62),startPose.position[2]);rig.rotation.set(0,startPose.yaw||0,0);camera.position.set(0,0,0);camera.quaternion.identity();camera.scale.set(1,1,1);rig.add(camera);scene.add(rig);calibrate=true;lastTime=null;
    xr.setReferenceSpaceType(floor?'local-floor':'local');await xr.setSession(created);if(disposed||session!==created){await created.end();return null;}xr.setReferenceSpace(space);emit('presenting');return created;
   }catch(e){if(created){try{await created.end();}catch{}}restore();if(!disposed)emit('error',e.name==='NotAllowedError'||e.name==='SecurityError'?'permission':'runtime');return null;}
   finally{pending=null;}
  })();return pending;
 }
 async function end(){const s=session;if(!s)return;try{await s.end();}catch{if(session===s)restore();}}
 function update(time,frame){
  if(!session||!saved||!xr.isPresenting)return;
  const pose=frame?.getViewerPose(xr.getReferenceSpace());if(!pose){lastTime=time;return;}
  headLocal.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);headOrientation.set(pose.transform.orientation.x,pose.transform.orientation.y,pose.transform.orientation.z,pose.transform.orientation.w);
  if(calibrate){forward.set(0,0,-1).applyQuaternion(headOrientation);const localYaw=Math.atan2(-forward.x,-forward.z);rig.rotation.y=(startPose.yaw||0)-localYaw;rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);rig.position.x+=startPose.position[0]-headWorld.x;rig.position.z+=startPose.position[2]-headWorld.z;calibrate=false;}
  const dt=lastTime==null?0:Math.max(0,Math.min((time-lastTime)/1000,.05));lastTime=time;rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);
  const input=vrInput(session.inputSources);
  if(Math.abs(input.turn)<.25)turnHeld=false;
  if(Math.abs(input.turn)>.65&&!turnHeld){turnHeld=true;const old=headWorld.clone();rig.rotation.y-=Math.sign(input.turn)*Math.PI/6;rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);rig.position.x+=old.x-headWorld.x;rig.position.z+=old.z-headWorld.z;headWorld.copy(old);}
  forward.set(0,0,-1).applyQuaternion(headOrientation).applyAxisAngle(new THREE.Vector3(0,1,0),rig.rotation.y);forward.y=0;if(forward.lengthSq()<.001)forward.set(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),rig.rotation.y);forward.normalize();right.set(-forward.z,0,forward.x);
  const delta=[(forward.x*input.forward+right.x*input.side)*dt*1.25,(forward.z*input.forward+right.z*input.side)*dt*1.25],next=move?.([headWorld.x,headWorld.z],delta)||[headWorld.x+delta[0],headWorld.z+delta[1]];
  rig.position.x+=next[0]-headWorld.x;rig.position.z+=next[1]-headWorld.z;if(getFloorHeight)rig.position.y=getFloorHeight()+(floor?0:1.62);rig.updateMatrixWorld(true);headWorld.copy(headLocal).applyMatrix4(rig.matrixWorld);
  // Pointer feedback is sampled at 10 Hz; trigger selection always raycasts
  // immediately. Head tracking and movement remain at the headset frame rate.
  if(time-lastRayTime>100){lastRayTime=time;if(!raycast)getModel()?.group.updateWorldMatrix(true,true);
  for(const {controller,line,marker} of controllers){controller.updateWorldMatrix(true,false);ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);const hit=raycast?raycast(ray):vrSurfaceHit(getModel()?.group,ray),target=landing(hit);line.scale.z=hit?Math.min(6,hit.distance):4;marker.visible=!!target;if(target)marker.position.set(target[0],hit.point.y+.012,target[1]);}}
  if(input.exit&&!exitHeld){exitHeld=true;void end();}else if(!input.exit)exitHeld=false;
 }
 const ready=probe();
 return {ready,probe,start,end,toggle:()=>session?end():start(),update,get active(){return !!session&&xr.isPresenting;},get state(){return state;},pose:()=>session&&!calibrate?{x:headWorld.x,y:headWorld.y,z:headWorld.z,yaw:Math.atan2(-forward.x,-forward.z)}:null,
  dispose(){if(disposed)return;disposed=true;system?.removeEventListener?.('devicechange',deviceChange);const s=session;restore();if(s)void s.end().catch(()=>{});bindings.forEach(f=>f());controllers.forEach(({controller,grip})=>{controller.removeFromParent();grip.removeFromParent();});resources.forEach(r=>r.dispose());}
 };
}
