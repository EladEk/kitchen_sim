import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildBuildingContext} from '../src/building-scene.js';
import {normalizeHomeSettings} from '../src/home-model.mjs';
import {BUILDING_FLOORS} from '../src/building-layout.mjs';
import {inside} from '../public-view/site-layout.mjs';
import {refinePublicFacade} from './public-facade-details.mjs';

test('beveled sills preserve plan bounds and all curtain geometry remains inside its own floor envelope',()=>{
 const root=new THREE.Group(),resources=[];buildBuildingContext({group:root,resources,picks:[],settings:normalizeHomeSettings({buildingLevel:9}),mode:'walk'});root.updateMatrixWorld(true);
 const originals=[];root.traverse(o=>{if(o.userData.part==='building-stone-sill')originals.push([o,new THREE.Box3().setFromObject(o)]);});
 try{
  const counts=refinePublicFacade(root,resources);root.updateMatrixWorld(true);assert(counts.sills>50);assert(counts.panels>50);
  for(const [o,before] of originals){const after=new THREE.Box3().setFromObject(o);assert(after.min.distanceTo(before.min)<1e-5);assert(after.max.distanceTo(before.max)<1e-5);assert.equal(o.geometry.type,'RoundedBoxGeometry');}
  const m=new THREE.Matrix4(),p=new THREE.Vector3();let panels=0;
  root.traverse(o=>{if(o.userData.part!=='public-curtain')return;panels+=o.count;const floor=BUILDING_FLOORS[o.userData.buildingFloor];
   for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);m.premultiply(o.matrixWorld);assert(m.determinant()>0);for(let j=0;j<o.geometry.attributes.position.count;j++){p.fromBufferAttribute(o.geometry.attributes.position,j).applyMatrix4(m);assert(floor.envelope.some(e=>inside([p.x,p.z],e.polygon)),`${o.userData.buildingFloor}: curtain outside facade`);assert(p.y>=floor.elevation&&p.y<floor.elevation+3);}}
  });assert.equal(panels,counts.panels);
 }finally{resources.forEach(r=>r.dispose?.());}
});
