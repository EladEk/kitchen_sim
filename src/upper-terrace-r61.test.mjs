import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {polygonContains} from './building-geometry.mjs';
import {buildBuildingContext} from './building-scene.js';
import {normalizeHomeSettings} from './home-model.mjs';
import {buildingBoxes,moveBuildingPlayer} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';

function model(){const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),m=buildBuildingContext({group:root,resources,settings,mode:'building'});root.updateMatrixWorld(true);return {...m,settings,dispose:()=>resources.forEach(r=>r.dispose?.())};}
function opaque(node,p){const point=new THREE.Vector3(...p),matrix=new THREE.Matrix4();return node.children.filter(o=>['building-facade-wall','building-interior-wall'].includes(o.name)).some(mesh=>{mesh.geometry.computeBoundingBox();for(let i=0;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);matrix.premultiply(mesh.matrixWorld);if(mesh.geometry.boundingBox.clone().applyMatrix4(matrix).containsPoint(point))return true;}return false;});}

test('the apparent doors to nowhere stay inside complete upper en suites, with floor, ceiling and walkable entry',()=>{
 const m=model(),cars=createElevators();
 try{for(const level of [7,8]){const f=BUILDING_FLOORS[level],node=m.floors.get(level),id=level===7?'bd-7-9':'bd-8-13',door=BUILDING_INTERIORS.floors[level].doors.find(d=>d.id===id);assert(!door.balconyDoor,'retain the real internal bathroom door');for(const p of [door.hinge,door.closed,door.opened,[6.5,-4.8],[8.3,-4.05]])assert(polygonContains(p,f.units[0].polygon),'bathroom belongs to its own apartment');
  for(const p of [[6.5,-4.8],[8.3,-4.05]]){assert(f.envelope.some(e=>polygonContains(p,e.polygon)));for(const [direction,part,max]of [[-1,'building-floor-slab',.2],[1,'building-storey-ceiling',BUILDING.storey]]){const ray=new THREE.Raycaster(new THREE.Vector3(p[0],f.elevation+.1,p[1]),new THREE.Vector3(0,direction,0));assert(ray.intersectObject(node,true).some(h=>h.object.userData.part===part&&h.distance<max),`${part} supports the formerly omitted room`);}}
  const x=(door.hinge[0]+door.closed[0])/2,from=[x,door.hinge[1]-.55],to=[x,door.hinge[1]+.95],delta=to.map((v,i)=>v-from[i]),open=moveBuildingPlayer(from,delta,level,buildingBoxes(level,m.settings,cars),cars);assert(Math.hypot(...open.map((v,i)=>v-to[i]))<.04,'walk into the enclosed bathroom');const closed=moveBuildingPlayer(from,delta,level,buildingBoxes(level,{...m.settings,closedBuildingDoors:[id]},cars),cars);assert(Math.hypot(...closed.map((v,i)=>v-to[i]))>.5,'the same real door still closes');
  assert(opaque(node,[5.9,f.elevation+1.6,-3.95]),'the actual exterior return closes the room');
 }}finally{m.dispose();}
});

test('the marked terraces have full-height bedroom sliders; bathroom windows remain glazed apertures',()=>{
 const m=model(),cars=createElevators();
 try{for(const level of [7,8]){const f=BUILDING_FLOORS[level],node=m.floors.get(level),openings=f.envelope.flatMap(e=>e.openings),sliders=openings.filter(o=>o.a[0]>5&&o.a[0]<6.2&&Math.min(o.a[1],o.b[1])>-9.3&&Math.max(o.a[1],o.b[1])<-7.2);assert.equal(sliders.length,1);assert.equal(sliders[0].kind,'slider');assert(Math.hypot(...sliders[0].b.map((v,i)=>v-sliders[0].a[i]))>1.85);const z=-8.73,from=[6.7,z],to=[5,z],end=moveBuildingPlayer(from,[-1.7,0],level,buildingBoxes(level,m.settings,cars),cars);assert(Math.hypot(...end.map((v,i)=>v-to[i]))<.04,'bedroom opens directly onto its terrace');for(const height of [.12,.55,1.4,1.9])assert(!opaque(node,[sliders[0].a[0],f.elevation+height,z]),'no false window sill crosses the exit');
  const window=openings.find(o=>o.kind==='window'&&o.a[0]>5&&o.a[0]<6.2&&Math.min(o.a[1],o.b[1])>-5.3&&Math.max(o.a[1],o.b[1])<-4);assert(window,'retain the actual narrow bathroom window');const p=window.a.map((v,i)=>(v+window.b[i])/2);assert(!opaque(node,[5.9,f.elevation+1.6,p[1]]),'opposed window jamb caps cannot become a solid wall');assert(opaque(node,[p[0],f.elevation+.5,p[1]]),'bathroom window retains its real sill');
 }}finally{m.dispose();}
});
