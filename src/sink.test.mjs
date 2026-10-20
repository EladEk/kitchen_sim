import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {KITCHEN_SINK as S} from './kitchen-sink.mjs';
import {createVegasSink} from './sink.js';
import {createKitchen} from './scene.js';
import {createHomeScene} from './home-scene.js';
import {DEFAULTS} from './model.mjs';
import {normalizeHomeSettings,KITCHEN_ANCHOR} from './home-model.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({getContext:()=>context})};
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);

test('Vegas 70 replaces the stainless block with a hollow Casablanca composite sink at the specified nominal envelope',()=>{
 const resources=[],sink=createVegasSink(resources);sink.updateMatrixWorld(true);
 try{
  const size=new THREE.Box3().setFromObject(sink).getSize(new THREE.Vector3());near(size.x,S.width/1000);near(size.y,S.height/1000);near(size.z,S.depth/1000);
  const parts=new Map();sink.traverse(o=>{if(o.isMesh){parts.set(o.userData.part,o);assert.equal(o.userData.productId,'kitchen-sink');assert.equal(o.userData.finishCode,'98');for(const n of o.geometry.attributes.position.array)assert(Number.isFinite(n));}});
  for(const part of ['sink-rim','sink-bowl-wall','sink-bowl-floor']){assert.equal(parts.get(part).material.metalness,0);assert.equal(parts.get(part).material.color.getHexString(),S.color.slice(1));}
  assert(parts.has('sink-overflow'));assert(parts.has('sink-strainer'));assert.equal(parts.get('sink-strainer').geometry.parameters.shapes.holes.length,25);
  const ray=new THREE.Raycaster(new THREE.Vector3(.1,.2,.02),new THREE.Vector3(0,-1,0)),hits=ray.intersectObject(sink,true);assert(hits.length);assert(hits[0].point.y<-.19,'the bowl interior must remain open to the bottom');
 }finally{resources.forEach(r=>r.dispose());}
});

test('both kitchen scenes use the same Vegas bowl and real worktop openings without moving the sink cabinet or water supplies',()=>{
 const detailed=createKitchen(DEFAULTS),home=createHomeScene(normalizeHomeSettings());
 try{
  const models=[];for(const scene of [detailed,home]){let sink;scene.group.traverse(o=>{if(o.isGroup&&o.userData.model===S.model&&o.userData.dimensions)sink=o;});assert(sink);models.push(sink);}
  near(models[0].position.x,.35);near(models[0].position.y,.912);near(models[0].position.z,.315);near(models[1].position.x,1.91);
  const getPart=(group,name)=>{let result;group.traverse(o=>{if(o.userData.part===name)result=o;});return result;};assert.deepEqual(getPart(models[0],'sink-bowl-wall').geometry.attributes.position.array,getPart(models[1],'sink-bowl-wall').geometry.attributes.position.array);
  let worktop,proxy;detailed.group.traverse(o=>{if(o.userData.part==='worktop')worktop=o;});home.group.traverse(o=>{if(o.userData.part==='home-sink-worktop')proxy=o;});detailed.group.updateMatrixWorld(true);home.group.updateMatrixWorld(true);
  const down=new THREE.Vector3(0,-1,0);assert.equal(new THREE.Raycaster(new THREE.Vector3(1.91,1.5,.315),down).intersectObject(worktop).length,0);assert.equal(new THREE.Raycaster(new THREE.Vector3(KITCHEN_ANCHOR[0]-1.91,1.5,KITCHEN_ANCHOR[1]-.315),down).intersectObject(proxy).length,0);
  assert(detailed.picks.some(o=>o.userData.productId==='kitchen-sink'));assert(home.picks.some(o=>o.userData.productId==='kitchen-sink'&&o.userData.action==='kitchen'));
  const drain=getPart(detailed.moduleGroups.get('sink'),'sink-trap');near(drain.geometry.parameters.path.points[0].z,S.drainZ/1000);near(drain.geometry.parameters.path.points[0].y,.687);
 }finally{detailed.dispose();home.dispose();}
});
