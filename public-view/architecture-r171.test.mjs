import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {computeBoxUVs,prepareSceneGeometry,prepareSurfaceGeometry} from '../src/geometry-safety.mjs';
import {applyFloorReflectance} from '../src/floor-photo-preparation.mjs';
import {ARCHITECTURAL_MATERIALS,applyArchitecturalMaterials} from '../src/architectural-materials.mjs';
import {createWalkingDisplay} from './walking-display.mjs';
import {createCameraWallFade} from './wall-fade.mjs';
import {createAdaptiveQuality} from './adaptive-quality.mjs';
import {createShellPreview} from './shell-preview.mjs';

test('missing and empty structural UVs get metre-scale seams, valid normals and finite tangents',()=>{
 for(const empty of [false,true]){
  const g=new T.BoxGeometry(2,3,4);if(empty)g.setAttribute('uv',new T.BufferAttribute(new Float32Array(g.attributes.position.count*2),2));else g.deleteAttribute('uv');g.attributes.normal.array.fill(0);
  const result=prepareSurfaceGeometry(g,new T.Matrix4().makeTranslation(4,0,7));assert(result.valid);const p=result.geometry.attributes;
  assert(p.normal.array instanceof Float32Array);assert(p.tangent.array.every(Number.isFinite));assert(p.uv.array.every(Number.isFinite));assert(Math.max(...p.uv.array)>6,'coordinates include world metres');
  for(let i=0;i<p.normal.count;i++)assert(Math.hypot(p.normal.getX(i),p.normal.getY(i),p.normal.getZ(i))>.99);
  result.geometry.dispose();g.dispose();
 }
});
test('invalid geometry loses texture bindings locally while shared valid surfaces and sky retain theirs',()=>{
 const root=new T.Group(),map=new T.Texture(),m=new T.MeshPhysicalMaterial({map,normalMap:map}),bad=new T.BufferGeometry().setAttribute('position',new T.BufferAttribute(new Float32Array([0,0,0,0,0,0,0,0,0]),3)),good=new T.BoxGeometry();
 const a=new T.Mesh(bad,m),b=new T.Mesh(good,m),sky=new T.Mesh(new T.SphereGeometry(),new T.MeshBasicMaterial({side:T.BackSide}));sky.userData.celestialBackground=true;root.add(a,b,sky);prepareSceneGeometry(root);assert.notEqual(a.material,b.material);assert.equal(a.material.map,null);assert.equal(b.material.map,map);assert.equal(sky.material.side,T.BackSide);assert.equal(b.material.side,T.FrontSide);
});
test('the actual public snapshot keeps requested facade roles and wall/ceiling separation after serialization',async()=>{
 const json=JSON.parse(await readFile(new URL('../dist/client/baseline/building.json',import.meta.url),'utf8'));const root=await new T.ObjectLoader().parseAsync(json);applyArchitecturalMaterials(root);
 const roles=new Map();root.traverse(o=>{for(const m of [o.material].flat().filter(Boolean))if(m.userData.architecturalRole)roles.set(m.userData.architecturalRole,m);});
 for(const role of ['facade','secondary','fascia','ceiling','door','entryDoor','frame','floor']){const m=roles.get(role);assert(m,'missing '+role);assert.equal(m.color.getHexString(),ARCHITECTURAL_MATERIALS[role].color.slice(1));assert.equal(m.roughness,ARCHITECTURAL_MATERIALS[role].roughness);}
 const ceil=roles.get('ceiling');assert.equal(ceil.roughness,.94);assert.equal(ceil.clearcoat,0);
});
test('near-camera fade is smooth, bounded and restores source material and collision geometry',()=>{
 const root=new T.Group(),m=new T.MeshPhysicalMaterial({color:'#f2efe9'});m.userData.wallCavity={};const g=new T.BoxGeometry(2,3,.2),wall=new T.Mesh(g,m);root.add(wall);wall.position.y=1.5;const camera=new T.PerspectiveCamera();camera.position.set(0,1.5,.3);const fade=createCameraWallFade();
 for(let now=200;now<2000;now+=16)fade.update(root,camera,new T.Vector3(),true,now,{walking:true});assert(wall.material.opacity<.16&&wall.material.opacity>=.15);assert(wall.material.transparent);assert(!wall.material.depthWrite);assert.equal(wall.geometry,g);assert(wall.visible);
 fade.update(root,camera,new T.Vector3(),false,2100);assert.equal(wall.material,m);fade.dispose();g.dispose();m.dispose();
});
test('automatic mobile quality retains tier one while resolution adapts under sustained load',()=>{
 const q=createAdaptiveQuality({mobile:true,pixelRatio:3.25});const ratio=q.profile.ratio;for(let t=1;t<25000;t+=65){q.sample(t);assert.equal(q.profile.tier,1);assert(q.profile.ratio<=2);}assert(q.profile.ratio<ratio);
});
test('a standalone lightweight shell fits its camera and needs fewer than 150 draw objects',async()=>{
 const data=JSON.parse(await readFile(new URL('../dist/client/baseline/shell.json',import.meta.url),'utf8')),shell=createShellPreview(data,{aspect:1.4});let count=0;shell.scene.traverse(o=>{if(o.isMesh)count++;});assert(count<=4);assert(!new T.Box3().setFromObject(shell.scene).isEmpty());assert.equal(shell.camera.aspect,1.4);shell.dispose();
});

test('white granite swatch retains photographed detail without importing brown showroom illumination',()=>{
 const pixels=new Uint8Array([163,155,147,255,120,115,111,255,190,181,173,255]);const result=applyFloorReflectance(pixels);
 assert(result[0]>230&&result[1]>230&&result[2]>225);assert(result[0]>result[4]);assert.deepEqual(pixels,new Uint8Array([163,155,147,255,120,115,111,255,190,181,173,255]));
});

test('walking batches share exterior materials across storeys while inward paint retains occupied-floor visibility',()=>{
 const root=new T.Group(),g=new T.BoxGeometry(),stone=new T.MeshStandardMaterial(),paint=new T.MeshPhysicalMaterial();stone.userData.publicFinish='stone';paint.userData.wallCavity={};
 for(const level of [0,1,2])for(const m of [stone,paint]){const o=new T.Mesh(g,m);o.position.y=level*3+1.5;o.userData={level,exterior:true};root.add(o);}
 const display=createWalkingDisplay(root);display.update(0);let exterior=0,indoorVisible=0,indoorHidden=0;display.group.traverse(o=>{if(!o.isMesh)return;if(o.material===stone)exterior++;if(o.material===paint)(o.parent.visible?indoorVisible++:indoorHidden++);});
 assert.equal(exterior,1);assert.equal(indoorVisible,1);assert.equal(indoorHidden,2);display.dispose();g.dispose();stone.dispose();paint.dispose();
});

test('mobile static shadow batches preserve silhouettes on a shadow-only layer and leave collision sources unchanged',()=>{
 const root=new T.Group(),g=new T.BoxGeometry(),a=new T.MeshStandardMaterial(),b=new T.MeshStandardMaterial();for(const [i,m]of [a,b].entries()){const o=new T.Mesh(g,m);o.position.x=i*2;o.castShadow=true;o.userData={level:0,exterior:false};root.add(o);}
 const display=createWalkingDisplay(root,{batchShadows:true});assert.deepEqual(display.shadowStats,{originalCasters:2,batchedCasters:1});let proxy;display.group.traverse(o=>{if(o.userData.shadowProxy)proxy=o;});assert(proxy);assert.equal(proxy.layers.mask,2);assert.equal(proxy.geometry.attributes.position.count,72);assert(root.children.every(o=>o.castShadow));display.dispose();g.dispose();a.dispose();b.dispose();
});

test('animated cabinet branches retain independent dynamic shadows rather than entering static shadow batches',()=>{
 const root=new T.Group(),motion=new T.Group(),g=new T.BoxGeometry(),m=new T.MeshStandardMaterial(),leaf=new T.Mesh(g,m);motion.userData={tourMotionId:'cabinet',level:0,exterior:false};leaf.castShadow=true;motion.add(leaf);root.add(motion);
 const display=createWalkingDisplay(root,{batchShadows:true});assert.equal(display.shadowStats.originalCasters,0);let dynamic=false;display.group.traverse(o=>{if(o.isMesh)dynamic||=o.castShadow&&!o.userData.shadowProxy;});assert(dynamic);display.dispose();g.dispose();m.dispose();
});
