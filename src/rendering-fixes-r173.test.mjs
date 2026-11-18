import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {readFileSync} from 'node:fs';
import {uniform,normalViewGeometry} from 'three/tsl';
import {wallCavityNodes} from '../public-view/wall-cavity-nodes.mjs';
import {createArchitecturalGlass,setArchitecturalGlassQuality} from './architectural-glass.mjs';
import {daylightEnvironmentPixels} from './daylight-environment.mjs';
import {celestialState,israelClock} from './celestial-sky.mjs';
import {DEFAULT_SOLAR_DATE,solarDefaults,openingSolar,daylightState} from './solar-lighting.mjs';
import {createPhysicalAtmosphere} from '../public-view/webgpu-atmosphere.mjs';
import {installCelestialSky} from './celestial-sky-scene.mjs';
import {interiorProbePixels} from './interior-probe.mjs';
import {createInteriorLighting} from '../public-view/interior-lighting.mjs';
import {createPaintNodeMaterial} from '../public-view/paint-finish.mjs';
import {createLocalReflections} from '../public-view/local-reflections.mjs';
import {createViewExposureCache} from '../public-view/view-exposure-cache.mjs';
import {presentationAOWeight,surfaceReflectionWeight} from '../public-view/webgpu-presentation.mjs';
import {applyArchitecturalMaterials} from './architectural-materials.mjs';
import {installFloorCourses,installWallCavity} from './building-finish-shaders.mjs';
import {FLOOR_RENDERING,installFloorMaterial} from './floor-material.mjs';
import {DRY_PORCELAIN} from './floor-appearance.mjs';
import {orderedFloor} from './ordered-flooring.mjs';
import {porcelainProfile} from './architectural-materials.mjs';
import {evaluateTSL,expandTSLGraph} from './tsl-test-evaluator.mjs';
import {createFinishNodeMaterial} from '../public-view/webgpu-finishes.mjs';
import {createTourRenderer} from '../public-view/tour-renderer.mjs';
import {createGpuSelection} from '../public-view/gpu-selection.mjs';
import {createSelectionController} from '../public-view/selection-view.mjs';
import {DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {ARCHITECTURAL_MATERIALS} from './architectural-materials.mjs';
import {materialProperty} from '../public-view/material-property.mjs';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
import {objectVisible,opaqueMesh} from './kitchen-visibility.mjs';
import {floorJointMaps} from './floor-joint-maps.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';
import {computeViewExposure,stepExposure} from '../public-view/photoreal-quality.mjs';
import {createElementProjection} from './frame-projection.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({getContext:()=>context})};
const nav={storey:3,floors:[{level:0,elevation:0,units:[{number:4,polygon:[[-2,-2],[2,-2],[2,2],[-2,2]]}]}],destinations:[{id:'unit:4:0',unit:4,floor:0}]};

test('glass shading has no object-bound CPU uniform callbacks or geometry-bound pane dependence',()=>{
 const source=new T.MeshPhysicalMaterial(ARCHITECTURAL_MATERIALS.glass);source.userData.architecturalGlass=true;
 const material=createFinishNodeMaterial(source),mesh=new T.Mesh(new T.BoxGeometry(30,20,.024),material);let callbacks=0;
 try{
  material.aoNode.traverse(n=>{if(n.isUniformNode&&n.updateType==='object'){callbacks++;assert.doesNotThrow(()=>n.update({object:mesh,material}));}});
  assert.equal(callbacks,0);assert.equal(mesh.geometry.boundingBox,null);
 }finally{mesh.geometry.dispose();material.dispose();source.dispose();}
});

test('unbound material properties select the live clone in colour and shadow passes, including multi-material groups',()=>{
 const original=new T.MeshPhysicalMaterial({color:'#123456',roughness:.8}),clone=original.clone(),override={isShadowPassMaterial:true},mesh=new T.Mesh(new T.BoxGeometry(),[original,clone]);clone.color.set('#abcdef');clone.roughness=.4;
 try{for(const [property,type]of [['color','color'],['roughness','float'],['bumpScale','float']]){
  const node=materialProperty(property,type);assert.equal(node.material,null);
  for(const frame of [{object:mesh,material:clone},{object:mesh,material:override,renderer:{_currentSourceMaterial:clone}},{object:mesh,material:original,renderer:{_currentSourceMaterial:null}}]){node.updateReference(frame);node.update(frame);const expected=frame.renderer?._currentSourceMaterial||frame.material;assert.equal(node.node.value,expected[property]);}
 }}finally{mesh.geometry.dispose();original.dispose();clone.dispose();}
});

test('paint and textured finishes use clone-safe material references in their colour and roughness graphs',()=>{
 for(const data of [{surfaceKind:'plaster'},{surfaceKind:'fabric'}]){
  const source=new T.MeshPhysicalMaterial();source.userData=data;const original=createFinishNodeMaterial(source),clone=original.clone(),refs=new Set();clone.color.set('#abc123');clone.roughness=.41;
  try{for(const root of [clone.colorNode,clone.roughnessNode])root.traverse(n=>{if(n.isMaterialReferenceNode)refs.add(n);});assert([...refs].some(n=>n.property==='color'));assert([...refs].some(n=>n.property==='roughness'));
   for(const node of refs){assert.equal(node.material,null);node.updateReference({material:clone});node.update({material:clone});assert.equal(node.node.value,clone[node.property]);}
   assert.notEqual(clone.color.getHex(),original.color.getHex());
  }finally{original.dispose();clone.dispose();source.dispose();}
 }
});

test('physical glass properties and transparency synchronize to a section without rebuilding its geometry',()=>{
 const source=new T.Group(),material=new T.MeshPhysicalMaterial({transmission:.9}),mesh=new T.Mesh(new T.BoxGeometry(),material);source.add(mesh);const section=createGpuSelection(source,nav);section.update({level:0,target:'unit:4:0'});const copy=section.group.children[0].children[0],geometry=copy.geometry;
 try{for(const transparent of [true,false]){const before=copy.material.version;Object.assign(material,{transparent,opacity:transparent?.22:1,transmission:transparent?0:.9,attenuationDistance:.33,ior:1.52,thickness:.024,clearcoat:.13,clearcoatRoughness:.38,anisotropy:.55});material.attenuationColor.set('#89ab92');section.sync();assert(copy.material.version>before);
   for(const key of ['transparent','transmission','opacity','attenuationDistance','ior','thickness','clearcoat','clearcoatRoughness','anisotropy'])assert.equal(copy.material[key],material[key],key);assert(copy.material.attenuationColor.equals(material.attenuationColor));const stable=copy.material.version;section.sync();assert.equal(copy.material.version,stable);assert.equal(copy.geometry,geometry);
  }}finally{section.dispose();mesh.geometry.dispose();material.dispose();}
});

test('new focused sections, walking displays and switched source models are prepared for lighting',()=>{
 const root=new T.Group(),model=new T.Group(),variant=new T.Group(),geometry=new T.BoxGeometry(),material=new T.MeshPhysicalMaterial(),prepared=[];
 for(const source of [model,variant]){const mesh=new T.Mesh(geometry,material);mesh.userData.level=0;source.add(mesh);}
 const controller=createSelectionController({root,model,variants:new Map([['4103',variant]]),nav,district:{group:new T.Group(),setActiveBuilding(){}},onPrepareGroup:g=>prepared.push(g)}),state={building:'4102',level:9,target:''};
 try{assert(prepared.includes(model));controller.update(state);const section=controller.update({...state,level:0}).content;assert(prepared.includes(section));const count=prepared.length;controller.update({...state,level:0});assert.equal(prepared.length,count);
  const position=new T.Vector3(1,1.62,1).applyMatrix4(buildingTransform(DISTRICT.find(b=>b.id==='4102'))),display=controller.update(state,{walking:true,position}).content;assert(prepared.includes(display));controller.update({...state,building:'4103'});assert(prepared.includes(variant));
 }finally{controller.dispose();geometry.dispose();material.dispose();}
});

test('WebGL and explicit VR fallback upgrade glazing and metals, repair UVs and release owned materials',async()=>{
 for(const options of [{mode:'webgl2'},{preferXR:true}]){
  let rendererDisposals=0,materialDisposals=0;const session=await createTourRenderer({...options,secure:true,navigator:{gpu:{}},createGL:()=>({dispose(){rendererDisposals++;},domElement:{remove(){}}})}),root=new T.Group(),originals=[],geometries=[];
  for(const part of ['window-glass','window-frame','door-handle']){const m=new T.MeshStandardMaterial(),g=new T.BoxGeometry();g.deleteAttribute('uv');g.deleteAttribute('normal');const mesh=new T.Mesh(g,m);mesh.userData.part=part;root.add(mesh);originals.push(m);geometries.push(g);}
  session.adapt(null);session.adapt(root);
  for(const mesh of root.children){assert(mesh.geometry.attributes.uv?.count>0);assert(mesh.geometry.attributes.normal?.count>0);assert(mesh.geometry.attributes.tangent?.count>0);assert(mesh.material.isMeshPhysicalMaterial);mesh.material.addEventListener('dispose',()=>materialDisposals++);}
  assert(root.children[0].material.userData.architecturalGlass);assert.equal(root.children[0].material.thickness,.024);assert.equal(root.children[2].material.anisotropy,.65);session.dispose();session.dispose();assert.equal(materialDisposals,3);assert.equal(rendererDisposals,1);
  new Set([...geometries,...root.children.map(m=>m.geometry)]).forEach(g=>g.dispose());originals.forEach(m=>m.dispose());
 }
});

test('kitchen occluder lists refresh in place after parent visibility and material opacity changes',()=>{
 const model=createKitchen({...DEFAULTS,showElectrical:true}),occluders=model.electricalOccluders,picks=model.picks;
 try{const parent=model.furnishingRoots[0];let mesh;parent.traverse(o=>{if(!mesh&&o.isMesh&&objectVisible(o)&&opaqueMesh(o))mesh=o;});assert(mesh);assert(occluders.includes(mesh));parent.visible=false;model.refreshInteractionTargets();assert(!occluders.includes(mesh));assert(!picks.includes(mesh));parent.visible=true;model.refreshInteractionTargets();assert(occluders.includes(mesh));
  const m=[mesh.material].flat()[0],old=m.opacity;m.opacity=.2;model.refreshInteractionTargets();assert(!occluders.includes(mesh));m.opacity=old;model.refreshInteractionTargets();assert(occluders.includes(mesh));assert.equal(model.electricalOccluders,occluders);assert.equal(model.picks,picks);assert(occluders.every(m=>!m.userData.electricalId));
 }finally{model.dispose();}
});

test('photo floors share the live metre grid and 4 mm grout while retaining exterior planks',()=>{
 const maps=floorJointMaps(),explicit=floorJointMaps({tile:[1,1],joint:.004}),scene=new T.Scene(),geometry=new T.BoxGeometry(),materials=[];
 try{assert.deepEqual(maps.map.repeat.toArray(),[1,1]);assert.equal(maps.map.image.width,512);assert.deepEqual(maps.bumpMap.image.data,explicit.bumpMap.image.data);
  for(const data of [{publicFinish:'floor'},{publicFinish:'floor',productId:'dry-floor',tile:[.8,.8]},{publicFinish:'floor',productId:'terrace-floor',tile:[.2,1.2],floorCourses:{joint:.003}}]){const m=new T.MeshStandardMaterial();m.userData=data;materials.push(m);scene.add(new T.Mesh(geometry,m));}
  const photo=createPhotoScene(scene);try{const [a,b,c]=photo.scene.children.map(o=>o.material);assert.deepEqual(a.map.repeat.toArray(),[1,1]);assert.equal(a.map,b.map);assert.deepEqual(c.map.repeat.toArray(),[5,1/1.2]);}finally{photo.dispose();}
 }finally{Object.values(maps).forEach(m=>m.dispose());Object.values(explicit).forEach(m=>m.dispose());geometry.dispose();materials.forEach(m=>m.dispose());}
});

test('focused orbit views expose their covered target immediately and walking views follow the camera',()=>{
 const state={walking:false,focused:true,cameraInside:false,targetInside:true,sunElevation:.6};assert.equal(computeViewExposure(state),1.16);assert(Math.abs(computeViewExposure({...state,nightMode:true})-1.28)<1e-12);assert.equal(computeViewExposure({...state,focused:false}),.94);assert.equal(computeViewExposure({...state,walking:true}),.94);assert.equal(computeViewExposure({...state,walking:true,cameraInside:true}),1.16);assert(stepExposure(.94,computeViewExposure(state),.016)>.94);
});

test('DOM projection anchors reuse one frame vector and react to coordinate changes',()=>{
 const project=createElementProjection(),camera=new T.PerspectiveCamera(55,1,.1,100);camera.position.set(0,0,5);camera.updateMatrixWorld();const a={dataset:{point:'1,2,0'}},b={dataset:{point:'-1,1,0'}},expected=new T.Vector3(1,2,0).project(camera),first=project(a,camera);assert(first.distanceTo(expected)<1e-12);
 for(let i=0;i<100;i++){assert.equal(project(b,camera),first);assert.equal(project(a,camera),first);assert(first.distanceTo(expected)<1e-12);}a.dataset.point='0,0,0';assert.equal(project(a,camera),first);assert(first.distanceTo(new T.Vector3().project(camera))<1e-12);
});


// R174 regressions are kept beside the R173 tests so the npm test contract and
// all earlier coverage remain intact.
const sourceText=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const close=(actual,expected,tolerance=1e-10)=>assert(Math.abs(actual-expected)<=tolerance,`${actual} != ${expected}`);

test('synthetic turf has no parallax loops and stays green at tuft centres, edges and distant footprints',()=>{
 const map=new T.DataTexture(new Uint8Array([255,255,255,255]),1,1);map.needsUpdate=true;
 try{for(const mobile of [true,false]){
  const source=new T.MeshStandardMaterial({map,bumpMap:map,normalMap:map,roughnessMap:map});source.userData={siteSurface:'grass',surfaceKind:'grass'};
  const material=createFinishNodeMaterial(source,{mobile});
  try{
   const graph=expandTSLGraph([material.colorNode,material.roughnessNode,material.aoNode,material.normalNode],material);
   assert(!graph.some(node=>node.isLoopNode||node.constructor.name==='LoopNode'),'grass contains a parallax loop');
   assert(!graph.some(node=>node.isTextureNode),'procedural turf must not retain unfiltered legacy texture relief');
   for(const scale of [55,82])for(const x of [-1,0,2])for(const z of [-1,1])for(const offset of [0,.5,.99999])for(const pixel of [.001,.012,.20]){
    const options={material,position:[(x+offset)/scale,0,(z+offset)/scale],dx:[pixel,0,0],dy:[0,0,pixel]};
    const [r,g,b]=evaluateTSL(material.colorNode,options);
    assert(g>r&&g>b,`non-green tuft at ${options.position}, footprint ${pixel}`);
    assert([r,g,b].every(Number.isFinite));
    const ao=evaluateTSL(material.aoNode,options);assert(ao>=.68&&ao<=1);
    if(pixel>=.14)close(ao,1);
   }
   assert.equal(material.sheen,.35);assert.equal(material.sheenColor.getHexString(),'6d9948');assert.equal(material.sheenRoughness,.58);
  }finally{material.dispose();source.dispose();}
 }}finally{map.dispose();}
});

test('wall AO stops above 18 mm and explicit skirting grout stays crisp on every storey',()=>{
 const source=new T.MeshPhysicalMaterial({color:'#f2efe9'});source.userData={surfaceKind:'plaster',wallCavity:{storey:3,height:2.75,skirting:.075}};
 const material=createPaintNodeMaterial(source,{mobile:true}),grout=new T.Color('#b8b2a6').toArray();
 try{for(const floor of [0,1,2]){
  const options=y=>({material,position:[.5,floor*3+y,0],normal:[0,0,1],dx:[.0002,0,0],dy:[0,.0002,0]});
  for(const y of [.0201,.04,.075,.1,.2,.35])for(const x of [0,.5]){
   const at=options(y);at.position[0]=x;const ao=evaluateTSL(material.aoNode,at);assert(ao>=.80&&ao<=1,`AO ${ao} at height ${y}`);
  }
  for(const y of [.001,.075]){evaluateTSL(material.colorNode,options(y)).forEach((v,i)=>close(v,grout[i]));close(evaluateTSL(material.roughnessNode,options(y)),.92);}
  const board=evaluateTSL(material.colorNode,options(.04)),skirt=new T.Color(DRY_PORCELAIN.color).toArray();
  board.forEach((v,i)=>close(v,skirt[i]));
  evaluateTSL(material.colorNode,options(.2)).forEach((v,i)=>close(v,source.color.toArray()[i]));
  close(evaluateTSL(material.aoNode,options(.2)),1);
 }}finally{material.dispose();source.dispose();}
});

test('non-paint WebGPU walls share the skirting palette, 1 m cuts and tight contact',()=>{
 const source=new T.MeshStandardMaterial({color:'#f2efe9'});source.userData={wallCavity:{height:2.75,skirting:.075}};
 const material=createFinishNodeMaterial(source),grout=new T.Color('#b8b2a6').toArray();
 try{for(const [x,y]of [[.5,.001],[.5,.075],[0,.04],[1,.04]]){
  const options={material,position:[x,y,0],normal:[0,0,1],dx:[.0002,0,0],dy:[0,.0002,0]};
  evaluateTSL(material.colorNode,options).forEach((v,i)=>close(v,grout[i]));close(evaluateTSL(material.roughnessNode,options),.92);
 }
 const options={material,position:[.5,.2,0],normal:[0,0,1]};close(evaluateTSL(material.aoNode,options),1);
 evaluateTSL(material.colorNode,options).forEach((v,i)=>close(v,source.color.toArray()[i]));
 }finally{material.dispose();source.dispose();}
});

test('WebGL skirting and porcelain shader hooks retain the new contact, grout and recess',()=>{
 const shader=()=>({vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>\n#include <aomap_fragment>'});
 const wall=new T.MeshStandardMaterial(),floor=new T.MeshStandardMaterial();
 try{
  installWallCavity(wall,{storey:3,skirting:0});const ws=shader();wall.onBeforeCompile(ws);
  assert.equal(wall.userData.wallCavity.skirting,.075);assert.match(ws.fragmentShader,/smoothstep\(\.001,\.018,max/);assert.match(ws.fragmentShader,/\.10\*cavityBase/);
  assert.match(ws.fragmentShader,/cavityBottomGrout/);assert.match(ws.fragmentShader,/cavityTopSeam/);assert.match(ws.fragmentShader,/cavityVerticalGrout/);assert.match(ws.fragmentShader,/roughnessFactor=mix\(roughnessFactor,\.92,cavityGrout\)/);
  assert.doesNotMatch(ws.fragmentShader,/\.65\*cavityBase|smoothstep\(\.008,\.35/);
  installFloorCourses(floor);const fs=shader();floor.onBeforeCompile(fs);assert.match(fs.fragmentShader,/tileRelief=-\.00022/);assert(fs.fragmentShader.includes('vec3('+new T.Color(DRY_PORCELAIN.grout).toArray().map(v=>v.toFixed(6)).join(',')+')'));assert.doesNotMatch(fs.fragmentShader,/vec3\(\.62\)/);
  assert.equal(FLOOR_RENDERING['dry-floor'].recess,.00022);assert.equal(FLOOR_RENDERING['dry-floor'].grout,'#aaa397');
 }finally{wall.dispose();floor.dispose();}
});

test('SSR weights use actual metalness independently of eligibility and preserve dielectric reflections',()=>{
 const parameters=uniform(new T.Vector4(.2,0,1,1)),weight=surfaceReflectionWeight(parameters);
 close(evaluateTSL(weight),.42*.8**2);
 parameters.value.y=1;close(evaluateTSL(weight),.8**2);
 parameters.value.y=.5;close(evaluateTSL(weight),.71*.8**2);
 parameters.value.z=0;close(evaluateTSL(weight),0);
 parameters.value.z=1;parameters.value.x=1;close(evaluateTSL(weight),0);
 const source=sourceText('../public-view/webgpu-presentation.mjs');
 assert.match(source,/metalnessNode:parameters\.b,reflectNonMetals:false/);
 assert.match(source,/reflection\.rgb\.mul\(surfaceReflectionWeight\(parameters\)\)/);
});

test('GTAO gives indoor contact more weight and disables AO for effects-off and reduced tiers',()=>{
 close(presentationAOWeight(),.42);close(presentationAOWeight({enhanced:true}),.52);
 for(const enhanced of [true,false]){close(presentationAOWeight({enhanced,effects:false}),0);close(presentationAOWeight({enhanced,ao:false}),0);}
 const source=sourceText('../public-view/webgpu-presentation.mjs');assert.match(source,/ao:uniform\(presentationAOWeight/);assert.match(source,/weights\.ao\.value=presentationAOWeight/);
});

test('room-probe bindings survive repeated evictions and cached-room reactivation, then restore originals',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),root=new T.Group(),geometry=new T.BoxGeometry(),original=new T.Texture(),material=new T.MeshStandardMaterial({roughness:.3,envMap:original}),probes=[];
 material.userData.architecturalInterior=true;root.add(new T.Mesh(geometry,material));scene.add(root);
 const reflections=createLocalReflections({xr:{}},scene,camera,{probeFactory:()=>{
  const probe={texture:new T.Texture(),disposed:false,dispose(){this.disposed=true;this.texture.dispose();}};probes.push(probe);return probe;
 }});
 const prepare=key=>reflections.prepare({key,position:[0,1.62,0]},root);
 try{
  for(const key of ['a','b','c'])assert(prepare(key));assert(probes[0].disposed);assert.equal(reflections.stats.probes,2);assert.equal(material.envMap,probes[2].texture);
  reflections.activate('b');assert.equal(material.envMap,probes[1].texture,'cached b lost its material bindings after evicting a');
  assert(prepare('d'));assert(probes[1].disposed);reflections.activate('c');assert.equal(material.envMap,probes[2].texture);
  reflections.update(1,{environment:false});assert.equal(material.envMap,original);reflections.activate('c',{environment:false});assert.equal(material.envMap,original);
  assert(prepare('c'));assert.equal(material.envMap,probes[2].texture);reflections.reset();assert.equal(material.envMap,original);assert(probes.every(p=>p.disposed));assert.equal(reflections.stats.probes,0);
  assert(prepare('e'));reflections.dispose();assert.equal(material.envMap,original);assert(probes.at(-1).disposed);
 }finally{reflections.dispose();material.dispose();geometry.dispose();original.dispose();}
});

test('evicting a probe restores only its lingering textures without erasing other room bindings',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),geometry=new T.BoxGeometry(),roots=[],materials=[],originals=[],probes=[];
 for(let i=0;i<3;i++){const original=new T.Texture(),material=new T.MeshStandardMaterial({roughness:.3,envMap:original}),root=new T.Group();material.userData.architecturalInterior=true;root.add(new T.Mesh(geometry,material));roots.push(root);materials.push(material);originals.push(original);scene.add(root);}
 const reflections=createLocalReflections({xr:{}},scene,camera,{probeFactory:()=>{const p={texture:new T.Texture(),dispose(){this.texture.dispose();}};probes.push(p);return p;}});
 try{
  roots.forEach((root,i)=>reflections.prepare({key:String(i),position:[0,1.62,0]},root));
  assert.equal(materials[0].envMap,originals[0],'an evicted texture remains bound');assert.equal(materials[1].envMap,probes[1].texture);
  reflections.activate('1');materials.forEach(m=>assert.equal(m.envMap,probes[1].texture));
  reflections.reset();materials.forEach((m,i)=>assert.equal(m.envMap,originals[i]));
 }finally{reflections.dispose();geometry.dispose();materials.forEach(m=>m.dispose());originals.forEach(t=>t.dispose());}
});

test('view exposure reuses stationary location queries and invalidates after accumulated movement or mode changes',()=>{
 let queries=0;const cache=createViewExposureCache(point=>{queries++;return point.x>0;}),camera=new T.Vector3(-1,1.62,0),target=new T.Vector3(1,1,0),mode={focused:true};
 const result=cache(camera,target,mode);assert.deepEqual(result,{cameraInside:false,targetInside:true});assert.equal(queries,2);
 for(let i=0;i<1000;i++)assert.equal(cache(camera,target,mode),result);assert.equal(queries,2);
 camera.x+=.01;cache(camera,target,mode);camera.x+=.009;cache(camera,target,mode);assert.equal(queries,2);
 camera.x+=.002;cache(camera,target,mode);assert.equal(queries,3);
 target.z+=.021;cache(camera,target,mode);assert.equal(queries,4);
 cache(camera,target,{focused:false});assert.equal(queries,5);assert.equal(result.targetInside,false);
 cache(camera,target,{focused:true});assert.equal(queries,7);assert.equal(result.targetInside,true);
 cache(camera,target,{focused:true,walking:true});assert.equal(queries,8);assert.equal(result.targetInside,false);
 target.x=-2;cache(camera,target,{focused:true,walking:true});assert.equal(queries,8);
 cache(camera,target,{focused:true,walking:false});assert.equal(queries,10);assert.equal(result.targetInside,false);
 const viewer=sourceText('../public-view/DistrictViewer.jsx'),exposure=viewer.slice(viewer.indexOf('function viewExposure('),viewer.indexOf('async function prepareDestination('));
 assert.match(exposure,/exposureLocation\(worldPosition,controls\.target/);assert.doesNotMatch(exposure,/districtLocation\(|coveredInteriorAt\(/);
});

test('ModelView hot-loop projections reuse cached anchors and the setup-scoped service vector',()=>{
 const source=sourceText('./ModelView.jsx'),tick=source.slice(source.indexOf('const tick='),source.indexOf('renderer.setAnimationLoop(tick)'));
 assert.match(source,/projectElement=createElementProjection\(\),servicePoint=new THREE\.Vector3\(\)/);
 assert.match(tick,/projectElement\(el,camera\)/);assert.match(tick,/servicePoint\.fromArray\(p\.position\)\.project\(camera\)/);
 assert.doesNotMatch(tick,/new THREE\.Vector3|\.split\(/);
});

test('kitchen worktop and stone island retain 18 percent micro-polish through WebGPU adaptation',()=>{
 const model=createKitchen({...DEFAULTS}),tops=[],cabinets=[];
 try{
  model.group.traverse(o=>{if(o.userData.part==='worktop')tops.push(o);else if(o.isMesh&&o.userData.id==='island-1')cabinets.push(o);});
  assert(tops.length>=2);assert(tops.some(o=>o.userData.id==='island-1'));assert(cabinets.length>0);
  for(const top of tops){const m=top.material;assert(m.isMeshPhysicalMaterial);assert.equal(m.clearcoat,.18);assert.equal(m.clearcoatRoughness,.25);const node=createFinishNodeMaterial(m);try{assert.equal(node.clearcoat,.18);assert.equal(node.clearcoatRoughness,.25);}finally{if(node!==m)node.dispose();}}
  for(const cabinet of cabinets)assert.notEqual(cabinet.material.userData.architecturalRole,'worktop');
  const root=new T.Group(),material=new T.MeshStandardMaterial({color:'#776655'}),geometry=new T.BoxGeometry(),island=new T.Mesh(geometry,material);material.userData.surfaceKind='porcelain';island.userData.id='island-1';root.add(island);
  const owned=applyArchitecturalMaterials(root);try{assert.equal(island.material.clearcoat,.18);assert.equal(island.material.clearcoatRoughness,.25);assert(island.material.color.equals(material.color));}finally{owned.forEach(m=>m.dispose());material.dispose();geometry.dispose();}
 }finally{model.dispose();}
});


// R175 extends the R174 suite without removing its original 63 core cases.
test('R175 mobile, reduced-tier and XR glazing retain clear paired panes and stable quality transitions',()=>{
 const resources=[],glass=createArchitecturalGlass(resources,{mobile:true});
 try{
  assert.equal(glass.opacity,.075);assert.equal(glass.transmission,0);assert(glass.transparent);assert.equal(glass.depthWrite,false);
  assert.equal(glass.color.getHexString(),'f6faf8');assert.equal(glass.attenuationColor.getHexString(),'dff0ec');assert.equal(glass.attenuationDistance,.65);
  close(1-(1-glass.opacity)**2,.144375);
  for(const mode of [{mobile:true},{tier:1},{tier:3},{xr:true}]){
   setArchitecturalGlassQuality(glass,mode);assert.equal(glass.opacity,.075);assert.equal(glass.transmission,0);
   const version=glass.version;assert.equal(setArchitecturalGlassQuality(glass,mode),false);assert.equal(glass.version,version);
  }
  assert(setArchitecturalGlassQuality(glass,{}));assert.equal(glass.transmission,.9);assert.equal(glass.opacity,1);assert.equal(glass.transparent,false);
  const root=new T.Group(),geometry=new T.BoxGeometry(),mesh=new T.Mesh(geometry,glass);root.add(mesh);setArchitecturalGlassQuality(glass,{mobile:true});
  const owned=applyArchitecturalMaterials(root);try{assert.equal(mesh.material.opacity,.075);assert.equal(mesh.material.attenuationDistance,.65);assert.equal(mesh.material.color.getHexString(),'f6faf8');}finally{owned.forEach(m=>m.dispose());geometry.dispose();}
 }finally{resources.forEach(m=>m.dispose());}
});

test('R175 glass border and grazing AO retain at least 89.3 percent illumination',()=>{
 const resources=[],source=createArchitecturalGlass(resources,{mobile:true}),material=createFinishNodeMaterial(source,{mobile:true});
 try{
  const attributes=expandTSLGraph([material.aoNode],material).filter(n=>n.constructor.name==='AttributeNode');
  assert(attributes.length>0);const inputs=new Map(attributes.map(n=>[n,[0,0]]));
  close(evaluateTSL(material.aoNode,{material,viewPosition:[1,0,0],inputs}),.94*.95);
  for(const n of attributes)inputs.set(n,[.5,.5]);
  close(evaluateTSL(material.aoNode,{material,viewPosition:[0,0,-2],inputs}),1);
  assert.equal(material.opacity,.075);
 }finally{material.dispose();resources.forEach(m=>m.dispose());}
});

test('R175 daylight IBL retains the specified sky/ground chroma, warm white and source pixels',()=>{
 const pixels={width:1,height:2,data:new Float32Array([.8,.7,.4,1,.3,.6,.9,1])},original=pixels.data.slice();
 const warm=daylightEnvironmentPixels(pixels,{warmGround:true});
 for(const [i,chroma]of [[0,.42],[4,.16]]){
  const [r,g,b]=pixels.data.slice(i,i+3),l=r*.2126+g*.7152+b*.0722;
  [1.03,1.01,.97].forEach((tint,c)=>close(warm.data[i+c],(l+(pixels.data[i+c]-l)*chroma)*tint,1e-7));
 }
 assert.notEqual(warm.data[4],warm.data[6]);assert(warm.data[4]/warm.data[6]>pixels.data[4]/pixels.data[6]);assert.deepEqual(pixels.data,original);
 const white=daylightEnvironmentPixels({width:1,height:2,data:new Float32Array([1,1,1,1,1,1,1,1])},{warmGround:true});assert(white.data[4]>white.data[6]);
 const neutral=daylightEnvironmentPixels(pixels);close(neutral.data[4],neutral.data[6]);
 const saturated=daylightEnvironmentPixels(pixels,{warmGround:true,saturation:.7});assert(saturated.data[4]/saturated.data[6]<warm.data[4]/warm.data[6]);
});

test('R175 opening uses Mediterranean May noon while explicitly enabled live time follows Israel civil time',()=>{
 const november=new Date('2026-11-15T08:30:00Z');
 assert.equal(DEFAULT_SOLAR_DATE,'2026-05-15');assert.equal(solarDefaults().date,DEFAULT_SOLAR_DATE);
 const opening=openingSolar({date:'2026-11-15',minutes:20,northBearing:82});assert.equal(opening.date,DEFAULT_SOLAR_DATE);assert.equal(opening.minutes,720);assert.equal(opening.live,false);assert.equal(opening.northBearing,82);
 const day=celestialState({},november),clock=israelClock(november),live=celestialState({solar:{live:true}},november);
 assert.equal(day.solar.date,DEFAULT_SOLAR_DATE);assert.equal(day.solar.minutes,720);assert.equal(live.solar.date,clock.date);assert.equal(live.solar.minutes,clock.minutes);assert.equal(live.instant.toISOString(),november.toISOString());
 close(day.sunIntensity,3.45*Math.sqrt(day.daylight));close(day.environmentIntensity,day.daylight*1.24+day.twilight*.09);
 close(daylightState(day.settings).intensity,day.sunIntensity);
 for(const light of ['night','evening']){const dark=celestialState({light},november);assert.equal(dark.sunIntensity,0);assert.equal(dark.environmentIntensity,0);}
});

test('R175 WebGPU and WebGL share warm clear-air fog and retain night/dusk and disposal behavior',()=>{
 const gpuScene=new T.Scene(),glScene=new T.Scene(),camera=new T.PerspectiveCamera(),originalFog=new T.FogExp2('#123456',.01);
 gpuScene.fog=originalFog;glScene.fog=new T.FogExp2('#123456',.01);
 const physical=createPhysicalAtmosphere({},gpuScene,camera),sky=gpuScene.getObjectByName('physical-atmosphere');
 let settings={};const analytic=installCelestialSky({renderer:{},scene:glScene,camera,getSettings:()=>settings,ownSun:true,mobile:true,environmentFactory:()=>({texture:new T.Texture(),dispose(){this.texture.dispose();}})});
 try{
  assert.equal(sky.turbidity.value,1.85);assert.equal(sky.rayleigh.value,2.1);assert.equal(sky.cloudCoverage.value,.02);assert.equal(sky.cloudDensity.value,.04);
  for(const interior of [0,.5,1]){
   const state=analytic.update({interior});physical.update(state,{interior});assert(gpuScene.fog.color.equals(glScene.fog.color));close(gpuScene.fog.density,glScene.fog.density);
   assert.equal(gpuScene.fog.color.getHexString(),'efeae0');close(gpuScene.fog.density,.00008*(1-interior*.95));
  }
  settings={light:'night'};const night=analytic.update();physical.update(night);assert.equal(gpuScene.fog.color.getHexString(),'050914');assert.equal(sky.visible,false);
  physical.update({...night,dark:false,sun:{...night.sun,elevation:5}});assert.equal(gpuScene.fog.color.getHexString(),'bcb4b1');
 }finally{physical.dispose();analytic.dispose();assert.equal(gpuScene.fog,originalFog);assert.equal(gpuScene.children.length,0);}
});

test('R175 room probe and window bounce stay warm without lighting lamp-only mode',()=>{
 const pixels=interiorProbePixels({width:32,height:16});
 for(let i=0;i<pixels.data.length;i+=4){assert(pixels.data[i]>pixels.data[i+1]&&pixels.data[i+1]>pixels.data[i+2]);assert.equal(pixels.data[i+3],1);assert(Number.isFinite(pixels.data[i]));}
 const scene=new T.Scene(),renderer={toneMappingExposure:1},lighting=createInteriorLighting(scene,renderer,{environmentFactory:()=>({texture:new T.Texture(),dispose(){this.texture.dispose();}})});
 try{
  const window=scene.getObjectByName('tour-window-bounce'),bounce=scene.getObjectByName('tour-floor-bounce'),walls=scene.getObjectByName('tour-wall-bounce');
  assert.equal(window.color.getHexString(),'fff5e0');assert.equal(bounce.groundColor.getHexString(),'e4ddd0');assert.equal(walls.color.getHexString(),'f5f0e6');
  const result=lighting.update({inside:true,walking:true,solar:{daylight:.81},dt:.1});close(window.intensity,result.amount*.9*2.1);
  lighting.update({inside:true,walking:true,solar:{daylight:1,dark:true}});assert.equal(window.intensity,0);assert.equal(bounce.intensity,0);assert.equal(walls.intensity,0);
 }finally{lighting.dispose();}
});

test('R175 paint mobile environment uses restrained warm radiance without adding emission',()=>{
 const source=new T.MeshStandardMaterial();source.userData.surfaceKind='plaster';const material=createPaintNodeMaterial(source,{mobile:true});
 try{const value=evaluateTSL(material.envNode,{material});[.97,.94,.89].forEach((v,i)=>close(value[i],v));assert.equal(material.metalness,0);assert.equal(material.emissive.getHex(),0);}finally{material.dispose();source.dispose();}
});

test('R175 bottom grout is symmetric around the floor and absent at negative slab offsets',()=>{
 for(const storey of [0,3]){
  const nodes=wallCavityNodes({storey});
  for(const floor of storey?[0,1,2]:[0])for(const y of [-.015,-.01,-.0035,0,.001,.0035,.01]){
   const options={position:[.5,floor*storey+y,0],normal:[0,0,1],dx:[.0001,0,0],dy:[0,.0001,0]};
   const grout=evaluateTSL(nodes.bottomGrout,options);if(Math.abs(y)>=.0035)close(grout,0);if(Math.abs(y)<=.001)close(grout,1);
   if(y===-.01)close(evaluateTSL(nodes.groutMask,options),0);
  }
 }
 const source=new T.MeshStandardMaterial();try{installWallCavity(source);const shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>\n#include <aomap_fragment>'};source.onBeforeCompile(shader);assert.match(shader.fragmentShader,/cavityBottomGrout=.*abs\(cavityHeight\)/);}finally{source.dispose();}
});

test('R175 coplanar paint normals have an AO deadzone below 0.035 but real edges still shade',()=>{
 for(const cavity of [false,true]){
  const source=new T.MeshStandardMaterial();source.userData={surfaceKind:'plaster',...(cavity?{wallCavity:{height:2.75}}:{})};const material=createPaintNodeMaterial(source);
  try{
   for(const derivative of [0,.001,.02,.0349,.035]){
    const derivatives=new Map([[normalViewGeometry,{dFdx:[derivative,0,0],dFdy:[0,0,0]}]]);
    close(evaluateTSL(material.aoNode,{material,position:[.5,.3,0],normal:[0,0,1],derivatives}),1);
   }
   const derivatives=new Map([[normalViewGeometry,{dFdx:[.22,0,0],dFdy:[0,0,0]}]]);
   close(evaluateTSL(material.aoNode,{material,position:[.5,.3,0],normal:[0,0,1],derivatives}),cavity?.87:.74);
  }finally{material.dispose();source.dispose();}
 }
});

test('R175 cached room activation recompiles only when an evicted original-null material gains an envMap',()=>{
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(),geometry=new T.BoxGeometry(),materials=[],roots=[],probes=[];
 for(let i=0;i<3;i++){const m=new T.MeshStandardMaterial({roughness:.3});m.userData.architecturalInterior=true;const root=new T.Group();root.add(new T.Mesh(geometry,m));materials.push(m);roots.push(root);scene.add(root);}
 const reflections=createLocalReflections({xr:{}},scene,camera,{probeFactory:()=>{const p={texture:new T.Texture(),dispose(){this.texture.dispose();}};probes.push(p);return p;}});
 try{
  roots.forEach((root,i)=>assert(reflections.prepare({key:String(i),position:[0,1.62,0]},root)));
  assert.equal(materials[0].envMap,null);const versions=materials.map(m=>m.version);
  reflections.activate('1');assert.equal(materials[0].envMap,probes[1].texture);assert.equal(materials[0].version,versions[0]+1);
  assert.equal(materials[1].version,versions[1]);assert.equal(materials[2].version,versions[2]);
  const stable=materials.map(m=>m.version);reflections.activate('1');materials.forEach((m,i)=>assert.equal(m.version,stable[i]));
 }finally{reflections.dispose();geometry.dispose();materials.forEach(m=>m.dispose());}
});


test('R176 dry tiles stay distinct from walls and share wider metre-grid joints in every material path',()=>{
 const floor=new T.Color(ARCHITECTURAL_MATERIALS.floor.color),wall=new T.Color(ARCHITECTURAL_MATERIALS.wall.color),luminance=c=>c.r*.2126+c.g*.7152+c.b*.0722;
 assert(luminance(floor)<luminance(wall)*.85,'floor must remain visibly darker than wall paint');
 assert.equal(floor.getHexString(),'c3bcb0');assert.deepEqual(orderedFloor('dry-floor').photo.appearanceRgb,[195,188,176]);
 const source=new T.MeshPhysicalMaterial(),generic=new T.MeshStandardMaterial();
 try{
  installFloorMaterial(source,orderedFloor('dry-floor'));
  const photographed={uniforms:{},fragmentShader:'#include <common>\n#include <map_fragment>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>'};source.onBeforeCompile(photographed);
  assert.equal(photographed.uniforms.floorJointMetres.value,.004);assert.equal(source.userData.floorRendering.jointMetres,.004);
  installFloorCourses(generic,{tile:[1,1],joint:.002});assert.equal(generic.userData.floorCourses.joint,.004);
  assert.equal(porcelainProfile(generic.userData).joint,.004);assert.deepEqual(generic.userData.floorCourses.tile,[1,1]);
  assert.equal(DRY_PORCELAIN.joint,FLOOR_RENDERING['dry-floor'].joint);
  assert.equal(FLOOR_RENDERING['wet-floor'].joint,.002);assert.equal(FLOOR_RENDERING['terrace-floor'].joint,.003);
 }finally{source.dispose();generic.dispose();}
});
