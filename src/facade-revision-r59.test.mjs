import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {BUILDING,BUILDING_FLOORS} from './building-layout.mjs';
import {BUILDING_INTERIORS} from './building-interiors.mjs';
import {polygonContains} from './building-geometry.mjs';
import {buildBuildingContext} from './building-scene.js';
import {laundryScreens} from './laundry-screens.mjs';
import {buildingBoxes} from './building-navigation.mjs';
import {createElevators} from './elevator-model.mjs';
import {normalizeHomeSettings} from './home-model.mjs';
function model(){const root=new THREE.Group(),resources=[],settings=normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),m=buildBuildingContext({group:root,resources,settings,mode:'building'});root.updateMatrixWorld(true);return {...m,root,settings,dispose:()=>resources.forEach(r=>r.dispose?.())};}
function contains(mesh,p){if(!mesh)return false;const meshes=mesh.parent.children.filter(o=>o.name===mesh.name&&o.isInstancedMesh),matrix=new THREE.Matrix4();for(const part of meshes){part.geometry.computeBoundingBox();for(let i=0;i<part.count;i++){part.getMatrixAt(i,matrix);matrix.premultiply(part.matrixWorld);if(part.geometry.boundingBox.clone().applyMatrix4(matrix).containsPoint(new THREE.Vector3(...p)))return true;}}return false;}
test('all six laundry stacks have source-registered mouths and side returns, with real open slat gaps and matching collision',()=>{
 const m=model(),cad=JSON.parse(readFileSync(new URL('../scripts/facade-source-edges.json',import.meta.url)));
 try{for(const level of [1,2,3,4,5,6]){const screens=laundryScreens(level),mesh=m.floors.get(level).getObjectByName('building-laundry-screen'),boxes=buildingBoxes(level,m.settings,createElevators());assert.equal(screens.length,8);assert.equal(mesh.userData.screens.length,8);
  for(const s of screens){const original=cad.floors.find(f=>f.level===level).edges.find(e=>e.path===s.sourcePath&&e.kind==='screen'&&[e.a,e.b].some(p=>Math.hypot(p[0]-s.sourceA[0],p[1]-s.sourceA[1])<.001));assert(original,s.id+' retains actual PORCH source evidence');const p=s.a.map((v,i)=>(v+s.b[i])/2);assert(contains(mesh,[p[0],level*BUILDING.storey+.12,p[1]]));assert(!contains(mesh,[p[0],level*BUILDING.storey+.08,p[1]]),'ventilation gap must remain open');assert(boxes.some(b=>b.laundryScreen===s.id));}
  for(const id of ['north-west','north-east']){const s=screens.find(s=>s.id===id);assert(Math.abs(s.a[0]-s.b[0])<.001,'north stacks face sideways rather than crossing the utility wall');assert(Math.abs(s.a[1]-s.b[1])>1.6);}
  for(const id of ['south-west','south-east']){const s=screens.find(s=>s.id===id);assert.deepEqual(s.a,s.sourceA,'south stacks attach at the actual CAD mouth');assert.deepEqual(s.b,s.sourceB);}
 }for(const level of [0,7,8])assert.equal(laundryScreens(level).length,0);
 }finally{m.dispose();}
});
test('the two penthouse safe rooms belong to both the unit and envelope, have floor slabs and closed thick exterior walls',()=>{
 const m=model();try{for(const level of [7,8]){const f=BUILDING_FLOORS[level],point=[16,-10];assert(polygonContains(point,f.units[0].polygon));assert(f.envelope.some(p=>polygonContains(point,p.polygon)),'unit and actual building envelope must include the same safe room');const ray=new THREE.Raycaster(new THREE.Vector3(point[0],f.elevation+.10,point[1]),new THREE.Vector3(0,-1,0));assert(ray.intersectObject(m.floors.get(level),true).some(h=>h.object.userData.part==='building-floor-slab'&&h.distance<.2),'no missing slab below the safe room');
 const node=m.floors.get(level);assert(['building-facade-wall','building-interior-wall'].some(part=>contains(node.getObjectByName(part),[5.97,f.elevation+1.5,-2.95])),'45 cm concrete facade segment must close the formerly visible slit');
 }}finally{m.dispose();}
});
test('restored source glazing has correct sills/heads and leaves the sliding exits clear',()=>{
 const m=model(),report=JSON.parse(readFileSync(new URL('../qa/facade-restored-openings.json',import.meta.url)));assert.equal(report.added.length,13);
 try{for(const o of report.added){const base=o.level*BUILDING.storey,node=m.floors.get(o.level),p=o.a.map((v,i)=>(v+o.b[i])/2),wall=node.getObjectByName('building-facade-wall'),interior=node.getObjectByName('building-interior-wall');assert(o.sourceOpeningPaths.length>=2);let pane=p;if(o.kind==='slider'){const path=BUILDING_FLOORS[o.level].envelope[o.path],a=path.polygon[o.edge],b=path.polygon[(o.edge+1)%path.polygon.length],projection=p=>(p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]),start=projection(o.a)<projection(o.b)?o.a:o.b,end=start===o.a?o.b:o.a;pane=start.map((v,i)=>v+(end[i]-v)*.25);}assert(contains(node.getObjectByName('building-glazing'),[pane[0],base+1.6,pane[1]]),'actual frame/glass replaces a bare full-height hole');assert.equal(contains(wall,[p[0],base+.5,p[1]]),o.kind!=='slider');assert(contains(wall,[p[0],base+2.65,p[1]]));assert(!contains(wall,[p[0],base+1.6,p[1]])&&!contains(interior,[p[0],base+1.6,p[1]]),'real glazing remains an aperture');}}
 finally{m.dispose();}
});
