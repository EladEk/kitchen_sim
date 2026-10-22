import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS,BUILDING_ROOF,BUILDING_BOUNDS,buildingCamera} from './building-layout.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings,HOUSE_OUTLINE,point,ENTRANCE_SERVICES} from './home-model.mjs';
import {normalizeKitchenDesign} from './planning-pair.mjs';
import {FLOOR_SHADER_COMMON} from './floor-material.mjs';
import {applySceneUiVisibility} from './scene-interface.mjs';

const near=(a,b,t=.02)=>assert(Math.abs(a-b)<t,`${a} ≈ ${b}`);
function model(settings={},mode='building',anchor=null){const group=new THREE.Group(),resources=[],picks=[];const result=buildBuildingContext({group,resources,picks,settings:normalizeHomeSettings(settings),mode,kitchenAnchor:anchor,apartmentOutline:HOUSE_OUTLINE});group.updateMatrixWorld(true);return {...result,all:group,picks,dispose(){resources.forEach(r=>r.dispose?.());}};}
const nodes=m=>{const a=[];m.all.traverse(o=>a.push(o));return a;};

test('building sheets register multiple finished-wall controls to the original apartment without stretching it',()=>{
 const r=BUILDING.registration,transform=([x,z])=>{x-=r.groundControlPdf[0];z-=r.groundControlPdf[1];return [r.groundControlWorld[0]+(x*Math.cos(r.deskewRadians)-z*Math.sin(r.deskewRadians))*r.pdfMetresPerPoint,(x*Math.sin(r.deskewRadians)+z*Math.cos(r.deskewRadians))*r.pdfMetresPerPoint];};
 for(const [pdf,apt] of [[[568.20,1009.50],[679.74,45.7]],[[797.76,1008.90],[1138.92,45.7]],[[532.14,1301.58],[606,629.62]]]){const a=transform(pdf),b=point(...apt);near(a[0],b[0]);near(a[1],b[1]);}
 const bytes=readFileSync(new URL('../public/house/building-plan.pdf',import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),r.buildingPdfSha256);
});

test('all floor variants, the duplex continuation and the roof retain their actual PDF and photo sources',()=>{
 assert.equal(BUILDING_FLOORS.length,9);assert.deepEqual(BUILDING_FLOORS.map(f=>f.page),[3,4,5,6,6,7,8,9,10]);assert.equal(BUILDING_ROOF.page,11);
 const units=new Set(BUILDING_FLOORS.flatMap(f=>f.units.map(u=>u.number)));assert.deepEqual([...units].sort((a,b)=>a-b),Array.from({length:43},(_,i)=>i+1));
 assert.equal(BUILDING_FLOORS[6].uniqueUnitCount,5);assert.equal(BUILDING_FLOORS[6].units.some(u=>u.number===32),true);
 assert.notDeepEqual(BUILDING_FLOORS[1].envelope,BUILDING_FLOORS[2].envelope);assert.notDeepEqual(BUILDING_FLOORS[6].envelope,BUILDING_FLOORS[7].envelope);
 for(const f of [...BUILDING_FLOORS,BUILDING_ROOF])assert(existsSync(new URL('../public'+f.image,import.meta.url)));
 for(const f of BUILDING_FLOORS)for(const p of f.envelope)for(const o of p.openings){const a=p.polygon[o.edge],b=p.polygon[(o.edge+1)%p.polygon.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);assert.equal(o.basis,'pdf-wall-gap');for(const v of [o.a,o.b]){assert(Math.abs((v[0]-a[0])*(b[1]-a[1])-(v[1]-a[1])*(b[0]-a[0]))<.015);assert(Math.hypot(v[0]-a[0],v[1]-a[1])<=length+.01);}}
});

test('building cutaways remove upper storeys while the apartment view keeps non-occluding physical shadow casters',()=>{
 for(const level of [0,3,6,9]){
  const m=model({buildingLevel:level});try{assert.deepEqual([...m.floors.keys()],Array.from({length:level+1},(_,i)=>i));const all=nodes(m);assert.equal(all.some(o=>o.name==='building-roof'),level===9);assert(all.filter(o=>o.isInstancedMesh).every(o=>o.count>0));assert(all.filter(o=>o.userData.part==='building-glazing').every(o=>!o.castShadow));assert(m.picks.every(o=>o.userData.buildingFloor<=level));for(const o of all.filter(o=>o.isInstancedMesh)){const mat=new THREE.Matrix4();for(let i=0;i<o.count;i++){o.getMatrixAt(i,mat);assert(mat.elements.every(Number.isFinite));assert(mat.determinant()>0);}}}finally{m.dispose();}
 }
 const hidden=model({},'overview');try{assert(hidden.shadowOnly);assert.equal(hidden.picks.length,0);const meshes=nodes(hidden).filter(o=>o.isMesh);assert(meshes.some(o=>o.castShadow));assert(meshes.every(o=>!o.material.colorWrite&&!o.material.depthWrite));assert.equal(hidden.floors.size,10);}finally{hidden.dispose();}
 const off=model({buildingShadows:false},'overview');assert.equal(off.group,null);off.dispose();const walk=model({buildingShadows:false},'walk');assert(walk.group&&!walk.shadowOnly);assert.equal(walk.floors.size,10);walk.dispose();
});

test('context walls leave the apartment entry and service cabinets clear and its outline remains the unchanged original',()=>{
 const m=model();try{
  const e=ENTRANCE_SERVICES.context,entry=new THREE.Box3(new THREE.Vector3(e.minX+.05,.05,e.minZ+.05),new THREE.Vector3(e.maxX-.05,2.35,e.maxZ-.05)),matrix=new THREE.Matrix4(),box=new THREE.Box3();
  for(const obj of nodes(m).filter(o=>o.userData.part==='building-facade-wall'&&o.userData.buildingFloor===0))for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,matrix);box.setFromCenterAndSize(new THREE.Vector3(),new THREE.Vector3(1,1,1)).applyMatrix4(matrix);assert(!box.intersectsBox(entry),'new neighbour wall must not enter the existing common entry');}
  const highlight=m.all.getObjectByName('apartment-4-outline'),outline=highlight.geometry.attributes.position;for(let i=0;i<HOUSE_OUTLINE.length;i++){near(outline.getX(i),HOUSE_OUTLINE[i][0],.001);near(outline.getZ(i),HOUSE_OUTLINE[i][1],.001);}applySceneUiVisibility(m,{cleanView:true});assert(!highlight.visible);applySceneUiVisibility(m,{cleanView:false});assert(highlight.visible);
 }finally{m.dispose();}
});

test('the building camera fits its full volume on portrait phones and widescreen, and saved shadow/cut settings round-trip',()=>{
 const b=BUILDING_BOUNDS;
 for(const aspect of [.48,.65,1,1.8]){const frame=buildingCamera(aspect),camera=new THREE.PerspectiveCamera(aspect<1?52:44,aspect,.06,500);camera.position.set(...frame.position);camera.lookAt(...frame.target);camera.updateMatrixWorld(true);for(const x of [b.minX,b.maxX])for(const z of [b.minZ,b.maxZ])for(const y of [0,b.maxY]){const p=new THREE.Vector3(x,y,z).project(camera);assert(Math.abs(p.x)<.94&&Math.abs(p.y)<.94&&p.z<1,'whole building must fit without clipping');}}
 const h=normalizeHomeSettings({buildingLevel:6,buildingShadows:false});assert.equal(normalizeHomeSettings(JSON.parse(JSON.stringify(h))).buildingLevel,6);assert.equal(normalizeHomeSettings({buildingLevel:Infinity}).buildingLevel,9);assert.equal(normalizeKitchenDesign({buildingShadows:false}).buildingShadows,false);
 const anchor=[11.5,5.5],k=model({},'kitchen',anchor),point=new THREE.Vector3(10,3,4);try{k.group.localToWorld(point);near(point.x,anchor[0]-10);near(point.z,anchor[1]-4);near(point.y,3);}finally{k.dispose();}
});

function expand(source){source=source.replace(/^[ \t]*#include +<([\w\d./]+)>/gm,(_,name)=>expand(THREE.ShaderChunk[name]));source=source.replace(/NUM_[A-Z_]+|UNION_CLIPPING_PLANES/g,name=>({NUM_DIR_LIGHTS:1,NUM_HEMI_LIGHTS:1,NUM_DIR_LIGHT_SHADOWS:1})[name]??0);return source.replace(/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,(_,start,end,body)=>Array.from({length:end-start},(_,j)=>body.replace(/\[\s*i\s*\]/g,`[${+start+j}]`).replace(/UNROLLED_LOOP_INDEX/g,+start+j)).join(''));}
test('the actual facade stone shader compiles and links with Three lighting and instancing on native GLES3',t=>{
 const m=model(),material=nodes(m).find(o=>o.userData.part==='building-facade-wall').material,shader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
 const common='precision highp float;\nprecision highp int;\n#define HIGH_PRECISION\n#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF_SOFT\n';
 const vertex='#version 300 es\n#define attribute in\n#define varying out\n#define texture2D texture\n'+common+'uniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;\nuniform mat3 normalMatrix;\nuniform vec3 cameraPosition;\nuniform bool isOrthographic;\nin vec3 position,normal;\nin vec2 uv;\n';
 const fragment='#version 300 es\n#define varying in\n#define texture2D texture\n#define texture2DGradEXT textureGrad\n#define texture2DLodEXT textureLod\n#define textureCube texture\n#define gl_FragColor pc_fragColor\nlayout(location=0) out highp vec4 pc_fragColor;\n'+common+'uniform mat4 viewMatrix;\nuniform vec3 cameraPosition;\nuniform bool isOrthographic;\n'+THREE.ShaderChunk.colorspace_pars_fragment+'\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v);}\nfloat luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}\n';
 const programs=[{vertex:vertex+'#define USE_INSTANCING\nin mat4 instanceMatrix;\n'+expand(shader.vertexShader),fragment:fragment+expand(shader.fragmentShader)}];
 const siteMaterial=nodes(m).find(o=>o.userData.part==='site-sidewalk').material,siteShader={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};siteMaterial.onBeforeCompile(siteShader);programs.push({vertex:vertex+'#define USE_MAP\n#define MAP_UV uv\n'+expand(siteShader.vertexShader),fragment:fragment+'#define USE_MAP\n'+expand(siteShader.fragmentShader)});
 const result=spawnSync('python',['qa/check-floor-gpu.py'],{cwd:new URL('../',import.meta.url),input:JSON.stringify({programs,common:FLOOR_SHADER_COMMON}),encoding:'utf8',timeout:30000,maxBuffer:1000000});m.dispose();if(result.error?.code==='ENOENT'||result.status===77){t.skip('Native EGL is unavailable');return;}assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));assert.equal(JSON.parse(result.stdout).linked,2);
});
