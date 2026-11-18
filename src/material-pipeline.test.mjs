import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshPhysicalMaterial,MeshStandardMaterial,Group,Mesh,BoxGeometry} from 'three';
import {createFinishNodeMaterial,createFinishAdapter} from '../public-view/webgpu-finishes.mjs';
import {ARCHITECTURAL_MATERIALS} from './architectural-materials.mjs';
import {ALL_LIGHTING_DEFINITIONS} from './home-lighting.mjs';
import {buildLightingPoints} from './home-lighting-scene.js';
import {createSceneStateUpdater} from './scene-state.mjs';
import {warmDimColor} from './photometric-lighting.mjs';

test('physical TSL finishes retain optical attenuation and isolated role settings across adaptation and disposal',()=>{
 const sources=[];
 for(const role of ['glass','handle','frame','fence','entryDoor']){
  const source=new MeshPhysicalMaterial(ARCHITECTURAL_MATERIALS[role]);source.userData={architecturalRole:role,...(role==='glass'?{architecturalGlass:true}:{})};sources.push(source);
  const node=createFinishNodeMaterial(source);
  assert(node.isMeshPhysicalNodeMaterial);assert(node.normalNode);assert.notEqual(node,source);
  if(role==='glass'){assert(node.aoNode);assert(node.attenuationColor.equals(source.attenuationColor));assert.equal(node.attenuationDistance,.65);assert.equal(node.transmission,.9);}
  else{assert(node.roughnessNode);assert(node.anisotropy>0);assert.equal(source.roughness,ARCHITECTURAL_MATERIALS[role].roughness);}
  node.dispose();
 }
 const root=new Group(),source=sources[2],mesh=new Mesh(new BoxGeometry(),source);root.add(mesh);
 const adapter=createFinishAdapter({mobile:true});adapter.apply(root);const adapted=mesh.material;adapter.apply(root);assert.equal(mesh.material,adapted);adapter.dispose();assert.equal(mesh.material,source);assert(mesh.geometry.attributes.uv);assert(mesh.geometry.attributes.tangent);
 mesh.geometry.dispose();sources.forEach(m=>m.dispose());
});

test('porcelain, organic plaster and turf retain normal and cavity nodes at mobile quality',()=>{
 for(const data of [{publicFinish:'floor'},{surfaceKind:'plaster',wallCavity:{height:2.75}},{siteSurface:'grass'}]){
  const source=new MeshStandardMaterial();source.userData=data;const material=createFinishNodeMaterial(source,{mobile:true});
  assert(material.isMeshPhysicalNodeMaterial);assert(material.normalNode);assert(material.aoNode);assert(material.roughnessNode);
  if(data.publicFinish==='floor')assert(material.clearcoatNode);
  material.dispose();source.dispose();
 }
});

test('observed downlights preserve photometric cone geometry while dimming changes only live light and aperture output',()=>{
 const id=ALL_LIGHTING_DEFINITIONS[0].id,group=new Group(),resources=[],picks=[],settings={light:'day',lampsOn:true,lightControls:{[id]:{brightness:75,kelvin:3000}}};
 const mat=(color,options={})=>{const m=new MeshStandardMaterial({color,...options});resources.push(m);return m;};
 const mesh=(x,y,z,w,h,d,m,parent)=>{const geometry=new BoxGeometry(w,h,d);resources.push(geometry);const out=new Mesh(geometry,m);out.position.set(x,y,z);parent.add(out);return out;};
 const cylinder=(x,y,z,r,h,m,parent)=>mesh(x,y,z,r*2,h,r*2,m,parent);
 const points=[{id,position:[0,2.75,0],normal:[0,1],drop:.1,recessed:true}];
 buildLightingPoints({group,box:mesh,cylinder,mat,resources,settings,points,picks});
 const spot=group.getObjectsByProperty('isSpotLight',true)[0],geometry=group.children[0].children[0].geometry;
 assert(Math.abs(spot.angle-Math.PI/3.1)<1e-12);assert.equal(spot.penumbra,.68);assert.equal(spot.decay,2);
 const update=createSceneStateUpdater(group,null,settings);update(settings);const before=spot.intensity;
 update({...settings,lampsOn:false});assert.equal(spot.intensity,0);
 update(settings);assert.equal(spot.intensity,before);assert.equal(group.children[0].children[0].geometry,geometry);
 const core=group.children[0].children.find(o=>o.userData.part==='observed-recessed-diffuser');assert.equal(core.material.emissiveIntensity,2.4);
 assert(spot.color.equals(warmDimColor('#ffe2b1',1)));
 resources.forEach(r=>r.dispose());spot.shadow.dispose();
});
