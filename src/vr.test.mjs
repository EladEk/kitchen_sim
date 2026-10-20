import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createVrRuntime,vrInput,vrSurfaceHit} from './vr-runtime.mjs';
import {createKitchenVrNavigation} from './vr-navigation.mjs';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {createScenePresentation} from './scene-presentation.js';
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);
const settle=()=>new Promise(resolve=>setImmediate(resolve));
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

class Session extends THREE.EventDispatcher{
 constructor({localOnly=false}={}){super();this.localOnly=localOnly;this.inputSources=[];this.ended=0;}
 async requestReferenceSpace(type){if(this.localOnly&&type==='local-floor')throw Error('no floor');return {type};}
 async end(){this.ended++;this.dispatchEvent({type:'end'});}
}
function fixture({localOnly=false,request,supported=true,environment={},start={position:[2,0,4],yaw:0},move,canTeleport,onSelect,getModel}={}){
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(44,1.4,.06,120);camera.position.set(10,15,20);camera.rotation.set(.1,.6,.03);const parent=new THREE.Group();parent.add(camera);scene.add(parent);
 const controls={enabled:true,target:new THREE.Vector3(3,.5,8)},controllers=[new THREE.Group(),new THREE.Group()],grips=[new THREE.Group(),new THREE.Group()],sessions=[],states=[],requests=[],system=new THREE.EventDispatcher();
 system.isSessionSupported=async()=>supported;system.requestSession=(type,options)=>{requests.push({type,options});if(request)return request();const s=new Session({localOnly});sessions.push(s);return Promise.resolve(s);};
 const xr={enabled:false,isPresenting:false,setFramebufferScaleFactor(){},setFoveation(){},getController:i=>controllers[i],getControllerGrip:i=>grips[i],setReferenceSpaceType(type){this.type=type;},async setSession(s){this.session=s;this.isPresenting=true;s.addEventListener('end',()=>{this.isPresenting=false;this.session=null;});},setReferenceSpace(space){this.space=space;},getReferenceSpace(){return this.space;}};
 const renderer={xr,shadowMap:{enabled:true}},runtime=createVrRuntime({renderer,scene,camera,controls,getStart:()=>start,getModel,move,canTeleport,onSelect,onState:s=>states.push(s),environment:{isSecureContext:true,navigator:{xr:system},...environment}});
 return {runtime,scene,camera,parent,controls,controllers,grips,sessions,states,requests,system,renderer};
}
const frame=({x=0,y=1.65,z=0,yaw=0}={})=>({getViewerPose:()=>({transform:{position:{x,y,z},orientation:new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),yaw)}})});
const pad=(handedness,axes=[0,0,0,0])=>({handedness,gamepad:{mapping:'xr-standard',axes,buttons:Array.from({length:6},()=>({pressed:false}))}});

test('VR uses actual capability/HTTPS/policy checks and never requests a session on page load',async()=>{
 for(const options of [{supported:false},{environment:{navigator:{}}},{environment:{isSecureContext:false}},{environment:{document:{permissionsPolicy:{allowsFeature:()=>false}}}}]){
  const f=fixture(options);await f.runtime.ready;assert.equal(f.runtime.state.status,'unsupported');assert.equal(await f.runtime.start(),null);assert.equal(f.requests.length,0);f.runtime.dispose();
 }
 const f=fixture();await f.runtime.ready;assert.equal(f.runtime.state.status,'ready');assert.equal(f.requests.length,0);f.runtime.dispose();
});

test('enter VR requests immediately in the click call, prevents duplicate sessions and restores the desktop camera, orbit target and shadows',async()=>{
 const f=fixture();await f.runtime.ready;const before={position:f.camera.position.toArray(),q:f.camera.quaternion.toArray(),target:f.controls.target.toArray(),fov:f.camera.fov,aspect:f.camera.aspect};
 const a=f.runtime.start(),b=f.runtime.start();assert.equal(f.requests.length,1,'no await occurs before requestSession');await Promise.all([a,b]);assert.equal(f.requests.length,1);assert.equal(f.requests[0].type,'immersive-vr');assert.deepEqual(f.requests[0].options.optionalFeatures,['local-floor','layers']);assert.equal(f.renderer.xr.type,'local-floor');assert(f.runtime.active);assert.equal(f.controls.enabled,false);assert.equal(f.renderer.shadowMap.enabled,false);assert.equal(f.camera.parent.name,'vr-player-rig');assert.equal(f.camera.position.y,0);
 f.runtime.update(100,frame({x:.4,z:-.3,y:1.67,yaw:.7}));near(f.runtime.pose().x,2);near(f.runtime.pose().z,4);near(f.runtime.pose().y,1.67);near(f.runtime.pose().yaw,0);
 f.camera.position.set(1,2,3);f.camera.fov=85;await f.runtime.end();await settle();assert(!f.runtime.active);assert.equal(f.camera.parent,f.parent);assert.deepEqual(f.camera.position.toArray(),before.position);f.camera.quaternion.toArray().forEach((v,i)=>near(v,before.q[i]));assert.deepEqual(f.controls.target.toArray(),before.target);assert.equal(f.camera.fov,before.fov);assert.equal(f.camera.aspect,before.aspect);assert.equal(f.controls.enabled,true);assert.equal(f.renderer.shadowMap.enabled,true);assert.equal(f.scene.getObjectByName('vr-player-rig'),undefined);f.runtime.dispose();
});

test('a local-only reference space gets one eye-height offset while local-floor preserves actual tracked height',async()=>{
 const f=fixture({localOnly:true});await f.runtime.ready;await f.runtime.start();assert.equal(f.renderer.xr.type,'local');f.runtime.update(0,frame({y:0}));near(f.runtime.pose().y,1.62);near(f.camera.parent.scale.x,1);await f.runtime.end();await settle();f.runtime.dispose();
});

test('head-relative joystick walking uses the collision callback and snap turns once per deflection around the tracked head',async()=>{
 const movements=[],f=fixture({move:(p,d)=>{movements.push({p,d});return [p[0],p[1]+Math.max(0,d[1])];}});await f.runtime.ready;await f.runtime.start();const left=pad('left',[0,0,0,-1]),right=pad('right');f.sessions[0].inputSources=[left,right];
 f.runtime.update(0,frame({x:.35,z:.2}));f.runtime.update(20,frame({x:.35,z:.2}));near(f.runtime.pose().z,4,'blocked movement does not penetrate the wall');near(movements.at(-1).d[1],-.025);
 left.gamepad.axes[3]=0;right.gamepad.axes[2]=1;f.runtime.update(40,frame({x:.35,z:.2}));const a=f.runtime.pose();near(a.x,2);near(a.z,4);near(a.yaw,-Math.PI/6);f.runtime.update(60,frame({x:.35,z:.2}));near(f.runtime.pose().yaw,a.yaw);right.gamepad.axes[2]=0;f.runtime.update(80,frame({x:.35,z:.2}));right.gamepad.axes[2]=1;f.runtime.update(100,frame({x:.35,z:.2}));near(f.runtime.pose().yaw,-Math.PI/3);
 right.gamepad.buttons[5].pressed=true;f.runtime.update(120,frame());await settle();assert(!f.runtime.active);assert.equal(f.sessions[0].ended,1);f.runtime.dispose();
});

test('controller axes have a dead zone, normalize diagonal speed and tolerate missing/one-handed gamepads',()=>{
 assert.deepEqual(vrInput(),{side:0,forward:0,turn:0,exit:false});const p=pad('left',[0,0,.1,-.12]);assert.equal(vrInput([p]).forward,0);p.gamepad.axes=[0,0,1,-1];const i=vrInput([p]);near(Math.hypot(i.side,i.forward),1);const r=pad('right',[0,0,.8,-.5]);assert.equal(vrInput([r]).side,0);assert.equal(vrInput([r]).turn,.8);
});

test('native session end, permission rejection, retry and disposal of an unresolved request leave no rig or duplicate controllers',async()=>{
 let reject=true;const session=new Session(),f=fixture({request:()=>reject?Promise.reject(Object.assign(Error(),{name:'NotAllowedError'})):Promise.resolve(session)});await f.runtime.ready;await f.runtime.start();assert.equal(f.runtime.state.status,'error');assert.equal(f.runtime.state.reason,'permission');assert.equal(f.camera.parent,f.parent);reject=false;await f.runtime.start();await session.end();await settle();assert.equal(f.runtime.state.status,'ready');assert.equal(f.camera.parent,f.parent);f.runtime.dispose();assert(f.controllers.every(c=>c.children.length===0));
 let resolve;const late=new Session(),g=fixture({request:()=>new Promise(r=>{resolve=r;})});await g.runtime.ready;const pending=g.runtime.start(),states=g.states.length;g.runtime.dispose();resolve(late);await pending;assert.equal(late.ended,1);assert.equal(g.states.length,states);assert.equal(g.camera.parent,g.parent);g.runtime.dispose();
});

test('the real kitchen VR starting point and movement clear the cabinets, island and stools, including open drawer bounds',()=>{
 for(const openParts of [[],['dishwasher:door','island-1:drawer-0','sink:door-left']]){
  const model=createKitchen({...DEFAULTS,openParts});try{const nav=createKitchenVrNavigation(model);assert(nav.canStand(nav.start));for(const delta of [[0,-8],[8,0],[-8,0],[0,8]]){const p=nav.move(nav.start,delta);assert(nav.canStand(p));assert(p[0]>=.17&&p[0]<=5.28&&p[1]>=.17&&p[1]<=3.13);}}finally{model.dispose();}
 }
});

test('VR floor targets teleport into the kitchen work aisle and reject occupied floors without changing eye height',async()=>{
 const model=createKitchen({...DEFAULTS}),nav=createKitchenVrNavigation(model),f=fixture({start:{position:[4.95,0,2.9],yaw:0},getModel:()=>model,canTeleport:p=>nav.canStand(p),move:nav.move});
 try{
  await f.runtime.ready;await f.runtime.start();f.runtime.update(0,frame());
  const controller=f.controllers[0],target=new THREE.Vector3(4.95,-.005,1.1),origin=new THREE.Vector3(4.95,1.2,2.9);
  controller.position.set(0,1.2,0);controller.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),target.clone().sub(origin).normalize());
  f.runtime.update(120,frame());assert(f.scene.getObjectsByProperty('name','vr-floor-target').some(m=>m.visible),'a clear floor landing is marked in the headset');
  controller.dispatchEvent({type:'select'});near(f.runtime.pose().x,target.x);near(f.runtime.pose().z,target.z);near(f.runtime.pose().y,1.65);
  const before=f.runtime.pose();controller.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,-1),new THREE.Vector3(3.4,0,2).sub(new THREE.Vector3(4.95,1.2,1.1)).normalize());f.scene.updateMatrixWorld(true);controller.dispatchEvent({type:'select'});near(f.runtime.pose().x,before.x);near(f.runtime.pose().z,before.z);
  const p=nav.move([1.2,1.1],[3.7,0]);assert(p[0]>4.8&&Math.abs(p[1]-1.1)<.001,'joystick walking can traverse the whole closed-front work aisle');
  await f.runtime.end();await settle();assert(f.scene.getObjectsByProperty('name','vr-floor-target').every(m=>!m.visible));
 }finally{f.runtime.dispose();assert.equal(f.scene.getObjectsByProperty('name','vr-floor-target').length,0);model.dispose();}
});

test('controller rays open an actual kitchen front and stop at an opaque wall instead of selecting through it',async()=>{
 const model=createKitchen({...DEFAULTS}),actions=[],f=fixture({start:{position:[2.7,0,1.1],yaw:0},getModel:()=>model,onSelect:d=>{if(d.openingId)actions.push(d.openingId);}});
 try{await f.runtime.ready;await f.runtime.start();f.runtime.update(0,frame());f.controllers[0].position.set(0,.6,0);f.scene.updateMatrixWorld(true);model.group.updateMatrixWorld(true);f.controllers[0].dispatchEvent({type:'select'});assert(actions.some(id=>id.startsWith('dishwasher:')),'ray reaches the real dishwasher opening target');
  const geo=new THREE.BoxGeometry(1,2,.05),mat=new THREE.MeshBasicMaterial(),wall=new THREE.Mesh(geo,mat);wall.position.set(2.7,1,.9);model.group.add(wall);model.group.updateMatrixWorld(true);actions.length=0;f.controllers[0].dispatchEvent({type:'select'});assert.equal(actions.length,0);model.group.remove(wall);geo.dispose();mat.dispose();
  const ray=new THREE.Raycaster(new THREE.Vector3(2.7,.6,1.1),new THREE.Vector3(0,0,-1));assert(vrSurfaceHit(model.group,ray)?.object.userData.openingId);
 }finally{f.runtime.dispose();model.dispose();}
});

test('immersive stereo bypasses the screen-only composer while retaining normal rendering after exit',()=>{
 let draws=0,targets=0;const renderer={xr:{isPresenting:true},getPixelRatio:()=>1,getSize:v=>v.set(400,300),render(){draws++;},getRenderTarget:()=>null,setRenderTarget(){targets++;}},scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),p=createScenePresentation(renderer,scene,camera);
 try{p.render('realistic');assert.equal(draws,1);assert.equal(targets,0,'XR renders directly into the XR framebuffer');renderer.xr.isPresenting=false;p.render('light');assert.equal(draws,2);}finally{p.dispose();}
});
