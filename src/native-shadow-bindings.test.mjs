import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,MeshStandardMaterial,BoxGeometry,Scene,DirectionalLight,SpotLight,Texture} from 'three';
import NodeMaterialObserver from 'three/src/materials/nodes/manager/NodeMaterialObserver.js';

test('every static mesh sharing an ordinary material refreshes shadow bindings on resize, then becomes stable again',()=>{
 const material=new MeshStandardMaterial(),geometry=new BoxGeometry(),sun=new DirectionalLight(),spot=new SpotLight(),scene=new Scene();sun.castShadow=spot.castShadow=true;spot.map=new Texture();
 const lights=[sun,spot],lightsNode={getLights:()=>lights},observer=new NodeMaterialObserver({material,object:new Mesh(geometry,material),context:{}}),draws=Array.from({length:4},()=>({material,geometry,object:new Mesh(geometry,material),lightsNode,scene,bundle:null}));
 try{
  for(const draw of draws)observer.getRenderObjectData(draw);
  for(const draw of draws)assert(observer.equals(draw,observer.getLightsData(lights,[]),1));
  for(const size of [2048,1024,512,4096]){
   sun.shadow.mapSize.set(size,size);spot.shadow.mapSize.set(size/2,size/2);
   for(const draw of draws){assert.equal(observer.equals(draw,observer.getLightsData(lights,[]),size),false,'all shared-material draws must update');for(let i=0;i<lights.length;i++)observer.equals(draw,observer.getLightsData(lights,[]),size);assert(observer.equals(draw,observer.getLightsData(lights,[]),size));}
  }
 }finally{geometry.dispose();material.dispose();spot.map.dispose();}
});

test('equal-size output replacement and resize refresh every shared static draw before the cache early-out',()=>{
 const material=new MeshStandardMaterial(),geometry=new BoxGeometry(),scene=new Scene(),lightsNode={getLights:()=>[]},observer=new NodeMaterialObserver({material,object:new Mesh(geometry,material),context:{}}),context={width:640,height:360},canvas={},renderer={getRenderTarget:()=>target,getCanvasTarget:()=>canvas,getMRT:()=>null},frame={renderer,renderId:1};let target={};
 const draws=Array.from({length:3},()=>{const object=new Mesh(geometry,material);object.static=true;return {material,geometry,object,scene,lightsNode,bundle:null,context};});
 try{
  for(const next of [{target,size:[640,360]},{target:{},size:[640,360]},{target:{},size:[512,288]},{target:null,size:[512,288]}]){
   target=next.target;[context.width,context.height]=next.size;
   for(const draw of draws){assert.equal(observer.needsRefresh(draw,frame),true,'each draw updates its object bindings for the new output');for(let i=0;i<3;i++)observer.needsRefresh(draw,frame);assert.equal(observer.needsRefresh(draw,frame),false,'unchanged static outputs retain the cache');}
  }
 }finally{geometry.dispose();material.dispose();}
});
