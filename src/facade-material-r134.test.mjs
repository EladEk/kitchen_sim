import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as T from 'three';
import {installStoneCourses,FINISH_GRID_GLSL} from './building-finish-shaders.mjs';
import {facadePixels,FACADE_ROUGHNESS} from './facade-finish.mjs';
import {createPhotoScene} from './photoreal-scene.mjs';

test('native facade colour rejects large legacy albedo patches at near and distant district coordinates',t=>{
 const m=new T.MeshStandardMaterial(),shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>'};installStoneCourses(m);m.onBeforeCompile(shader);m.dispose();
 const body=shader.fragmentShader.split('#include <color_fragment>')[1].split('#include <normal_fragment_maps>')[0],vertex='#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}',probes=[];
 for(const [x,y,z,step,n]of [[11.4,11.4,54,.0001,[0,0,1]],[101.2,20.1,149,.0001,[1,0,0]],[140,22,106,.8,[0,0,-1]]]){
  const fragment=`#version 300 es\nprecision highp float;\nprecision highp int;\nout vec4 result;\n${FINISH_GRID_GLSL}\nvoid main(){vec3 vBuildingWorld=vec3(${x},${y},${z})+vec3(gl_FragCoord.xy*${step},0.);vec3 vBuildingSurfaceNormal=vec3(${n.join(',')});const vec3 diffuse=vec3(.8);float legacy=mod(floor(gl_FragCoord.x/3.)+floor(gl_FragCoord.y/5.),2.);vec4 diffuseColor=vec4(vec3(mix(.2,1.,legacy)),1.);${body}\nresult=diffuseColor;}`;probes.push({vertex,fragment});
 }
 const run=spawnSync('python',['qa/check-floor-gpu.py'],{input:JSON.stringify({programs:[],probes}),encoding:'utf8',timeout:30000,maxBuffer:1000000});if(run.error?.code==='ENOENT'||run.status===77){t.skip('Native EGL unavailable');return;}assert.equal(run.status,0,run.stderr||run.stdout);const result=JSON.parse(run.stdout);for(const [i,p]of result.probes.entries()){assert(p.min>=196&&p.max<=205,JSON.stringify(p));assert(p.max-p.min<=(i<2?1:3),'large incoming albedo patches cannot remain on the facade');}
});
test('the facade fallback has flat height and constant matte roughness, with only fine neutral colour grain',()=>{
 const p=facadePixels();for(let i=0;i<p.height.length;i+=4){assert.equal(p.height[i],128);assert.equal(p.roughness[i],252);assert(p.color[i]>=252&&p.color[i]<=254);assert.equal(p.color[i],p.color[i+1]);}
});
test('photo conversion keeps the selected stone tint and matte profile without embossed blotches',()=>{
 const scene=new T.Scene(),g=new T.PlaneGeometry(4,3),m=new T.MeshStandardMaterial({color:'#d9d2c5'});installStoneCourses(m);scene.add(new T.Mesh(g,m));const photo=createPhotoScene(scene);
 try{const out=photo.scene.children[0].material;assert.equal(out.color.getHexString(),'d9d2c5');assert.equal(out.roughness,FACADE_ROUGHNESS);assert.equal(out.bumpScale,0);assert.equal(out.normalMap,null);assert.equal(m.roughness,1);}finally{photo.dispose();g.dispose();m.dispose();}
});
