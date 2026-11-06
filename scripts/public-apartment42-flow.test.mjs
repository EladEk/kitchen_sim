import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {APARTMENT42_FIXED_FURNITURE} from '../src/apartment42-reference.mjs';
import {createDistrict,DISTRICT,buildingTransform} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {stepWalker} from '../public-view/walking.mjs';
import {disposeObjectResources} from '../src/photo-resources.mjs';

test('the actual public apartment 42 exports its registered fittings and room labels with clear approaches in all eight building orientations',async()=>{
 const load=async name=>JSON.parse(await readFile(`dist/client/baseline/${name}.json`,'utf8'));
 const [json,nav,site]=await Promise.all(['building','navigation','site'].map(load));
 const model=await new THREE.ObjectLoader().parseAsync(json),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot}),ray=new THREE.Raycaster();
 try{
  const floor=nav.floors.find(f=>f.level===8),rooms=floor.map.rooms.filter(r=>r.unit===42);
  for(const name of ['ממ״ד','חדר שירות','שירותי אורחים','חדר רחצה הורים'])assert(rooms.some(r=>r.he===name),name);
  for(const kind of ['fridge','laundry'])assert(!floor.map.furniture.some(p=>p.kind===kind),'No automatic '+kind);assert(floor.map.furniture.some(p=>p.kind==='bathtub'));
  // Public export deliberately strips private part/placement IDs. Inspect
  // actual instance buffers and body extents, not metadata that is not shipped.
  model.updateMatrixWorld(true);const matrix=new THREE.Matrix4(),box=new THREE.Box3(),centre=new THREE.Vector3(),size=new THREE.Vector3();
  for(const row of APARTMENT42_FIXED_FURNITURE){let instances=0;const height=row.kind==='fridge'?1.94:['washer','dryer'].includes(row.kind)?.84:.82,centreY=24.8+(row.kind==='fridge'?.98:['washer','dryer'].includes(row.kind)?.43:.45);
   model.traverse(o=>{if(!o.isInstancedMesh||o.userData.level!==8||o.userData.visualOnly)return;o.geometry.computeBoundingBox();
    for(let i=0;i<o.count;i++){o.getMatrixAt(i,matrix);matrix.premultiply(o.matrixWorld);box.copy(o.geometry.boundingBox).applyMatrix4(matrix);box.getCenter(centre);box.getSize(size);
     if(Math.hypot(centre.x-row.x,centre.z-row.z)<.001&&Math.abs(centre.y-centreY)<.001&&Math.abs(size.y-height)<.001&&Math.abs(size.x-(row.box.maxX-row.box.minX))<.001&&Math.abs(size.z-(row.box.maxZ-row.box.minZ))<.001)instances++;
    }
   });assert.equal(instances,0,row.id+' has no automatic exported furniture body');
  }
  for(const building of DISTRICT){const matrix=buildingTransform(building);
   for(const row of APARTMENT42_FIXED_FURNITURE){const position=new THREE.Vector3(row.approach[0],24.8+1.62,row.approach[1]).applyMatrix4(matrix),delta=new THREE.Vector3(Math.sin(row.angle),0,Math.cos(row.angle)).transformDirection(matrix).multiplyScalar(.005);
    assert(stepWalker(position,delta.x,delta.z,world,ray),`${building.id} ${row.id} is reachable in the real walking geometry`);assert(Math.abs(position.y-24.8-1.62)<.05);
   }
  }
 }finally{world.dispose();district.dispose();disposeObjectResources(model);}
});
