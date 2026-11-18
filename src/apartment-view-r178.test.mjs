import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createSelection} from '../public-view/selection.mjs';
import {createFocusedSelection} from '../public-view/focused-selection.mjs';
import {createSelectionController,selectionBounds,fitSelectionCamera} from '../public-view/selection-view.mjs';
import {createSelectionBackdrop} from '../public-view/selection-backdrop.mjs';
import {createFinishNodeMaterial} from '../public-view/webgpu-finishes.mjs';
import {traditionalMaterial} from './traditional-material.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';
import {createInteriorProbe} from './interior-probe.mjs';
import {createReferenceLighting} from '../public-view/reference-lighting.mjs';
import {DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {setEditorTopView} from '../public-view/editor-visual-tools.mjs';
import {createCameraWallFade} from '../public-view/wall-fade.mjs';
import {createFurniturePlacement} from '../public-view/furniture-placement.mjs';
import {resolveSelectionDestination,selectionDestinations} from '../public-view/selection-destinations.mjs';
import {selectionRegions} from '../public-view/selection.mjs';

const polygon=x=>[[x,0],[x+4,0],[x+4,4],[x,4]];
const nav={storey:3,floors:[{level:0,elevation:0,units:[{number:1,polygon:polygon(0)},{number:2,polygon:polygon(8)}]},{level:1,elevation:3,units:[{number:5,polygon:polygon(0)}]}],destinations:[{id:'unit:1:0',unit:1,floor:0},{id:'unit:2:0',unit:2,floor:0},{id:'unit:5:1',unit:5,floor:1}]};
function fixture(){
 const root=new T.Group(),geometry=new T.BoxGeometry(14,.1,4),material=new T.MeshPhysicalMaterial({color:'#c3bcb0'}),floor=new T.Mesh(geometry,material);floor.position.set(6,-.05,2);floor.userData.level=0;root.add(floor);
 const ceiling=new T.Mesh(geometry,material);ceiling.userData={level:0,ceiling:true};ceiling.position.set(6,2.8,2);root.add(ceiling);
 return {root,floor,geometry,material,dispose(){geometry.dispose();material.dispose();}};
}
function baseBounds(content,matrix){return selectionBounds(content).applyMatrix4(matrix.clone().invert());}

test('R178 duplex upper-floor aliases resolve to the apartment and appear in that floor selector',()=>{
 const lower={id:'unit:32:5',unit:32,floor:5,label:'דירה 32',position:[2,2],yaw:1},data={storey:3,destinations:[lower],floors:[{level:5,elevation:15,units:[{number:32,polygon:polygon(0)}]},{level:6,elevation:18,units:[{number:32,polygon:polygon(0)}]}]};
 const upper=resolveSelectionDestination(data,'unit:32:6');assert.equal(upper.unit,32);assert.equal(upper.floor,6);assert.equal(upper.elevation,18);assert.deepEqual(upper.position,[2,2]);assert.deepEqual(selectionRegions(data,{level:6,target:upper.id}).map(r=>r.level),[5,6]);
 assert.deepEqual(selectionDestinations(data,6).map(d=>d.id),['unit:32:6']);assert.equal(selectionDestinations(data,6),selectionDestinations(data,6));assert.deepEqual(selectionDestinations(data,9),[lower]);assert.equal(resolveSelectionDestination(data,'unit:99:6'),undefined);assert.equal(data.destinations.length,1);
 const focused=selectionRegions(data,{level:6,target:upper.id,roomFocus:{unit:32,floor:6,polygons:[polygon(0)]}});assert.deepEqual(focused.map(r=>r.level),[6]);
});

test('R178 focused views contain only the apartment geometry in every rotated and reflected building',()=>{
 for(const building of DISTRICT){
  const f=fixture(),root=new T.Group(),district={group:new T.Group(),setActiveBuilding(){}},prepared=[],controller=createSelectionController({root,model:f.root,nav,district,onPrepareGroup:g=>prepared.push(g)}),state={building:building.id,level:0,target:'unit:1:0',mode:'building'};
  try{
   const view=controller.update(state),box=baseBounds(view.content,buildingTransform(building));
   assert(Math.abs(box.min.x)<1e-5&&Math.abs(box.max.x-4)<1e-5);assert(Math.abs(box.min.z)<1e-5&&Math.abs(box.max.z-4)<1e-5);assert(box.max.y<.01);assert.equal(district.group.visible,false);
   const meshes=[];view.content.traverseVisible(o=>{if(o.isMesh)meshes.push(o);});assert(meshes.length>0);assert(meshes.every(o=>!o.userData.gpuSelectionClip));assert(meshes.every(o=>o.material.color.getHexString()==='c3bcb0'));
   const before=prepared.length,firstGeometry=meshes[0].geometry;assert.equal(controller.update(state).content,view.content);assert.equal(prepared.length,before);
   const next=controller.update({...state,target:'unit:2:0'}),nextBox=baseBounds(next.content,buildingTransform(building));assert(Math.abs(nextBox.min.x-8)<1e-5&&Math.abs(nextBox.max.x-12)<1e-5);assert(meshes[0].geometry===firstGeometry);
   controller.update({building:building.id,level:9,target:'',mode:'building'});assert.equal(district.group.visible,true);assert.equal(f.geometry.attributes.position.count,24);
  }finally{controller.dispose();f.dispose();}
 }
});

test('R178 focused geometry is reused between frames, replaced on scope changes and released once',()=>{
 const f=fixture(),focused=createFocusedSelection(f.root,nav),a={level:0,target:'unit:1:0'};let released=0;
 try{
  assert(focused.update(a));const old=focused.group.children[0].children[0].geometry;old.addEventListener('dispose',()=>released++);
  assert.equal(focused.update(a),false);assert.equal(focused.group.children[0].children[0].geometry,old);assert(focused.update({...a,target:'unit:2:0'}));assert.equal(released,1);
  focused.dispose();focused.dispose();assert.equal(released,1);
 }finally{focused.dispose();f.dispose();}
});

test('R178 clipping retains coloured furniture instances in every displayed polygon',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(.4,.4,.4),material=new T.MeshStandardMaterial({color:'#ffffff'}),mesh=new T.InstancedMesh(geometry,material,3);
 [[1,1],[5,1],[9,1]].forEach(([x,z],i)=>{mesh.setMatrixAt(i,new T.Matrix4().makeTranslation(x,.2,z));mesh.setColorAt(i,new T.Color(['#ba7051','#527f64','#6a89b1'][i]));});mesh.userData={level:0,furnitureRender:true};root.add(mesh);
 const expanded={...nav,floors:[{...nav.floors[0],units:[{number:1,polygon:polygon(0),displayPolygons:[polygon(0),polygon(8)]}]}]},selection=createSelection(root,expanded,{level:0,target:'unit:1:0'});
 try{const out=selection.group.children[0],colour=new T.Color();assert.equal(out.count,2);assert.equal(out.geometry,geometry);out.getColorAt(0,colour);assert.equal(colour.getHexString(),'ba7051');out.getColorAt(1,colour);assert.equal(colour.getHexString(),'6a89b1');}
 finally{selection.dispose();mesh.dispose();geometry.dispose();material.dispose();}
});

test('R178 clipped instance colours remain visible in NodeMaterials and their photo equivalents',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(1,1,1),source=new T.MeshPhysicalMaterial({color:'#ffffff'}),node=createFinishNodeMaterial(source),mesh=new T.InstancedMesh(geometry,node,2);mesh.userData.level=0;
 mesh.setMatrixAt(0,new T.Matrix4().makeTranslation(1,.5,1));mesh.setMatrixAt(1,new T.Matrix4().makeTranslation(9,.5,1));mesh.setColorAt(0,new T.Color('#b8784e'));mesh.setColorAt(1,new T.Color('#396e8c'));root.add(mesh);
 const selection=createSelection(root,nav,{level:0,target:'unit:1:0'}),scene=new T.Scene();scene.add(selection.group);const photo=createPhotoScene(scene);
 try{
  const live=selection.group.children[0],painted=photo.scene.children[0],colour=new T.Color().fromBufferAttribute(live.geometry.attributes.color,0);
  assert(live.material.vertexColors);assert.equal(colour.getHexString(),'b8784e');assert.equal(traditionalMaterial(live.material).vertexColors,true);assert(painted.material.vertexColors);assert(painted.geometry.attributes.color);assert.equal(source.vertexColors,false);assert.equal(mesh.count,2);
 }finally{photo.dispose();selection.dispose();mesh.dispose();geometry.dispose();node.dispose();source.dispose();}
});

test('R178 clipped vertex colours are interpolated instead of being dropped to white',()=>{
 const root=new T.Group(),geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([-1,0,1,3,0,1,1,0,3],3));geometry.setAttribute('normal',new T.Float32BufferAttribute([0,1,0,0,1,0,0,1,0],3));geometry.setAttribute('color',new T.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));const material=new T.MeshStandardMaterial({vertexColors:true}),mesh=new T.Mesh(geometry,material);mesh.userData.level=0;root.add(mesh);const selection=createSelection(root,nav,{level:0,target:'unit:1:0'});
 try{const out=selection.group.children[0].geometry,colors=out.attributes.color;assert(colors);assert(colors.count>3);for(let i=0;i<colors.count;i++)assert(Math.abs(colors.getX(i)+colors.getY(i)+colors.getZ(i)-1)<1e-6);assert([...colors.array].some(v=>v>0&&v<1));}
 finally{selection.dispose();geometry.dispose();material.dispose();}
});

test('R178 detached backdrop retains lighting and restores day/night visibility after sync and async draws',async()=>{
 const scene=new T.Scene(),sky=new T.Mesh(new T.SphereGeometry(),new T.MeshBasicMaterial()),environment=new T.Texture(),original=new T.Color('#8faed0');sky.userData.celestialBackground=true;scene.add(sky);scene.background=original;scene.environment=environment;scene.environmentIntensity=.8;const backdrop=createSelectionBackdrop(scene);
 const inspect=()=>{assert.equal(scene.background.getHexString(),'d9d5ce');assert.equal(sky.visible,false);assert.equal(scene.environment,environment);assert.equal(scene.environmentIntensity,.8);};
 try{backdrop.render(true,inspect);assert.equal(scene.background,original);assert(sky.visible);await backdrop.render(true,async()=>{await Promise.resolve();inspect();});assert(sky.visible);sky.visible=false;assert.throws(()=>backdrop.render(true,()=>{inspect();throw Error('draw');}));assert.equal(sky.visible,false);assert.equal(scene.background,original);}
 finally{sky.geometry.dispose();sky.material.dispose();environment.dispose();}
});

test('R178 disposed cropped materials release interior and reference-light bindings',()=>{
 const scene=new T.Scene(),geometry=new T.BoxGeometry(),material=new T.MeshStandardMaterial();material.userData.surfaceKind='plaster';scene.add(new T.Mesh(geometry,material));
 const factory=()=>({texture:new T.Texture(),dispose(){this.texture.dispose();}}),probe=createInteriorProbe({}, {environmentFactory:factory}),reference=createReferenceLighting(scene,{toneMapping:0,toneMappingExposure:1},{environmentFactory:factory});
 try{probe.bind(scene);reference.bind(scene);assert.equal(probe.stats.materials,1);assert.equal(reference.stats.materials,1);material.dispose();assert.equal(probe.stats.materials,0);assert.equal(reference.stats.materials,0);}
 finally{probe.dispose();reference.dispose();geometry.dispose();}
});

test('R178 focused backdrop does not rescan the full hidden building on each frame',()=>{
 const scene=new T.Scene(),sky=new T.Group();sky.userData.celestialBackground=true;scene.add(sky);let traversals=0;const traverse=scene.traverse.bind(scene);scene.traverse=visit=>{traversals++;traverse(visit);};const backdrop=createSelectionBackdrop(scene);
 for(let i=0;i<100;i++)backdrop.render(true,()=>assert.equal(sky.visible,false));assert.equal(traversals,1);assert.equal(sky.visible,true);
});

test('R178 editor framing and placement rays target the selected floor after a phone dock resize',()=>{
 const f=fixture(),selection=createFocusedSelection(f.root,nav);selection.update({level:0,target:'unit:1:0'});const camera=new T.PerspectiveCamera(48,394/620,.06,1200),controls={target:new T.Vector3(),update(){}},view={content:selection.group,building:DISTRICT.find(b=>b.id==='4102')};
 try{
  camera.aspect=394/270;camera.updateProjectionMatrix();fitSelectionCamera(camera,controls,view);setEditorTopView(camera,controls,selectionBounds(selection.group));
  const ray=new T.Raycaster();ray.setFromCamera(new T.Vector2(0,0),camera);const hit=ray.intersectObject(selection.group,true)[0];assert(hit);assert(hit.point.x>=0&&hit.point.x<=4&&hit.point.z>=0&&hit.point.z<=4);
  let state={stage:'pick',template:{kind:'bed'},item:{x:0,z:0}},accepted=0;const placement=createFurniturePlacement({getSession:()=>state,point:()=>({...state,item:{x:hit.point.x,z:hit.point.z},error:''}),select:next=>{state=next;accepted++;}}),event={pointerId:1,pointerType:'touch',button:0,clientX:100,clientY:100};placement.down(event);placement.up(event);assert.equal(accepted,1);assert.equal(state.stage,'move');assert(state.hasPoint);
 }finally{selection.dispose();f.dispose();}
});

test('R178 a fresh focused view starts without a stale wall-fade clone',()=>{
 const root=new T.Group(),geometry=new T.BoxGeometry(3,3,.1),material=new T.MeshStandardMaterial();material.userData.surfaceKind='plaster';const mesh=new T.Mesh(geometry,material),camera=new T.PerspectiveCamera();root.add(mesh);camera.position.set(0,0,.2);const fade=createCameraWallFade();
 try{fade.update(root,camera,new T.Vector3(0,0,-1),true,1000,{walking:true});assert(mesh.material.transparent);fade.reset();assert.equal(mesh.material,material);assert.equal(material.opacity,1);assert.equal(material.transparent,false);}
 finally{fade.dispose();geometry.dispose();material.dispose();}
});
