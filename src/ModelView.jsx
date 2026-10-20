import {useEffect,useRef,useState,forwardRef,useImperativeHandle} from 'react';
import * as THREE from 'three';
import {createScenePresentation} from './scene-presentation.js';
import {installSceneEnvironment,configureSurfaceRenderer} from './scene-environment.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createKitchen} from './scene.js';
import {FloorPlan} from './PlanViews.jsx';
import {appliancePlacement,HOOD} from './appliances.mjs';
import {KITCHEN_SERVICE_POINTS} from './kitchen-electrical.mjs';
import {ElectricalCallouts} from './ElectricalCallouts.jsx';
import {electricalLabelsVisible} from './kitchen-visibility.mjs';
import {pickKitchenElectrical} from './electrical-picking.mjs';
const CAMERAS={eye:{pos:[2.7,1.62,3.15],target:[2.65,1.18,.3]},perspective:{pos:[7.25,4.6,7.7],target:[2.6,1.05,1.05]},front:{pos:[2.75,2.0,8.9],target:[2.75,1.18,.4]},island:{pos:[5.1,2.6,.9],target:[3.4,.9,1.95]}};
export const ModelView=forwardRef(function ModelView({settings,onSelect,onPartClick,onElectricalSelect,selectedElectricalId,cameraPreset='perspective',cameraRequest=0},ref){
 const electricalOverlay=useRef(),latestServices=useRef(settings);latestServices.current=settings;
 const host=useRef(),runtime=useRef(),model=useRef(),select=useRef(onSelect),partClick=useRef(onPartClick),electricalClick=useRef(onElectricalSelect),electricalShown=useRef(settings.showElectrical),labels=useRef([]),wasInspecting=useRef(false),roomPose=useRef(null);const [failed,setFailed]=useState(false);select.current=onSelect;partClick.current=onPartClick;electricalClick.current=onElectricalSelect;electricalShown.current=settings.showElectrical;
 useImperativeHandle(ref,()=>({
  zoom(dir){const r=runtime.current;if(!r)return;const delta=r.camera.position.clone().sub(r.controls.target).multiplyScalar(dir>0?.85:1.18);r.camera.position.copy(r.controls.target.clone().add(delta));r.controls.update();},
  home(){const r=runtime.current;if(!r)return;if(r.fitInspection){r.fitInspection();return;}const p=CAMERAS.perspective;r.camera.position.set(...p.pos);r.controls.target.set(...p.target);r.controls.update();},
  hoodDetail(){const r=runtime.current;if(!r||!model.current?.moduleGroups.has(HOOD.cabinetId))return;const fit=appliancePlacement();r.controls.target.set(fit.hoodX*.001,fit.hoodBottom*.001,(fit.hoodRear+HOOD.depth/2)*.001);r.camera.position.copy(r.controls.target).add(new THREE.Vector3(.32,-.54,.86));r.controls.minDistance=.35;r.controls.maxPolarAngle=Math.PI*.9;r.controls.update();},
  focusElectrical(id){const r=runtime.current,p=model.current?.serviceGroups.get(id);if(!r||!p)return;const v=p.userData.inspectionView;r.controls.target.set(...v.target);r.camera.position.set(...v.from);r.controls.minDistance=.35;r.controls.maxDistance=15;r.controls.update();},
  capture(){const r=runtime.current;if(!r)return null;r.draw();return r.renderer.domElement.toDataURL('image/png');}
 }));
 useEffect(()=>{
  let renderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;configureSurfaceRenderer(renderer);
  const scene=new THREE.Scene();const disposeEnvironment=installSceneEnvironment(renderer,scene);scene.background=new THREE.Color('#eeeae2');
  const camera=new THREE.PerspectiveCamera(39,1,.05,60);camera.position.set(...CAMERAS.perspective.pos);
  const presentation=createScenePresentation(renderer,scene,camera);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...CAMERAS.perspective.target);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=2;controls.maxDistance=15;controls.minPolarAngle=.18;controls.maxPolarAngle=Math.PI/2-.02;controls.enablePan=true;controls.update();
  host.current.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive 3D kitchen. Drag to orbit, scroll to zoom, click a specific door or drawer to open or close it.');renderer.domElement.setAttribute('role','img');
  const r={scene,camera,controls,renderer};runtime.current=r;r.draw=()=>presentation.render(latestServices.current.renderQuality,{transparentCabinets:latestServices.current.cabinetVisibility==='translucent'});
  const resize=()=>{const w=host.current?.clientWidth||900,h=host.current?.clientHeight||600;renderer.setSize(w,h);presentation.resize(w,h);camera.aspect=w/h;camera.fov=camera.aspect<1?55:camera.aspect<1.2?45:39;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host.current);resize();
  let frame;const tick=()=>{frame=requestAnimationFrame(tick);controls.update();r.draw();
   labels.current.forEach(el=>{if(!el)return;const point=new THREE.Vector3(...el.dataset.point.split(',').map(Number)).project(camera);el.style.left=(point.x*.5+.5)*host.current.clientWidth+'px';el.style.top=(-point.y*.5+.5)*host.current.clientHeight+'px';el.style.opacity=point.z<1?'1':'0';});
   if(electricalOverlay.current){const width=host.current.clientWidth,height=host.current.clientHeight;const anchors=KITCHEN_SERVICE_POINTS.filter(p=>!p.water||latestServices.current.showWater!==false).map(p=>{const v=new THREE.Vector3(...p.position).project(camera);return {id:p.id,x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height,visible:v.z>-1&&v.z<1&&Math.abs(v.x)<1.15&&Math.abs(v.y)<1.15};});electricalOverlay.current.update(anchors,width,height,{top:8,bottom:8});}
  };tick();
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();const pointers=new Set();let down=null,multiTouch=false;
  const hitAt=e=>{const bounds=renderer.domElement.getBoundingClientRect();if(electricalShown.current){const fixture=pickKitchenElectrical({model:model.current,camera,bounds,clientX:e.clientX,clientY:e.clientY,radius:e.pointerType==='touch'?26:19});if(fixture)return fixture;}pointer.set((e.clientX-bounds.left)/bounds.width*2-1,-(e.clientY-bounds.top)/bounds.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(model.current?.picks||[]).find(h=>!h.object.userData.electricalId);};
  const start=e=>{pointers.add(e.pointerId);if(pointers.size===1){down={id:e.pointerId,x:e.clientX,y:e.clientY};multiTouch=false;}else multiTouch=true;};
  const end=e=>{const click=down&&down.id===e.pointerId&&!multiTouch&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<=6&&(e.pointerType!=='mouse'||e.button===0);pointers.delete(e.pointerId);if(!pointers.size)down=null;if(!click)return;const hit=hitAt(e);if(hit?.object.userData.electricalId)electricalClick.current?.(hit.object.userData.electricalId);else if(hit?.object.userData.openingId)partClick.current?.(hit.object.userData.openingId);else select.current(hit?.object.userData.id||null);};
  const hover=e=>{if(pointers.size)return;const data=hitAt(e)?.object.userData;renderer.domElement.style.cursor=data?.openingId||data?.electricalId?'pointer':'grab';};
  const cancel=e=>{pointers.delete(e.pointerId);down=null;};
  renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('pointermove',hover);renderer.domElement.addEventListener('pointercancel',cancel);
  const onLost=e=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',onLost);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',end);renderer.domElement.removeEventListener('pointermove',hover);renderer.domElement.removeEventListener('pointercancel',cancel);renderer.domElement.removeEventListener('webglcontextlost',onLost);if(model.current){scene.remove(model.current.group);model.current.dispose();model.current=null;}presentation.dispose();disposeEnvironment();renderer.dispose();renderer.domElement.remove();runtime.current=null;};
 },[]);
 const visualKey=JSON.stringify([settings.base,settings.upper,settings.stone,settings.hardware,settings.floor,settings.light,settings.intensity,settings.led,settings.openParts,settings.activePart,settings.inspection,settings.selected,settings.dimensions,settings.showElectrical,settings.showWater,settings.cabinetVisibility,selectedElectricalId]);
 useEffect(()=>{const r=runtime.current;if(!r)return;if(model.current){r.scene.remove(model.current.group);model.current.dispose();}model.current=createKitchen({...settings,selectedElectricalId});r.scene.add(model.current.group);r.scene.background.set(settings.light==='day'?'#eeeae2':'#bcb8b0');},[visualKey]);
 useEffect(()=>{
  const r=runtime.current;if(!r)return;
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
 },[settings.inspection,settings.selected]);
 useEffect(()=>{const r=runtime.current,p=CAMERAS[cameraPreset];if(!r||!p||settings.inspection)return;r.camera.position.set(...p.pos);r.controls.target.set(...p.target);r.controls.update();},[cameraPreset,cameraRequest]);
 const dimLabels=[['5,450 mm',[2.725,2.83,-.15]],['3,300 mm',[-.15,2.83,1.65]],['2,440 mm',[3.4,1.02,2.58]],['≈ 980 mm',[4.79,.12,1.11]]];
 const nameLabels=settings.lang==='he'?[['כיור',[1.91,1.15,.4]],['כיריים',[3.88,1.15,.4]],['מקרר',[.6,1.98,2.78]],['אי',[3.4,1.15,2.1]]]:[['Sink',[1.91,1.15,.4]],['Induction',[3.88,1.15,.4]],['Fridge',[.6,1.98,2.78]],['Island',[3.4,1.15,2.1]]];
 return <div className="model-surface" ref={host}>{failed&&<div className="webgl-fallback"><p>{settings.lang==='he'?'תלת־ממד אינו זמין במכשיר זה. תוכנית המידות זמינה כאן.':'3D is unavailable on this device. Your dimensioned plan is available below.'}</p><FloorPlan settings={{...settings,selectedElectricalId}} onSelect={onSelect} onElectricalSelect={onElectricalSelect}/></div>}{!failed&&<><div className="projection-labels">{[...(settings.dimensions&&!settings.inspection?dimLabels:[]),...(settings.labels&&!settings.inspection?nameLabels:[])].map(([name,p],i)=><span className={i<dimLabels.length&&settings.dimensions?'dimension-label':'object-label'} ref={el=>labels.current[i]=el} data-point={p.join(',')} key={name}>{name}</span>)}</div>{settings.showElectrical&&electricalLabelsVisible(settings)&&!settings.inspection&&<ElectricalCallouts ref={electricalOverlay} points={KITCHEN_SERVICE_POINTS.filter(p=>!p.water||settings.showWater!==false)} selectedId={selectedElectricalId} lang={settings.lang} onSelect={onElectricalSelect}/>}</>}</div>;
});
