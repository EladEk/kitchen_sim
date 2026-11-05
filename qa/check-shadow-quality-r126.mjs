// Replays the live quality transition, including the real sun, room shadow,
// warmup and postprocessing. Dawn null validates resources, not display pixels.
import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as T from 'three';
const source=process.env.HOMESTUDIO_SOURCE_ROOT||process.cwd(),load=path=>import(pathToFileURL(source+'/'+path).href);
const [{createWebGPUTourRenderer},{createArchitecturalPresentation},{createSceneWarmup},{installCelestialSky},{createInteriorLighting},{solarDefaults},{APP_REVISION}]=await Promise.all([load('public-view/webgpu-runtime.mjs'),load('public-view/presentation.mjs'),load('src/scene-warmup.mjs'),load('src/celestial-sky-scene.mjs'),load('public-view/interior-lighting.mjs'),load('src/solar-lighting.mjs'),load('public-view/revision.mjs')]);

const moduleName=process.env.HOMESTUDIO_WEBGPU_MODULE||'webgpu';
const {create,globals}=await import(moduleName.startsWith('/')?pathToFileURL(moduleName).href:moduleName);
Object.assign(globalThis,globals);globalThis.self=globalThis;
globalThis.requestAnimationFrame=fn=>setTimeout(()=>fn(performance.now()),1);globalThis.cancelAnimationFrame=clearTimeout;
const gpu=create(['backend=null']);Object.defineProperty(globalThis,'navigator',{value:{gpu},configurable:true});
const timer=setInterval(()=>{},20),adapter=await gpu.requestAdapter(),device=await adapter.requestDevice({requiredFeatures:[...adapter.features],requiredLimits:{maxUniformBufferBindingSize:65536}});
const mobile=process.argv.includes('--mobile'),personal=process.argv.includes('--personal'),rooms=process.argv.includes('--rooms'),enhanced=process.argv.includes('--enhanced'),expectedFailure=process.argv.includes('--baseline'),errors=[],steps=[],roomSteps=[],resources=[];
let target,config,session,presentation,warmup,sky,interior,fixture,variant,district,selection,selectedRoot,reflections,phase='setup',failure=null;
const width=384,height=256,canvas={width,height,style:{},addEventListener(){},removeEventListener(){},setAttribute(){},getContext(){return context;}},context={canvas,configure(c){config=c;},getCurrentTexture(){return target??=device.createTexture({size:[width,height],format:config.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});}};
const scene=new T.Scene(),camera=new T.PerspectiveCamera(48,width/height,.06,200);camera.position.set(6,4,8);camera.lookAt(0,1,0);
const focus=new T.Vector3();
const floor=new T.Mesh(new T.BoxGeometry(12,.12,12),new T.MeshStandardMaterial({color:'#d6d2c9',roughness:.6}));floor.receiveShadow=true;scene.add(floor);
const wall=new T.Mesh(new T.BoxGeometry(8,3,.2),new T.MeshStandardMaterial({color:'#ece9e4',roughness:.9}));wall.position.set(0,1.5,-2);wall.castShadow=wall.receiveShadow=true;scene.add(wall);
const prop=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshStandardMaterial({color:'#8e7260',roughness:.8}));prop.position.y=.6;prop.castShadow=prop.receiveShadow=true;scene.add(prop);resources.push(floor.geometry,floor.material,wall.geometry,wall.material,prop.geometry,prop.material);
const quality=[{name:'initial',tier:0,shadowSize:mobile?2048:4096,effects:true},{name:'auto-tier-1',tier:1,shadowSize:mobile?1024:2048,effects:true},{name:'auto-tier-2',tier:2,shadowSize:1024,effects:false},{name:'performance',tier:3,shadowSize:512,effects:false},{name:'recovery',tier:0,shadowSize:mobile?2048:4096,effects:true},{name:'repeat-same-size',tier:0,shadowSize:mobile?2048:4096,effects:true},{name:'trim',tier:0,shadowSize:mobile?1024:2048,effects:true},{name:'after-trim',tier:0,shadowSize:mobile?2048:4096,effects:true}];
let amount=0,now=0;
try{
 session=await createWebGPUTourRenderer({canvas,context,device});const renderer=session.renderer;renderer.onError=error=>errors.push({phase,message:error.message});renderer.setSize(width,height,false);renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.AgXToneMapping;renderer.outputColorSpace=T.SRGBColorSpace;
 if(personal){
  for(const object of [floor,wall,prop])object.removeFromParent();
  const [{startupFixture},{createPersonalDistrictVariant},{createDistrict},{createSelectionController,fitSelectionCamera},{normalizeHomeSettings}]=await Promise.all([load('qa/startup-fixture-r120.mjs'),load('src/personal-district.mjs'),load('public-view/district.mjs'),load('public-view/selection-view.mjs'),load('src/home-model.mjs')]);
  fixture=await startupFixture();fixture.selection.dispose();fixture.district.dispose();const siteData=JSON.parse(readFileSync('dist/client/baseline/site.json','utf8'));
  variant=createPersonalDistrictVariant({model:fixture.model,siteData,settings:normalizeHomeSettings({}),mobile,storage:null});district=createDistrict(fixture.model,variant.siteData,{mobile,variants:variant.models,siteOptions:variant.siteOptions});const root=selectedRoot=new T.Group();scene.add(root,district.group);selection=createSelectionController({root,model:fixture.model,district,nav:fixture.nav,variants:variant.models});
  const view=selection.update({building:'4102',level:9,target:'',mode:'building'});fitSelectionCamera(camera,{target:focus,update(){}},view);selection.update({building:'4102',level:9,target:'',mode:'building'});district.update(camera.position,1000,{detailScale:1});session.adapt(fixture.model);for(const root of variant.models.values())session.adapt(root);session.adapt(scene);
 }
 sky=installCelestialSky({renderer,scene,camera,getSettings:()=>({solar:solarDefaults(),light:'day'}),mobile,ownSun:true,environmentFactory:session.environmentFactory,disksFactory:session.disksFactory});interior=createInteriorLighting(scene,renderer,{mobile,environmentFactory:session.environmentFactory});
 if(personal)interior.bind(scene);
 presentation=createArchitecturalPresentation(renderer,scene,camera,{mobile,pipelineFactory:session.pipelineFactory});presentation.resize(width,height);warmup=createSceneWarmup(renderer,scene,camera,{viewOnly:true});
 const lights=[scene.getObjectByName('astronomical-light-rig').children.find(o=>o.isDirectionalLight&&o.castShadow),scene.getObjectByName('tour-interior-shadow')];assert(lights.every(Boolean));
 function update(){now+=16;district?.update(camera.position,now,{walking:false,detailScale:1});const solar=sky.update({focus:personal?focus:camera.position,shadowRadius:personal?Math.min(240,Math.max(48,camera.position.distanceTo(focus)*.65)):14,interior:amount});amount=interior.update({walking:!personal,inside:!personal,solar,dt:.016,region:{key:'personal:master',kind:'bedroom',position:[0,2.5,0],target:[0,0,0]}}).amount;}
 for(const profile of rooms?quality.slice(0,1):quality){
  phase=profile.name;
  const before=lights.map(light=>light.shadow.map),started=performance.now();
  if(phase==='trim'){sky.trim();interior.trim();}else{sky.setQuality(profile);interior.setQuality(profile);}
  if(lights.some((light,i)=>before[i]&&light.shadow.map!==before[i]))throw Object.assign(Error('Quality update detached a live native shadow target'),{code:'SHADOW_OWNER_DETACHED'});
  device.pushErrorScope('validation');
  update();await presentation.prepare(phase,warmup,{draw:true,effects:profile.effects,enhanced});
  for(let frame=0;frame<3;frame++){update();presentation.render(now,{effects:profile.effects,enhanced});}
  await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();
  if(error)throw error;
  assert.deepEqual(errors,[]);
  for(const light of lights){assert(light.shadow.map?.depthTexture?.isDepthTexture);assert.equal(light.shadow.map.width,light.shadow.mapSize.x);assert.equal(light.shadow.map.height,light.shadow.mapSize.y);}
  steps.push({phase,elapsedMs:Math.round(performance.now()-started),maps:lights.map((light,i)=>({light:light.name||light.type,sameIdentity:!before[i]||before[i]===light.shadow.map,size:light.shadow.mapSize.toArray(),actual:[light.shadow.map?.width,light.shadow.map?.height],depth:!!light.shadow.map?.depthTexture?.isDepthTexture}))});
  console.log(JSON.stringify(steps.at(-1)));
 }
 if(rooms){
  assert(personal);const [{createLocalReflections},{roomLightingRegion},{buildingTransform,DISTRICT,districtLocation},{locationAt},{interiorAt},{walkingPreparationNeighborhood}]=await Promise.all([load('public-view/local-reflections.mjs'),load('public-view/room-environment.mjs'),load('public-view/district.mjs'),load('public-view/navigation.mjs'),load('public-view/interior-lighting.mjs'),load('public-view/tour-preparation.mjs')]);
  reflections=createLocalReflections(renderer,scene,camera,{mobile,probeFactory:position=>session.probeFactory(scene,position,mobile),mirrorFactory:session.mirrorFactory,captureProbes:!mobile});const plan=variant.mapOverrides.get('4102:0:4').layer,privateRooms=plan.rooms.filter(r=>r.label),main=privateRooms.find(r=>r.id==='living')||privateRooms[0],bath=privateRooms.find(r=>r.id==='bathroom')||privateRooms.at(-1),points=fixture.nav.floors.find(f=>f.level===0).units.flatMap(u=>u.polygon),outside=[Math.min(...points.map(p=>p[0]))-8,Math.min(...points.map(p=>p[1]))-8];assert(main&&bath);
  for(const [index,room]of [main,null,main,bath,null,main].entries()){
   phase='room-'+index+':'+(room?.id||'outside');const point=room?.label||outside;camera.position.set(point[0],1.62,point[1]).applyMatrix4(buildingTransform(DISTRICT[0]));camera.lookAt(camera.position.clone().add(new T.Vector3(1,0,-1)));now+=1000;selection.update({building:'4102',level:9,target:'',mode:'walk'},{walking:true,position:camera.position});district.update(camera.position,now,{walking:true,detailScale:1});scene.updateMatrixWorld(true);
   const loc=districtLocation(camera.position,fixture.nav),b=DISTRICT.find(b=>b.id===loc.building),at={...(loc.building?locationAt(loc.position,fixture.nav):{floor:0}),building:loc.building},inside=interiorAt(fixture.nav,{...loc,...at},variant.mapOverrides),local=inside?roomLightingRegion(fixture.nav,{...loc,...at},variant.mapOverrides):null,region=local&&b?{...local,position:new T.Vector3(...local.position).applyMatrix4(buildingTransform(b)).toArray(),target:new T.Vector3(...local.target).applyMatrix4(buildingTransform(b)).toArray()}:null;
   device.pushErrorScope('validation');const solar=sky.update({focus:camera.position,shadowRadius:14,interior:amount});amount=interior.update({walking:true,inside,solar,dt:.016,region}).amount;if(inside)reflections.prepare(region,selectedRoot);reflections.activate(region?.key);reflections.update(now,{inside,effects:true,xr:false});
   await presentation.prepare(phase,warmup,{draw:true,effects:true,enhanced:inside,neighborhood:walkingPreparationNeighborhood(fixture.nav.storey),preparationObjects:district.preparationObjects});for(let i=0;i<3;i++){reflections.update(now+i*160,{inside,effects:true,xr:false});presentation.render(performance.now(),{effects:true,enhanced:inside});}await device.queue.onSubmittedWorkDone();const error=await device.popErrorScope();if(error)throw error;assert.deepEqual(errors,[]);roomSteps.push({phase,inside,region:region?.key||null,probes:reflections.stats?.probes??null});console.log(JSON.stringify(roomSteps.at(-1)));
  }
  assert(roomSteps.some(s=>s.inside)&&roomSteps.some(s=>!s.inside));
 }
 if(expectedFailure)throw Error('R125 baseline unexpectedly retained native shadow ownership');
 assert.equal(steps.length,rooms?1:quality.length);
}catch(error){failure={phase,code:error.code||null,message:error.message};if(!expectedFailure||error.code!=='SHADOW_OWNER_DETACHED'){console.error(error.stack||error.message);process.exitCode=1;}else console.log('Confirmed R125 shadow ownership regression: '+error.message);}
finally{
 const report={revision:APP_REVISION,backend:'Dawn null',mobile,personal,enhanced,expectedFailure,steps,roomSteps,errors,failure,pixelsVerified:false,physicalDeviceVerified:false};writeFileSync(`qa/shadow-quality-${expectedFailure?'r125-failure':'r126-'+(rooms?'personal-rooms':personal?'personal':mobile?'mobile':enhanced?'enhanced':'desktop')}.txt`,JSON.stringify(report,null,2)+'\n');
 reflections?.dispose();warmup?.dispose();presentation?.dispose();interior?.dispose();sky?.dispose();selection?.dispose();district?.dispose();variant?.dispose();for(const r of resources)r.dispose();session?.dispose();target?.destroy();device.destroy();clearInterval(timer);delete globalThis.navigator;process.exit(process.exitCode||0);
}
