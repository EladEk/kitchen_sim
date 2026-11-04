import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import * as THREE from 'three';
import {prepareFloorPhoto,PHOTO_LIGHTING_GAIN_MIN,PHOTO_LIGHTING_GAIN_MAX} from './floor-photo-preparation.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {ORDERED_FLOORS} from './ordered-flooring.mjs';
import {configureSurfaceRenderer} from './scene-environment.js';
import {FLOOR_SHADER_COMMON} from './floor-material.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
import {installStoneCourses,installFloorCourses,installWallCavity} from './building-finish-shaders.mjs';

const decode=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const encode=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));

test('photo preparation reduces broad lighting falloff, preserves fine flecks and colour ratios, and never edits input pixels',()=>{
 const size=64,pixels=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,light=1+(y/(size-1)-.5)*.22,fleck=(x+y)%2?.035:-.035;
  pixels.set([encode((.35+fleck)*light),encode((.31+fleck)*light),encode((.27+fleck)*light),255],i);
 }
 const original=new Uint8Array(pixels),result=prepareFloorPhoto(pixels,size),rows=data=>Array.from({length:size},(_,y)=>{let sum=0;for(let x=0;x<size;x++)sum+=decode(data[(y*size+x)*4]);return sum/size;});
 const before=rows(pixels),after=rows(result.color);assert(Math.abs(after.at(-1)-after[0])<Math.abs(before.at(-1)-before[0])*.15);
 let fineBefore=0,fineAfter=0,averageBefore=0,averageAfter=0;
 for(let i=0;i<pixels.length;i+=4){
  for(let c=0;c<3;c++){const gain=decode(result.color[i+c])/decode(pixels[i+c]);assert(gain>=PHOTO_LIGHTING_GAIN_MIN-.015&&gain<=PHOTO_LIGHTING_GAIN_MAX+.015);}
  assert(Math.abs(decode(result.color[i])/decode(result.color[i+2])-decode(pixels[i])/decode(pixels[i+2]))<.03,'neutral illumination correction retains the photographed colour ratios');
  averageBefore+=pixels[i];averageAfter+=result.color[i];
  if((i/4)%size<size-1){fineBefore+=Math.abs(pixels[i]-pixels[i+4]);fineAfter+=Math.abs(result.color[i]-result.color[i+4]);}
 }
 assert(fineAfter>fineBefore*.95&&fineAfter<fineBefore*1.05,'real small flecks must not be blurred away');assert(Math.abs(averageAfter-averageBefore)/(size*size)<1);assert.deepEqual(pixels,original);assert.equal(result.lightingCorrection.calibrated,false);
 const uniform=new Uint8Array(16*16*4);for(let i=0;i<uniform.length;i+=4)uniform.set([166,154,141,255],i);assert.deepEqual(prepareFloorPhoto(uniform,16).color,uniform);
});

test('actual ordered materials use non-mirrored photographic tiles, matte dielectric reflection and physical joints without affecting wall decor',()=>{
 const resources=[],surface=createSurfacePalette(resources);
 try{
  for(const [id,p] of Object.entries(ORDERED_FLOORS)){
   const material=surface(p.kind,p.color,{productId:id}),shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader);
   assert(material.isMeshPhysicalMaterial);assert.equal(material.clearcoat,0);assert(material.specularIntensity<1);assert.equal(material.bumpScale,0);assert.equal(material.map.wrapS,THREE.ClampToEdgeWrapping);assert.equal(material.map.anisotropy,16);assert.equal(material.userData.floorRendering.mirrored,false);
   assert.deepEqual(shader.uniforms.floorTileMetres.value.toArray(),p.tile);assert.equal(shader.uniforms.floorJointMetres.value,id==='terrace-floor'?.003:.002);assert.equal(shader.uniforms.floorQuarterTurns.value,p.tile[0]===p.tile[1]?4:2);assert(shader.fragmentShader.includes('textureGrad(map,floorSourceUV,floorDx,floorDy)'));assert(shader.fragmentShader.includes('floorRelief'));assert(shader.fragmentShader.includes('roughnessFactor=mix(roughnessFactor,.98,floorJoint)'));
  }
  const wall=surface('cement','#b2ada9',{productId:'wet-wall'});assert(!wall.isMeshPhysicalMaterial);assert.equal(wall.userData.floorRendering,undefined);
 }finally{resources.forEach(r=>r.dispose());}
 const renderer={};configureSurfaceRenderer(renderer);assert.equal(renderer.toneMapping,THREE.NeutralToneMapping);assert.equal(renderer.toneMappingExposure,1);assert.equal(renderer.outputColorSpace,THREE.SRGBColorSpace);
 for(const name of ['HomeView.jsx','ModelView.jsx']){const code=readFileSync(new URL(name,import.meta.url),'utf8');assert(code.includes('configureSurfaceRenderer(renderer)'));assert(!code.includes('ACESFilmicToneMapping'));}
});

function expand(source){
 source=source.replace(/^[ \t]*#include +<([\w\d./]+)>/gm,(_,name)=>expand(THREE.ShaderChunk[name]));
 source=source.replace(/NUM_[A-Z_]+|UNION_CLIPPING_PLANES/g,name=>({NUM_DIR_LIGHTS:1,NUM_HEMI_LIGHTS:1,NUM_DIR_LIGHT_SHADOWS:1,NUM_SPOT_LIGHTS:1,NUM_SPOT_LIGHT_SHADOWS:1,NUM_SPOT_LIGHT_COORDS:1})[name]??0);
 return source.replace(/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g,(_,start,end,body)=>Array.from({length:end-start},(_,j)=>body.replace(/\[\s*i\s*\]/g,`[${+start+j}]`).replace(/UNROLLED_LOOP_INDEX/g,+start+j)).join(''));
}

test('the complete patched Three physical shaders compile/link on native GLES3 and physical joints retain their subpixel coverage',t=>{
 const resources=[],surface=createSurfacePalette(resources),material=surface('porcelain','#fff',{productId:'dry-floor'}),shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};material.onBeforeCompile(shader);
 const common=`precision highp float;\nprecision highp int;\n#define HIGH_PRECISION\n#define PHYSICAL\n#define USE_MAP\n#define USE_ROUGHNESSMAP\n#define USE_BUMPMAP\n#define USE_SHADOWMAP\n#define SHADOWMAP_TYPE_PCF_SOFT\n#define MAP_UV uv\n#define BUMPMAP_UV uv\n#define ROUGHNESSMAP_UV uv\n`;
 const vertex=`#version 300 es\n#define attribute in\n#define varying out\n#define texture2D texture\n${common}\nuniform mat4 modelMatrix,modelViewMatrix,projectionMatrix,viewMatrix;\nuniform mat3 normalMatrix;\nuniform vec3 cameraPosition;\nuniform bool isOrthographic;\nin vec3 position,normal;\nin vec2 uv;\n`;
 const fragment=`#version 300 es\n#define varying in\n#define texture2D texture\n#define texture2DGradEXT textureGrad\n#define texture2DLodEXT textureLod\n#define textureCube texture\n#define gl_FragColor pc_fragColor\nlayout(location=0) out highp vec4 pc_fragColor;\n${common}\nuniform mat4 viewMatrix;\nuniform vec3 cameraPosition;\nuniform bool isOrthographic;\n${THREE.ShaderChunk.colorspace_pars_fragment}\nvec4 linearToOutputTexel(vec4 v){return sRGBTransferOETF(v);}\nfloat luminance(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}\n`;
 const programs=[{vertex:vertex+expand(shader.vertexShader),fragment:fragment+expand(shader.fragmentShader)}];
 const environment='#define DOUBLE_SIDED\n#define USE_ENVMAP\n#define ENVMAP_TYPE_CUBE_UV\n#define ENVMAP_MODE_REFLECTION\n#define CUBEUV_TEXEL_WIDTH .00130208333\n#define CUBEUV_TEXEL_HEIGHT .0009765625\n#define CUBEUV_MAX_MIP 8.0\n';
 programs.push({vertex:vertex.replace(common,common+environment)+expand(shader.vertexShader),fragment:fragment.replace(common,common+environment)+expand(shader.fragmentShader)});
 const cloth=new THREE.MeshPhysicalMaterial({map:new THREE.Texture(),normalMap:new THREE.Texture(),roughnessMap:new THREE.Texture()}),fabricShader={vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};installBuildingSurfaceUVs(cloth);cloth.onBeforeCompile(fabricShader);
 const clothCommon=common.replace('#define USE_BUMPMAP\n','')+'#define USE_NORMALMAP\n#define USE_NORMALMAP_TANGENTSPACE\n#define NORMALMAP_UV uv\n#define USE_SHEEN\n'+environment;
 programs.push({vertex:vertex.replace(common,clothCommon+'#define USE_INSTANCING\nin mat4 instanceMatrix;\n')+expand(fabricShader.vertexShader),fragment:fragment.replace(common,clothCommon)+expand(fabricShader.fragmentShader)});
 const stone=new THREE.MeshStandardMaterial({map:new THREE.Texture(),bumpMap:new THREE.Texture(),roughnessMap:new THREE.Texture()}),stoneShader={vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};installStoneCourses(stone);installBuildingSurfaceUVs(stone);stone.onBeforeCompile(stoneShader);programs.push({vertex:vertex.replace(common,common+environment)+expand(stoneShader.vertexShader),fragment:fragment.replace(common,common+environment)+expand(stoneShader.fragmentShader)});
 for(const install of [installFloorCourses,m=>installWallCavity(m,{storey:3.1,height:3.1})]){const m=new THREE.MeshStandardMaterial({map:new THREE.Texture(),bumpMap:new THREE.Texture(),roughnessMap:new THREE.Texture()}),patched={vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};install(m);installBuildingSurfaceUVs(m);m.onBeforeCompile(patched);programs.push({vertex:vertex.replace(common,common+environment+'#define USE_INSTANCING\nin mat4 instanceMatrix;\n')+expand(patched.vertexShader),fragment:fragment.replace(common,common+environment)+expand(patched.fragmentShader)});m.map.dispose();m.bumpMap.dispose();m.roughnessMap.dispose();m.dispose();}
 // Keep the sampling/coverage helper exact, rather than duplicating its maths.
 const input={programs,common:FLOOR_SHADER_COMMON};
 const result=spawnSync('python',['qa/check-floor-gpu.py'],{cwd:new URL('../',import.meta.url),input:JSON.stringify(input),encoding:'utf8',timeout:30000,maxBuffer:1000000});resources.forEach(r=>r.dispose());
 if(result.error?.code==='ENOENT'){t.skip('Native shader check needs Python and EGL');return;}
 if(result.status===77){t.skip(result.stdout.trim());return;}
 for(const m of [cloth,stone]){for(const t of [m.map,m.normalMap,m.bumpMap,m.roughnessMap])t?.dispose();m.dispose();}assert.equal(result.status,0,result.stderr||result.stdout||String(result.error));const checked=JSON.parse(result.stdout);assert.equal(checked.linked,6);assert.deepEqual(checked.coverage,[255,128,0,26]);assert.equal(checked.rotations,true);
});

test('the real owner photo loses its centre hotspot and dark perimeter before it is repeated across tiles',t=>{
 const result=spawnSync('python',['-c',`from PIL import Image
import sys
im=Image.open('public/materials/owner-products/MI402439-tile.jpg').convert('RGBA').crop((210,80,1090,960)).resize((256,256))
sys.stdout.buffer.write(im.tobytes())`],{cwd:new URL('../',import.meta.url),maxBuffer:400000});
 if(result.error?.code==='ENOENT'||result.status!==0){t.skip('Photo pixel validation needs Python/Pillow');return;}
 const pixels=new Uint8Array(result.stdout),original=new Uint8Array(pixels),prepared=prepareFloorPhoto(pixels,256);assert.equal(prepared.lightingCorrection.method,'bounded-quadratic-and-low-frequency-light-field');
 const cells=data=>{const means=[];for(let y=0;y<256;y+=32)for(let x=0;x<256;x+=32){let sum=0;for(let v=y;v<y+32;v++)for(let u=x;u<x+32;u++){const i=(v*256+u)*4;sum+=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];}means.push(sum/1024);}return means;};
 const before=cells(pixels),after=cells(prepared.color),spread=v=>Math.max(...v)-Math.min(...v);assert(spread(before)>40,'test the actual uneven photo rather than a flat synthetic substitute');assert(spread(after)<10,'no broad dark perimeter should be baked into each repeated tile');assert(spread(after)<spread(before)*.15);
 const edge=after.filter((_,i)=>i<8||i>=56||i%8===0||i%8===7),centre=[after[27],after[28],after[35],after[36]],average=v=>v.reduce((a,b)=>a+b,0)/v.length;assert(Math.abs(average(edge)-average(centre))<3);
 assert.deepEqual(pixels,original);assert.equal(prepared.lightingCorrection.calibrated,false);
});
