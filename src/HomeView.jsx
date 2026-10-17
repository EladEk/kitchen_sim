import {forwardRef,useEffect,useImperativeHandle,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createHomeScene} from './home-scene.js';
import {HOUSE,ROOMS,DOORS,getRoom,polygonBounds,roomAt,collisionBoxes,movePlayer,canStand,clearStandingPosition,findWalkPath,doorsOnPath} from './home-model.mjs';
import {HomePlan} from './HomePlan.jsx';

export const HomeView=forwardRef(function HomeView({settings,mode,selectedRoom,cameraRequest,kitchenSettings,onSelectRoom,onDoor,onShutter,onPart,onFurniture,onBuilding,onKitchen,onPosition,onOpenDoors,onTourState,onExitWalk,mobileMove},ref){
 const host=useRef(),runtime=useRef(),model=useRef(),labels=useRef([]),latest=useRef();
 latest.current={settings,mode,selectedRoom,onSelectRoom,onDoor,onShutter,onPart,onFurniture,onBuilding,onKitchen,onPosition,onOpenDoors,onTourState,onExitWalk,mobileMove};
 const [failed,setFailed]=useState(false);
 const stopTour=()=>{const r=runtime.current;if(r?.route){r.route=null;latest.current.onTourState?.(null);}};
 useImperativeHandle(ref,()=>({
  walkTo(id){const r=runtime.current;if(!r||latest.current.mode!=='walk')return false;const path=findWalkPath([r.camera.position.x,r.camera.position.z],getRoom(id).walk,latest.current.settings.furniture);if(!path){latest.current.onTourState?.('blocked');return false;}const doorIds=doorsOnPath(path);r.boxes=collisionBoxes([...new Set([...latest.current.settings.openDoors,...doorIds])],latest.current.settings.furniture,(latest.current.settings.closedShutters||[]).filter(id=>!doorIds.includes(id)));latest.current.onOpenDoors?.(doorIds);r.route={path,index:0,id};latest.current.onTourState?.(id);return true;},
  stop:stopTour,
  prepareCloseAll(){const r=runtime.current;if(!r)return;stopTour();r.keys.clear();r.boxes=collisionBoxes([],latest.current.settings.furniture);if(latest.current.mode==='walk'){const p=clearStandingPosition([r.camera.position.x,r.camera.position.z],r.boxes);if(p){r.camera.position.set(p[0],HOUSE.eyeHeight,p[1]);latest.current.onPosition?.({x:p[0],z:p[1],yaw:r.yaw,roomId:roomAt(p)});}}},
  home(){runtime.current?.fit();},
  zoom(dir){const r=runtime.current;if(!r||latest.current.mode==='walk')return;r.camera.position.copy(r.controls.target.clone().add(r.camera.position.clone().sub(r.controls.target).multiplyScalar(dir>0?.85:1.18)));r.controls.update();},
  capture(){const r=runtime.current;if(!r)return null;r.renderer.render(r.scene,r.camera);return r.renderer.domElement.toDataURL('image/png');}
 }));
 useEffect(()=>{
  let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});}catch{setFailed(true);return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();scene.background=new THREE.Color('#f0ede4');const camera=new THREE.PerspectiveCamera(44,1,.06,120);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=1.2;controls.maxDistance=55;controls.minPolarAngle=.08;controls.maxPolarAngle=Math.PI/2-.03;
  host.current.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Interactive house simulator. Drag to look around. In walking mode use WASD or arrow keys.');renderer.domElement.tabIndex=0;
  const r={scene,camera,controls,renderer,boxes:[],yaw:Math.PI,pitch:0,route:null,keys:new Set(),lastTime:performance.now(),lastPosition:0};runtime.current=r;
  r.fit=()=>{const {mode,selectedRoom}=latest.current,room=getRoom(selectedRoom);if(mode==='walk'){
    controls.enabled=false;const boxes=collisionBoxes(latest.current.settings.openDoors,latest.current.settings.furniture,latest.current.settings.closedShutters);let start=room.walk;if(!canStand(start,boxes)){const safePath=findWalkPath(room.walk,room.walk,latest.current.settings.furniture);start=safePath?.[0]||ROOMS[0].walk;}camera.position.set(start[0],HOUSE.eyeHeight,start[1]);r.yaw=room.id==='garden'?-Math.PI/2:Math.PI;r.pitch=0;camera.rotation.order='YXZ';camera.rotation.set(0,r.yaw,0);r.route=null;r.keys.clear();latest.current.onTourState?.(null);
   }else{controls.enabled=true;controls.target.set(3,0,8);if(mode==='room'){const b=polygonBounds(room.polygon),cx=(b.minX+b.maxX)/2,cz=(b.minZ+b.maxZ)/2,size=Math.max(b.maxX-b.minX,b.maxZ-b.minZ);controls.target.set(cx,.5,cz);const dist=Math.max(3,size*1.12)*(camera.aspect<1?1.25:1);camera.position.set(cx+dist*.7,dist*.95+1,cz+dist*.8);controls.minDistance=.65;}else{camera.position.set(22,25,30);controls.minDistance=5;if(camera.aspect<1)camera.position.multiplyScalar(1.22);}controls.update();}
  };
  const resize=()=>{const w=host.current?.clientWidth||900,h=host.current?.clientHeight||600;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=latest.current.mode==='walk'?65:camera.aspect<1?52:44;camera.updateProjectionMatrix();};const observer=new ResizeObserver(resize);observer.observe(host.current);resize();r.fit();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),pointers=new Set();let drag=null;
  const hitAt=e=>{const b=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1);ray.setFromCamera(pointer,camera);return ray.intersectObjects(model.current?.picks||[])[0]?.object.userData;};
  const start=e=>{pointers.add(e.pointerId);if(pointers.size===1){drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:e.clientX,py:e.clientY,moved:false};renderer.domElement.focus({preventScroll:true});if(latest.current.mode==='walk')renderer.domElement.setPointerCapture(e.pointerId);}else if(drag)drag.moved=true;};
  const move=e=>{if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.px,dy=e.clientY-drag.py;drag.px=e.clientX;drag.py=e.clientY;if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>5)drag.moved=true;if(latest.current.mode==='walk'&&pointers.size===1){r.yaw-=dx*.004;r.pitch=THREE.MathUtils.clamp(r.pitch-dy*.003,-1.1,1.1);}}
   else if(!pointers.size){const d=hitAt(e);renderer.domElement.style.cursor=d?.action?'pointer':latest.current.mode==='walk'?'crosshair':'grab';}};
  const end=e=>{const click=drag?.id===e.pointerId&&!drag.moved&&pointers.size===1&&(e.pointerType!=='mouse'||e.button===0);pointers.delete(e.pointerId);if(!pointers.size)drag=null;if(!click)return;const d=hitAt(e),c=latest.current;if(!d?.action)return;
   if(d.action==='door')c.onDoor?.(d.doorId);else if(d.action==='shutter')c.onShutter?.(d.shutterId);else if(d.action==='part')c.onPart?.(d.partId,d.furnitureId);else if(d.action==='furniture')c.onFurniture?.(d.furnitureId);else if(d.action==='building')c.onBuilding?.(d.buildingId);else if(d.action==='kitchen')c.onKitchen?.();else if(d.action==='room'&&c.mode!=='walk')c.onSelectRoom?.(d.roomId);
  };
  const cancel=e=>{pointers.delete(e.pointerId);drag=null;};
  const isTyping=()=>!!document.querySelector('[role="dialog"]')||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName);
  const keydown=e=>{if(latest.current.mode!=='walk'||isTyping())return;if(e.code==='Escape'){latest.current.onExitWalk?.();return;}if(['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)){e.preventDefault();r.keys.add(e.code);stopTour();}};
  const keyup=e=>r.keys.delete(e.code),blur=()=>{r.keys.clear();drag=null;pointers.clear();};
  for(const [name,handler] of [['pointerdown',start],['pointermove',move],['pointerup',end],['pointercancel',cancel]])renderer.domElement.addEventListener(name,handler);
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup);window.addEventListener('blur',blur);
  const lost=e=>{e.preventDefault();setFailed(true);};renderer.domElement.addEventListener('webglcontextlost',lost);
  let frame;const tick=now=>{frame=requestAnimationFrame(tick);const dt=Math.min((now-r.lastTime)/1000,.05);r.lastTime=now;const c=latest.current;
   for(const m of model.current?.motions||[]){const v=m.object[m.axis][m.property];m.object[m.axis][m.property]=THREE.MathUtils.lerp(v,m.target,Math.min(1,dt*11));}
   if(c.mode==='walk'){
    let dx=0,dz=0;const mobile=c.mobileMove||{};if((mobile.forward||mobile.back||mobile.left||mobile.right)&&r.route)stopTour();
    if(r.route){const {path,index}=r.route,target=path[index];if(target){const vx=target[0]-camera.position.x,vz=target[1]-camera.position.z,dist=Math.hypot(vx,vz);if(dist<.055)r.route.index++;else{const step=Math.min(dist,1.65*dt);dx=vx/dist*step;dz=vz/dist*step;const desired=Math.atan2(-vx,-vz),delta=Math.atan2(Math.sin(desired-r.yaw),Math.cos(desired-r.yaw));r.yaw+=delta*Math.min(1,dt*6);}}else{r.route=null;c.onTourState?.(null);}}
    else{let forward=(r.keys.has('KeyW')||r.keys.has('ArrowUp')||mobile.forward?1:0)-(r.keys.has('KeyS')||r.keys.has('ArrowDown')||mobile.back?1:0),side=(r.keys.has('KeyD')||mobile.right?1:0)-(r.keys.has('KeyA')||mobile.left?1:0);if(r.keys.has('ArrowLeft')||mobile.turnLeft)r.yaw+=dt*1.5;if(r.keys.has('ArrowRight')||mobile.turnRight)r.yaw-=dt*1.5;const length=Math.hypot(forward,side)||1;forward/=length;side/=length;dx=(-Math.sin(r.yaw)*forward+Math.cos(r.yaw)*side)*dt*1.85;dz=(-Math.cos(r.yaw)*forward-Math.sin(r.yaw)*side)*dt*1.85;}
    const p=movePlayer([camera.position.x,camera.position.z],[dx,dz],r.boxes);camera.position.set(p[0],HOUSE.eyeHeight,p[1]);camera.rotation.set(r.pitch,r.yaw,0,'YXZ');
    if(now-r.lastPosition>160){r.lastPosition=now;c.onPosition?.({x:p[0],z:p[1],yaw:r.yaw,roomId:roomAt(p)});}
   }else controls.update();
   renderer.render(scene,camera);
   labels.current.forEach(el=>{if(!el)return;const p=new THREE.Vector3(...el.dataset.point.split(',').map(Number)).project(camera);el.style.left=(p.x*.5+.5)*host.current.clientWidth+'px';el.style.top=(-p.y*.5+.5)*host.current.clientHeight+'px';el.style.visibility=p.z<1&&Math.abs(p.x)<.98&&Math.abs(p.y)<.98?'visible':'hidden';});
  };frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();for(const [name,handler] of [['pointerdown',start],['pointermove',move],['pointerup',end],['pointercancel',cancel]])renderer.domElement.removeEventListener(name,handler);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup);window.removeEventListener('blur',blur);renderer.domElement.removeEventListener('webglcontextlost',lost);if(model.current){scene.remove(model.current.group);model.current.dispose();model.current=null;}renderer.dispose();renderer.domElement.remove();runtime.current=null;};
 },[]);
 const visualKey=JSON.stringify([settings.rooms,settings.openDoors,settings.openParts,settings.closedShutters,settings.furniture,settings.light,settings.cutaway,mode,kitchenSettings]);
 useEffect(()=>{const r=runtime.current;if(!r)return;const previous=new Map((model.current?.motions||[]).map(m=>[m.id,m.object[m.axis][m.property]]));if(model.current){r.scene.remove(model.current.group);model.current.dispose();}model.current=createHomeScene(settings,{mode,selectedRoom,kitchenSettings});for(const m of model.current.motions)if(previous.has(m.id))m.object[m.axis][m.property]=previous.get(m.id);r.scene.add(model.current.group);r.boxes=collisionBoxes(settings.openDoors,settings.furniture,settings.closedShutters);r.scene.background.set(settings.light==='day'?'#f0ede4':'#777f79');},[visualKey]);
 useEffect(()=>{const r=runtime.current;if(!r)return;r.camera.fov=mode==='walk'?65:r.camera.aspect<1?52:44;r.camera.updateProjectionMatrix();r.fit();if(mode!=='walk'){r.route=null;r.keys.clear();onTourState?.(null);}},[mode,cameraRequest]);
 return <div className={`hs-model ${mode==='walk'?'hs-walk-model':''}`} ref={host}>{failed?<div className="hs-fallback"><p>{settings.lang==='he'?'תלת־ממד אינו זמין במכשיר זה. אפשר לבחור חדר בתוכנית הבית.':'3D is unavailable on this device. Explore the interactive floor plan.'}</p><HomePlan settings={settings} selectedRoom={selectedRoom} onSelect={onSelectRoom}/></div>:mode!=='walk'&&settings.labels&&<div className="hs-projection-labels">{ROOMS.filter(r=>mode==='overview'||r.id===selectedRoom).map((r,i)=><button key={r.id} ref={el=>labels.current[i]=el} data-point={[r.walk[0],.12,r.walk[1]].join(',')} className={selectedRoom===r.id?'active':''} onClick={()=>onSelectRoom(r.id)}>{settings.lang==='he'?r.he:r.en}</button>)}</div>}</div>;
});
