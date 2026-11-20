import test from 'node:test';import assert from 'node:assert/strict';
import {COLOUR_GRADE,colourGradeWeight,webglFloorReflections,COLOUR_GRADE_GLSL} from './colour-grade.mjs';
import {HomeToneMappingEffect,HOME_AGX_GLSL} from './home-tone-mapping.mjs';
import {FloorReflectionEffect} from './webgl-floor-reflections.mjs';
import {gradeOutput} from './webgpu-presentation.mjs';
import {vec3,uniform} from 'three/tsl';
import * as THREE from 'three';
test('the colour grade is subtle and switches off on reduced tiers or without effects',()=>{
 assert(COLOUR_GRADE.saturation>1&&COLOUR_GRADE.saturation<1.1);assert(COLOUR_GRADE.contrast<1.08);assert(COLOUR_GRADE.vignette<.2);assert(COLOUR_GRADE.warmth.every(v=>Math.abs(v-1)<.03));
 assert.equal(colourGradeWeight({tier:0}),1);assert.equal(colourGradeWeight({tier:1}),1);assert.equal(colourGradeWeight({tier:2}),0);assert.equal(colourGradeWeight({tier:3}),0);assert.equal(colourGradeWeight({tier:0,effects:false}),0);
});
test('WebGL grade rides inside the tone-mapping pass and WebGPU builds the same grade node',()=>{
 assert(HOME_AGX_GLSL.includes(COLOUR_GRADE_GLSL));const tone=new HomeToneMappingEffect();assert.equal(tone.grade,0);tone.grade=1;assert.equal(tone.grade,1);tone.grade=7;assert.equal(tone.grade,1);
 assert(gradeOutput(vec3(.5),uniform(1)));
});
test('WebGL floor reflections are desktop, top-tier, enhanced-indoor only',()=>{
 assert.equal(webglFloorReflections({enhanced:true,tier:0}),true);
 for(const o of [{mobile:true,enhanced:true,tier:0},{enhanced:false,tier:0},{enhanced:true,tier:1},{enhanced:true,tier:2}])assert.equal(webglFloorReflections(o),false);
 const camera=new THREE.PerspectiveCamera(50,1,.1,100);camera.position.set(1,2,3);camera.updateMatrixWorld();const e=new FloorReflectionEffect(camera);e.update();assert.equal(e.uniforms.get('floorViewToWorld').value.elements[13],2);assert(e.fragmentShader.includes('worldN.y<.96'));
});
