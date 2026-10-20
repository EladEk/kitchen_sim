import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createKitchen} from './scene.js';
import {DEFAULTS,WINDOW,UPPERS} from './model.mjs';
import {WINDOWS,KITCHEN_ANCHOR} from './home-model.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({getContext:()=>context})};

test('detailed kitchen window follows the architectural opening and apartment schedule without touching upper cabinets',()=>{
 const opening=WINDOWS.find(w=>w.id==='kitchen-window');assert(Math.abs(WINDOW.width/1000-opening.width)<.001);assert.equal(WINDOW.height/1000,opening.height);assert(Math.abs(WINDOW.x/1000-(KITCHEN_ANCHOR[0]-opening.end))<.002);assert(WINDOW.x+WINDOW.width<UPPERS[0].x);
 for(const hardware of ['black','brass','steel']){
  const model=createKitchen({...DEFAULTS,hardware});try{
   model.group.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(model.windowGroup);assert(bounds.max.z<.00001,'frame and sill do not project beyond the wall plane');
   const panes=[],frames=[];model.windowGroup.traverse(o=>{if(o.userData.part==='window-glass')panes.push(o);if(o.userData.part==='window-frame')frames.push(o);});assert.equal(panes.length,4);assert(panes.every(p=>p.material.transparent&&p.material.opacity<.2));assert(frames.every(p=>p.material.color.getHexString()==='343d3d'));
   const ray=new THREE.Raycaster(new THREE.Vector3(.3,1.7,.3),new THREE.Vector3(0,0,-1),0,1),hits=ray.intersectObjects([...model.roomStructure],true);assert(hits.some(h=>h.object.userData.part==='window-glass'));assert(!hits.some(h=>!h.object.material?.transparent),'the larger window has a real unobstructed opening in the wall');
  }finally{model.dispose();}
 }
});
