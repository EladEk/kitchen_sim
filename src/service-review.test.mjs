import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {WATER_LAYOUT,ELECTRICAL_LAYOUT,WALLS,WINDOWS,DOORS,KITCHEN_ANCHOR,normalizeHomeSettings,FURNITURE} from './home-model.mjs';
import {LONG,DEFAULTS,snapshot} from './model.mjs';
import {KITCHEN_WATER_POINTS,kitchenElectricalSelection,kitchenElectricalPageSelection} from './kitchen-electrical.mjs';
import {KITCHEN_SINK_PLUMBING} from './kitchen-plumbing.mjs';
import {servicePlacementIssues} from './service-placement.mjs';
import {createKitchen} from './scene.js';
import {closeAllStudioOpenings} from './studio-state.mjs';
import {MATERIAL_ATLAS,photographicSurfaceData} from './material-photographs.mjs';
import {createScenePresentation} from './scene-presentation.js';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} ≈ ${b}`);

test('the corrected photographed kitchen water cluster is inside the sink cabinet, aligns with its actual supply pipes and does not overlap an electrical source box',()=>{
 const p=KITCHEN_WATER_POINTS[0],sink=LONG.find(m=>m.id==='sink'),home=WATER_LAYOUT.points.find(q=>q.id===p.id);
 near(p.position[0],(sink.x+sink.w/2)/1000);assert(p.position[0]>sink.x/1000&&p.position[0]<(sink.x+sink.w)/1000);assert(p.position[1]<.874);p.position.forEach((n,i)=>near(n,KITCHEN_SINK_PLUMBING.position[i]));near(home.position[0],KITCHEN_ANCHOR[0]-p.position[0]);assert.deepEqual(p.evidence[0].rect,[.613,.539,.033,.032]);
 const [x,y,w,h]=p.evidence[0].rect;for(const q of ELECTRICAL_LAYOUT.points)for(const e of q.evidence.filter(e=>e.page===1)){const [a,b,c,d]=e.rect;assert(Math.min(x+w,a+c)<=Math.max(x,a)||Math.min(y+h,b+d)<=Math.max(y,b),`${q.label} must not be identified as the water loop`);}
 const scene=createKitchen({...DEFAULTS,showElectrical:true,cabinetVisibility:'hidden'});try{scene.group.updateMatrixWorld(true);const pipes=[];scene.moduleGroups.get('sink').traverse(o=>{if(o.userData.part==='water-supply')pipes.push(o.getWorldPosition(new THREE.Vector3()));});assert.equal(pipes.length,2);near((pipes[0].x+pipes[1].x)/2,p.position[0]);pipes.forEach(q=>{near(q.y,p.height);near(q.z,p.position[2]);});assert.equal(scene.waterGroups.get(p.id).children.filter(o=>o.userData.part==='water-escutcheon').length,2);}finally{scene.dispose();}
 const selected=kitchenElectricalSelection(p.id,2);assert.equal(selected.page,1);assert.equal(selected.point.id,p.id);assert.equal(kitchenElectricalPageSelection(p.id,1).point.id,p.id);
});

test('all observed services remain on valid wall spans and inferred water connections register to the fixture back wall',()=>{
 for(const p of [...ELECTRICAL_LAYOUT.points,...WATER_LAYOUT.points])assert.deepEqual(servicePlacementIssues(p,WALLS,[...DOORS,...WINDOWS]),[],p.id);
 for(const p of WATER_LAYOUT.points.filter(p=>p.status==='layout')){assert.equal(p.evidence.length,0);assert(FURNITURE.some(f=>f.id===p.fixtureId));if(p.fixtureId==='outdoor-kitchen'){assert.equal(p.placementBasis,'fixture-back');continue;}assert.equal(p.placementBasis,'fixture-back-wall');const wall=WALLS.find(w=>w.id===p.wallId),vertical=Math.abs(wall.a[0]-wall.b[0])<1e-6;near(p.position[vertical?0:2],wall.a[vertical?0:1]+p.side*(wall.thickness/2+.018));}
 assert.equal(ELECTRICAL_LAYOUT.points.length,48);assert(!ELECTRICAL_LAYOUT.points.some(p=>p.label==='K05'));assert.equal(ELECTRICAL_LAYOUT.points.find(p=>p.label==='K09').height,1.65);
});

test('the new quality and clean-view preferences survive saved designs and Close all',()=>{
 const home=normalizeHomeSettings({renderQuality:'light',cleanView:true}),kitchen=snapshot({...DEFAULTS,renderQuality:'light',cleanView:true,openParts:['sink:door-left']}),closed=closeAllStudioOpenings({getItem:()=>null,setItem(){}},{home,kitchen});assert.equal(closed.home.renderQuality,'light');assert.equal(closed.home.cleanView,true);assert.equal(closed.kitchen.settings.renderQuality,'light');assert.equal(closed.kitchen.settings.cleanView,true);assert.deepEqual(closed.kitchen.settings.openParts,[]);assert.equal(normalizeHomeSettings({renderQuality:'bad'}).renderQuality,'realistic');
});

test('the bitmap atlas is portable, and runtime extraction uses the intended material quadrant with colour, relief and roughness detail',async()=>{
 const file=readFileSync(new URL(`../public${MATERIAL_ATLAS}`,import.meta.url));assert.equal(file.subarray(1,4).toString(),'PNG');assert(file.readUInt32BE(16)>=1024);assert(file.readUInt32BE(20)>=1024);
 const previousImage=globalThis.Image,previousDocument=globalThis.document,rects=[],pixels=new Uint8ClampedArray(512*512*4);for(let i=0;i<pixels.length;i+=4){const c=(i/4)%256;pixels.set([130+c/3,120+c/3,110+c/3,255],i);}
 globalThis.Image=class{naturalWidth=2048;naturalHeight=2048;set src(value){assert.equal(value,MATERIAL_ATLAS);queueMicrotask(()=>this.onload());}};
 globalThis.document={createElement:()=>({getContext:()=>({drawImage(...args){rects.push(args.slice(1));},getImageData(){return {data:pixels};}})})};
 try{const data=await photographicSurfaceData('wood');assert.equal(data.size,512);assert.equal(data.color.length,512*512*4);assert.deepEqual(rects[0].slice(0,4),[1026,2,1020,1020]);assert(new Set(data.color).size>30);assert(new Set(data.height).size>30);assert(data.roughness.every((n,i)=>i%4===3||n>180));}finally{globalThis.Image=previousImage;globalThis.document=previousDocument;}
});

test('the actual postprocessing stack resizes, has a direct light mode and safely falls back if the renderer cannot run an effect',()=>{
 let calls=0;const renderer={getPixelRatio:()=>1.7,getSize:v=>v.set(400,300),render(){calls++;},getRenderTarget:()=>null,setRenderTarget(){}},scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(45,4/3,.05,60),presentation=createScenePresentation(renderer,scene,camera);
 try{presentation.resize(360,640);presentation.render('light');assert.equal(calls,1);presentation.render('realistic');assert.equal(calls,2);presentation.render('realistic');assert.equal(calls,3);}finally{presentation.dispose();}
});
