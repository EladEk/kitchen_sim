import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as T from 'three';
import {unionFacadePanels} from './facade-veneers.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {installStoneCourses,FINISH_GRID_GLSL} from './building-finish-shaders.mjs';

const overlap=(a,b)=>Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]));
function rectangle([x,y,z,w,h,d,angle=0]){const n=[Math.sin(angle),Math.cos(angle)],t=[Math.cos(angle),-Math.sin(angle)],along=x*t[0]+z*t[1];return {n,plane:x*n[0]+z*n[1],u:[along-w/2,along+w/2],v:[y-h/2,y+h/2],depth:d};}
function disjoint(rows){const r=rows.map(rectangle);for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){const a=r[i],b=r[j];if(Math.abs(a.n[0]-b.n[0])+Math.abs(a.n[1]-b.n[1])>1e-5||Math.abs(a.plane-b.plane)>.001)continue;assert(overlap(a.u,b.u)<1e-5||overlap(a.v,b.v)<1e-5,'coplanar cosmetic panels overlap beyond Float32 edge tolerance');}}

test('facade panel union keeps apertures open and preserves cover for rotated, vertical and submillimetre duplicate runs',()=>{
 for(const angle of [0,Math.PI/2,.37]){
  const rows=[[0,1,0,4,2,.008,angle],[Math.cos(angle),1,-Math.sin(angle),2,2,.008,angle],[0,2.5,0,4,1,.008,angle]],result=unionFacadePanels(rows);disjoint(result);assert.equal(result.length,1);assert(Math.abs(result[0][3]*result[0][4]-12)<1e-5);
 }
 const left=[-1.5,1,0,1,2,.008],right=[1.5,1,0,1,2,.008],header=[0,2.5,0,4,1,.008],rows=[left,right,header,[...left],[left[0],left[1],.0005,...left.slice(3)]],out=unionFacadePanels(rows);disjoint(out);
 const covers=(u,v)=>out.map(rectangle).some(r=>u>r.u[0]+1e-6&&u<r.u[1]-1e-6&&v>r.v[0]+1e-6&&v<r.v[1]-1e-6);assert(!covers(0,1),'door stays open');assert(covers(0,2.5));assert(covers(-1.5,1));assert(covers(1.5,1));
 const vertical=unionFacadePanels([[2,1,3,.008,2,4,0],[2,1,3,.008,2,4,0]]);assert.equal(vertical.length,1);assert(Math.abs(vertical[0][0]-2)<1e-6);assert(Math.abs(vertical[0][2]-3)<1e-6);assert(Math.abs(vertical[0][3]-4)<1e-6);
});

test('the actual nine-storey model has one disjoint facade cover per storey without changing physical wall batches',()=>{
 const root=new T.Group(),resources=[],model=buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),mode:'walk'});
 try{let covers=0;for(const [level,floor]of model.floors){if(level>8)continue;const skins=floor.children.filter(o=>o.userData.part==='building-facade-cladding');assert.equal(skins.length,1,`floor ${level}`);const rows=[],matrix=new T.Matrix4(),p=new T.Vector3(),q=new T.Quaternion(),s=new T.Vector3();for(let i=0;i<skins[0].count;i++){skins[0].getMatrixAt(i,matrix);matrix.decompose(p,q,s);const e=new T.Euler().setFromQuaternion(q);rows.push([p.x,p.y,p.z,s.x,s.y,s.z,e.y]);}disjoint(rows);covers+=rows.length;assert(floor.children.some(o=>o.userData.part==='building-facade-wall'));assert(skins[0].userData.tourNonPhysical);}assert(covers>100);}finally{resources.forEach(r=>r.dispose?.());}
});

test('actual facade fragment stays even within a stone at district offsets, with bounded tone and stable subpixel joints on native GLES3',t=>{
 const m=new T.MeshStandardMaterial(),shader={vertexShader:'#include <common>\n#include <worldpos_vertex>',fragmentShader:'#include <common>\n#include <color_fragment>\n#include <normal_fragment_maps>'};installStoneCourses(m);m.onBeforeCompile(shader);m.dispose();
 const body=shader.fragmentShader.split('#include <color_fragment>')[1].split('#include <normal_fragment_maps>')[0],vertex='#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}',probes=[];
 for(const [x,y,z,step]of [[11.4,11.4,54,.00001],[101.2,20.1,149,.00001],[140,22,106,.8]]){const fragment=`#version 300 es\nprecision highp float;\nprecision highp int;\nout vec4 result;\n${FINISH_GRID_GLSL}\nvoid main(){vec3 vBuildingWorld=vec3(${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)})+vec3(gl_FragCoord.xy*${step.toFixed(5)},0.);vec3 vBuildingSurfaceNormal=vec3(0.,0.,1.);const vec3 diffuse=vec3(.8);vec4 diffuseColor=vec4(.8,.8,.8,1.);${body}\nresult=diffuseColor;}`;probes.push({vertex,fragment});}
 const run=spawnSync('python',['qa/check-floor-gpu.py'],{input:JSON.stringify({programs:[],probes}),encoding:'utf8',timeout:30000,maxBuffer:1000000});if(run.error?.code==='ENOENT'||run.status===77){t.skip('Native EGL unavailable');return;}assert.equal(run.status,0,run.stderr||run.stdout);const result=JSON.parse(run.stdout);assert.equal(result.probes.length,3);for(const [i,p]of result.probes.entries()){assert(p.min>=198&&p.max<=208,JSON.stringify(p));assert(p.max-p.min<=(i<2?1:3),'no flaking patches inside a stone or distant facade');}
});
