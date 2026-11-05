import {loadFurnitureAssets} from '../public-view/furniture-assets.mjs';
import {SceneLoading} from './LoadingIndicator.jsx';
import {waitForScenePaint,scheduleSceneWork} from './scene-work.mjs';
import {createSceneBusyOverlay} from './scene-busy-overlay.mjs';
import {installCelestialSky} from './celestial-sky-scene.mjs';
import './photoreal.css';
import {installPhotorealRenderer} from './photoreal-renderer.mjs';
import {SceneRecoveryNotice,useSceneRecovery} from './SceneRecovery.jsx';
import {bindSceneLifecycle,saveScenePose,restoreScenePose,releaseSceneRenderer} from './scene-lifecycle.mjs';
import {useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import * as THREE from 'three';
import {createScenePresentation} from './scene-presentation.js';
import {installSceneEnvironment,configureSurfaceRenderer} from './scene-environment.js';
import {applyDaylightPresentation} from './daylight-scene.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createKitchen} from './scene.js';
import {applySceneUiVisibility} from './scene-interface.mjs';
import {createVrRuntime} from './vr-runtime.mjs';
import {createKitchenVrNavigation} from './vr-navigation.mjs';
import {appliancePlacement,HOOD} from './appliances.mjs';
import {KITCHEN_SERVICE_POINTS} from './kitchen-electrical.mjs';
import {ElectricalCallouts} from './ElectricalCallouts.jsx';
import {electricalLabelsVisible} from './kitchen-visibility.mjs';
import {pickKitchenElectrical} from './electrical-picking.mjs';
const CAMERAS={eye:{pos:[2.7,1.62,3.15],target:[2.65,1.18,.3]},perspective:{pos:[7.25,4.6,7.7],target:[2.6,1.05,1.05]},front:{pos:[2.75,2.0,8.9],target:[2.75,1.18,.4]},island:{pos:[5.1,2.6,.9],target:[3.4,.9,1.95]}};
export const ModelView=forwardRef(function ModelView({settings,onSelect,onPartClick,onElectricalSelect,selectedElectricalId,cameraPreset='perspective',cameraRequest=0,onVRState,onVRPartClick},ref){
 const electricalOverlay=useRef(),latestServices=useRef(settings),vrCallbacks=useRef();latestServices.current=settings;vrCallbacks.current={onVRState,onVRPartClick};
 const [scenePending,setScenePending]=useState(true);const [scenePercent,setScenePercent]=useState(0);
 const [vrActive,setVrActive]=useState(false);
 const recovery=useSceneRecovery(),generation=recovery.generation,savedPose=useRef(null),presetRef=useRef(cameraPreset);presetRef.current=cameraPreset;
 const poseKey=()=>JSON.stringify([latestServices.current.inspection,latestServices.current.selected,presetRef.current]);
 const host=useRef(),runtime=useRef(),model=useRef(),select=useRef(onSelect),partClick=useRef(onPartClick),electricalClick=useRef(onElectricalSelect),electricalShown=useRef(settings.showElectrical),labels=useRef([]),wasInspecting=useRef(false),roomPose=useRef(null);select.current=onSelect;partClick.current=onPartClick;electricalClick.current=onElectricalSelect;electricalShown.current=settings.showElectrical;
 useImperativeHandle(ref,()=>({
  toggleVR(){return runtime.current?.vr?.toggle();},
  isVRActive(){return runtime.current?.vr?.active===true;},
  endVR(){return runtime.current?.vr?.end();},
  zoom(dir){const r=runtime.current;if(!r)return;const delta=r.camera.position.clone().sub(r.controls.target).multiplyScalar(dir>0?.85:1.18);r.camera.position.copy(r.controls.target.clone().add(delta));r.controls.update();},
  home(){const r=runtime.current;if(!r)return;if(r.fitInspection){r.fitInspection();return;}const p=CAMERAS.perspective;r.camera.position.set(...p.pos);r.controls.target.set(...p.target);r.controls.update();},
  hoodDetail(){const r=runtime.current;if(!r||!model.current?.moduleGroups.has(HOOD.cabinetId))return;const fit=appliancePlacement();r.controls.target.set(fit.hoodX*.001,fit.hoodBottom*.001,(fit.hoodRear+HOOD.depth/2)*.001);r.camera.position.copy(r.controls.target).add(new THREE.Vector3(.32,-.54,.86));r.controls.minDistance=.35;r.controls.maxPolarAngle=Math.PI*.9;r.controls.update();},
  focusElectrical(id){const r=runtime.current,p=model.current?.serviceGroups.get(id);if(!r||!p)return;const v=p.userData.inspectionView;r.controls.target.set(...v.target);r.camera.position.set(...v.from);r.controls.minDistance=.35;r.controls.maxDistance=15;r.controls.update();},
  async capture(){const r=runtime.current;if(!r||r.rebuilding||r.capturing)return null;const loading=createSceneBusyOverlay(host.current);r.capturing=true;loading.show(latestServices.current.lang==='he'?'מכין תמונה לשמירה…':'Preparing image export…');try{await waitForScenePaint();if(runtime.current!==r)return null;loading.setProgress(20);const photo=r.photo?.capture();if(photo){loading.setProgress(100);return photo;}r.photo?.suspend();r.draw();loading.setProgress(80);const image=r.renderer.domElement.toDataURL('image/png');loading.setProgress(100);return image;}catch{return null;}finally{r.capturing=false;loading.dispose();}}
 }));
 useEffect(()=>{
  setScenePending(true);
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}catch{recovery.unavailable();vrCallbacks.current.onVRState?.({status:'unsupported',reason:'webgl'});return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;configureSurfaceRenderer(renderer);
  const scene=new THREE.Scene();const disposeEnvironment=installSceneEnvironment(renderer,scene);scene.background=new THREE.Color('#eeeae2');
  const camera=new THREE.PerspectiveCamera(39,1,.05,60);camera.position.set(...CAMERAS.perspective.pos);
  const presentation=createScenePresentation(renderer,scene,camera);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...CAMERAS.perspective.target);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=2;controls.maxDistance=15;controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI/2-.02;controls.enablePan=true;controls.update();
  host.current.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive 3D kitchen. Drag to orbit, scroll to zoom, click a specific door or drawer to open or close it.');renderer.domElement.setAttribute('role','img');
  const sky=installCelestialSky({renderer,scene,camera,getSettings:()=>latestServices.current,onDaylight:value=>model.current?.updateDaylight(value),kitchen:true});
  const photo=installPhotorealRenderer({renderer,scene,camera,host:host.current,lang:()=>latestServices.current.lang});
  const r={scene,camera,controls,renderer};runtime.current=r;r.assetAbort=new AbortController();r.photo=photo;r.draw=()=>{sky.update({focus:camera.position});presentation.render(latestServices.current.renderQuality,{transparentCabinets:latestServices.current.cabinetVisibility==='translucent'});photo.render();};
  r.vr=createVrRuntime({renderer,scene,camera,controls,getModel:()=>model.current,getStart:()=>({position:[r.navigation?.start[0]||2.725,0,r.navigation?.start[1]||1.1],yaw:0}),move:(p,d)=>r.navigation?.move(p,d)||p,canTeleport:p=>r.navigation?.canStand(p)===true,onState:s=>{setVrActive(s.status==='presenting');vrCallbacks.current.onVRState?.(s);},onSelect:d=>{if(d.openingId)vrCallbacks.current.onVRPartClick?.(d.openingId);}});
  const resize=()=>{const w=host.current?.clientWidth||900,h=host.current?.clientHeight||600;renderer.setSize(w,h);presentation.resize(w,h);camera.aspect=w/h;camera.fov=camera.aspect<1?55:camera.aspect<1.2?45:39;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host.current);resize();
  const tick=(time,frame)=>{if(r.rebuilding||r.capturing)return;if(renderer.xr.isPresenting)r.vr.update(time,frame);else controls.update();r.draw();if(model.current&&!r.firstFrame){r.firstFrame=true;setScenePercent(100);setScenePending(false);}if(renderer.xr.isPresenting)return;
   labels.current.forEach(el=>{if(!el)return;const point=new THREE.Vector3(...el.dataset.point.split(',').map(Number)).project(camera);el.style.left=(point.x*.5+.5)*host.current.clientWidth+'px';el.style.top=(-point.y*.5+.5)*host.current.clientHeight+'px';el.style.opacity=point.z<1?'1':'0';});
   if(electricalOverlay.current){const width=host.current.clientWidth,height=host.current.clientHeight;const anchors=KITCHEN_SERVICE_POINTS.filter(p=>!p.water||latestServices.current.showWater!==false).map(p=>{const v=new THREE.Vector3(...p.position).project(camera);return {id:p.id,x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15};});electricalOverlay.current.update(anchors,width,height,{top:8,bottom:8});}
  };renderer.setAnimationLoop(tick);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const pointers=new Set();let down=null,multiTouch=false;
  const hitAt=e=>{const bounds=renderer.domElement.getBoundingClientRect();if(electricalShown.current){const fixture=pickKitchenElectrical({model:model.current,camera,bounds,clientX:e.clientX,clientY:e.clientY,radius:e.pointerType==='touch'?26:19});if(fixture)return fixture;}pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(model.current?.picks||[]).find(h=>!h.object.userData.electricalId);};
  const start=e=>{pointers.add(e.pointerId);if(pointers.size===1){down={id:e.pointerId,x:e.clientX,y:e.clientY};multiTouch=false;}else multiTouch=true;};
  const end=e=>{const click=down&&down.id===e.pointerId&&!multiTouch&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6&&(e.pointerType!=='mouse'||e.button===0);pointers.delete(e.pointerId);if(!pointers.size)down=null;if(!click)return;const hit=hitAt(e);if(hit?.object.userData.electricalId)electricalClick.current?.(hit.object.userData.electricalId);else if(hit?.object.userData.openingId)partClick.current?.(hit.object.userData.openingId);else select.current(hit?.object.userData.id||null);};
  const hover=e=>{if(pointers.size)return;const data=hitAt(e)?.object.userData;renderer.domElement.style.cursor=data?.openingId||data?.electricalId?'pointer':'grab';};
  const cancel=e=>{pointers.delete(e.pointerId);down=null;};
  renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('pointercancel',cancel);
  const lifecycle=bindSceneLifecycle({canvas:renderer.domElement,renderer,onLost(){recovery.lost();void r.vr.end();},onSuspend(){down=null;pointers.clear();renderer.setAnimationLoop(null);},onResume(){renderer.setAnimationLoop(tick);},onRestart:()=>recovery.restart(true)});
  return()=>{r.assetAbort.abort();r.furnitureAssets?.dispose();savedPose.current=saveScenePose(r,poseKey());lifecycle.dispose();renderer.setAnimationLoop(null);r.vr.dispose();observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',end);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('pointercancel',cancel);if(model.current){scene.remove(model.current.group);model.current.dispose();model.current=null;}sky.dispose();photo.dispose();presentation.dispose();disposeEnvironment();releaseSceneRenderer(renderer);runtime.current=null;};
 },[generation]);
 const visualKey=JSON.stringify([settings.base,settings.upper,settings.stone,settings.hardware,settings.floor,settings.buildingShadows,settings.lampsOn,settings.light,settings.intensity,settings.led,settings.openParts,settings.activePart,settings.inspection,settings.selected,settings.dimensions,settings.showElectrical,settings.showWater,settings.showLighting,settings.lightControls,settings.cabinetVisibility,selectedElectricalId,vrActive]);
 useEffect(()=>{const r=runtime.current;if(!r)return;setScenePending(true);r.rebuilding=true;r.firstFrame=false;r.photo?.suspend();setScenePercent(0);const version=r.furnitureBuild=(r.furnitureBuild||0)+1;const rebuild=async()=>{r.furniturePromise??=loadFurnitureAssets({signal:r.assetAbort.signal,onProgress:fraction=>{if(runtime.current===r&&version===r.furnitureBuild)setScenePercent(10+fraction*60);}});r.furnitureAssets=await r.furniturePromise;if(runtime.current!==r||r.assetAbort.signal.aborted||version!==r.furnitureBuild)return;setScenePercent(75);if(model.current){r.scene.remove(model.current.group);model.current.dispose();}model.current=createKitchen({...settings,inspection:vrActive?false:settings.inspection,selectedElectricalId});r.furnitureAssets.apply(model.current.group);r.scene.add(model.current.group);r.navigation=createKitchenVrNavigation(model.current);applyDaylightPresentation(r.scene,settings);model.current?.updateDaylight?.(settings);applySceneUiVisibility(model.current,{...settings,cleanView:settings.cleanView||vrActive});r.fitInspection?.();if(savedPose.current){restoreScenePose(r,savedPose.current,poseKey());savedPose.current=null;}r.rebuilding=false;setScenePercent(95);};if(r.renderer.xr.isPresenting){void rebuild().catch(()=>{r.rebuilding=false;recovery.unavailable();});return;}return scheduleSceneWork(rebuild,{onError:()=>{r.rebuilding=false;setScenePending(false);recovery.unavailable();}});},[visualKey,generation]);
 useEffect(()=>{const r=runtime.current;if(!r)return;model.current?.updateDaylight(settings);applyDaylightPresentation(r.scene,settings);},[settings.solar,settings.light,visualKey,generation]);
 useEffect(()=>{
  const r=runtime.current;if(!r||r.renderer.xr.isPresenting)return;
  if(settings.inspection&&settings.selected){
   if(!wasInspecting.current)roomPose.current={position:r.camera.position.clone(),target:r.controls.target.clone()};
   wasInspecting.current=true;
   r.fitInspection=()=>{
    const unit=model.current?.moduleGroups.get(settings.selected);if(!unit)return;unit.updateWorldMatrix(true,true);
    const bounds=new THREE.Box3().setFromObject(unit),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
    const front=new THREE.Vector3(0,0,1).applyQuaternion(unit.getWorldQuaternion(new THREE.Quaternion())),right=new THREE.Vector3(1,0,0).applyQuaternion(unit.getWorldQuaternion(new THREE.Quaternion()));
    const distance=Math.max(size.y*2.2,size.x*2.1,1.7)*(r.camera.aspect<1?1.15:1);
    r.controls.target.copy(center);r.camera.position.copy(center).addScaledVector(front,distance).addScaledVector(right,distance*.18);r.camera.position.y+=distance*.25;r.controls.minDistance=.55;r.controls.maxDistance=8;r.controls.maxPolarAngle=Math.PI*.9;r.controls.update();
   };r.fitInspection();
  }else if(wasInspecting.current){
   wasInspecting.current=false;r.fitInspection=null;r.controls.minDistance=2;r.controls.maxDistance=15;r.controls.maxPolarAngle=Math.PI/2-.02;
   if(roomPose.current){r.camera.position.copy(roomPose.current.position);r.controls.target.copy(roomPose.current.target);}else{r.camera.position.set(...CAMERAS[cameraPreset].pos);r.controls.target.set(...CAMERAS[cameraPreset].target);}r.controls.update();
  }
 },[settings.inspection,settings.selected,generation]);
 useEffect(()=>{const r=runtime.current,p=CAMERAS[cameraPreset];if(!r||!p||settings.inspection||r.renderer.xr.isPresenting)return;r.camera.position.set(...p.pos);r.controls.target.set(...p.target);r.controls.update();},[cameraPreset,cameraRequest,generation]);
 useEffect(()=>{applySceneUiVisibility(model.current,{...settings,cleanView:settings.cleanView||vrActive});},[visualKey,settings.cleanView,vrActive,generation]);
 const dimLabels=[['5,450 mm',[2.725,2.83,-.15]],['3,300 mm',[-.15,2.83,1.65]],['2,440 mm',[3.4,1.02,2.58]],['≈ 980 mm',[4.79,.12,1.11]]];
 const nameLabels=settings.lang==='he'?[['כיור',[1.91,1.15,.4]],['כיריים',[3.88,1.15,.4]],['מקרר',[.6,1.98,2.78]],['אי',[3.4,1.15,2.1]]]:[['Sink',[1.91,1.15,.4]],['Induction',[3.88,1.15,.4]],['Fridge',[.6,1.98,2.78]],['Island',[3.4,1.15,2.1]]];
 return <div className="model-surface" ref={host}>{recovery.status==='ready'&&!vrActive&&<SceneLoading pending={scenePending} progress={scenePercent} lang={settings.lang} message={settings.lang==='he'?'טוען את המטבח…':'Loading kitchen…'}/>}<SceneRecoveryNotice status={recovery.status} dismissed={recovery.dismissed} lang={settings.lang} onRetry={()=>recovery.restart()} onDismiss={recovery.dismiss}/><><div className="projection-labels" hidden={settings.cleanView||vrActive}>{[...(settings.dimensions&&!settings.inspection?dimLabels:[]),...(settings.labels&&!settings.inspection?nameLabels:[])].map(([name,p],i)=><span className={i<dimLabels.length&&settings.dimensions?'dimension-label':'object-label'} ref={el=>labels.current[i]=el} data-point={p.join(',')} key={name}>{name}</span>)}</div>{!settings.cleanView&&!vrActive&&settings.showElectrical&&electricalLabelsVisible(settings)&&!settings.inspection&&<ElectricalCallouts ref={electricalOverlay} points={KITCHEN_SERVICE_POINTS.filter(p=>!p.water||settings.showWater!==false)} selectedId={selectedElectricalId} lang={settings.lang} onSelect={onElectricalSelect}/>}</></div>;
});
