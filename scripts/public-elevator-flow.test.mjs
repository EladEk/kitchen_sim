import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as T from 'three';
import {createDistrict,DISTRICT} from '../public-view/district.mjs';
import {createWalkingWorld} from '../public-view/walking-world.mjs';
import {elevatorAt,elevatorLanding} from '../public-view/tour-elevator.mjs';

test('both elevator panels survive public export and every floor has a safe exit in all eight building registrations',async()=>{
 const nav=JSON.parse(await readFile('dist/client/baseline/navigation.json','utf8')),site=JSON.parse(await readFile('dist/client/baseline/site.json','utf8')),model=await new T.ObjectLoader().parseAsync(JSON.parse(await readFile('dist/client/baseline/building.json','utf8'))),district=createDistrict(model,site,{mobile:true}),world=createWalkingWorld({model,site:district.collisionRoot});
 let calls=0;model.traverse(o=>{if(o.userData.action==='elevator-call')calls++;});assert(calls>=36);
 try{let stops=0;for(const b of DISTRICT)for(let floor=0;floor<=8;floor++)for(const id of [0,1]){const pose=elevatorLanding(nav,b.id,floor,id,world);assert(pose,`${b.id}/${floor}/${id}`);const at=elevatorAt(pose.position,nav);assert.equal(at.building,b.id);assert.equal(at.floor,floor);assert(at.near);assert(Math.abs(pose.position.y-(floor*nav.storey+1.62))<.28);stops++;}assert.equal(stops,144);assert.equal(elevatorLanding(nav,'4102',9,0,world),null);assert.equal(elevatorLanding(nav,'4102',0,99,world),null);}finally{world.dispose();district.dispose();}
});
