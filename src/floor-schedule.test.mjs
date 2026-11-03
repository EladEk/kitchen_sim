import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FLOOR_ORDER_ROWS,FINISH_SCHEDULE_VERSION,floorOrderForRoom,orderedFinishForRoom,migrateHomeFloorSchedule,migrateKitchenFloorSchedule,roomHasOrderedCladding} from './home-finish-schedule.mjs';
import {ROOMS,normalizeHomeSettings,wallFinishesForRoom} from './home-model.mjs';
import {productById} from './home-products.mjs';
import {createHomeScene} from './home-scene.js';
import {createKitchen} from './scene.js';
import {DEFAULTS} from './model.mjs';
const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};

test('each indoor room and terrace resolves its actual order line and distinguishes the R11 shower from the R10 room',()=>{
 const dry=['living','kitchen','master','bedroom-a','bedroom-b','bedroom-c','safe-room','hall'];
 for(const id of dry){assert.equal(floorOrderForRoom(id).productId,'dry-floor');assert.equal(orderedFinishForRoom(id),'ordered-white');}
 for(const id of ['bathroom','ensuite','powder','laundry']){assert.equal(floorOrderForRoom(id).productId,'wet-floor');assert.equal(orderedFinishForRoom(id),'ordered-wet');}
 assert.equal(floorOrderForRoom('laundry').page,5);assert.equal(floorOrderForRoom('safe-room').page,2);assert.equal(floorOrderForRoom('master').page,1);assert.equal(floorOrderForRoom('ensuite').page,4);
 assert.equal(floorOrderForRoom('hall').basis,'continuity');assert.equal(floorOrderForRoom('garden'),null);
 const shower=FLOOR_ORDER_ROWS.find(r=>r.id==='ensuite-shower-floor');assert.equal(shower.productId,'shower-floor');assert.deepEqual(productById(shower.productId).dimensions,[.33,.3]);assert.deepEqual(productById(floorOrderForRoom('ensuite').productId).dimensions,[.3,.3]);
 for(const r of FLOOR_ORDER_ROWS){const [x,y,w,h]=r.rect;assert(x>0&&y>0&&x+w<=1&&y+h<=1);assert.equal(readFileSync(new URL(`../public/house/harash-products-${r.page}.jpg`,import.meta.url)).readUInt16BE(0),0xffd8);assert(productById(r.productId));}
});

test('old floor experiments migrate to the reviewed order while opening states, services, lighting and furniture choices survive',()=>{
 const raw={schema:2,lang:'en',light:'evening',openDoors:['entry'],openParts:['wardrobe-a:left'],closedShutters:['patio'],showWater:false,renderQuality:'light',rooms:{living:{floor:'oak',wall:'sage',wood:'dark'},laundry:{floor:'stone'},terrace:{floor:'warm'}}};
 const migrated=migrateHomeFloorSchedule(raw),result=normalizeHomeSettings(migrated);assert.equal(result.finishScheduleVersion,FINISH_SCHEDULE_VERSION);
 for(const r of ROOMS.filter(r=>r.id!=='garden'))assert.equal(result.rooms[r.id].floor,orderedFinishForRoom(r.id),r.id);
 assert.deepEqual(result.openDoors,raw.openDoors);assert.deepEqual(result.openParts,raw.openParts);assert.deepEqual(result.closedShutters,raw.closedShutters);assert.equal(result.showWater,false);assert.equal(result.light,'evening');assert.equal(result.renderQuality,'light');assert.equal(result.rooms.living.wall,'sage');assert.equal(result.rooms.living.wood,'dark');assert.equal(raw.rooms.living.floor,'oak','migration does not mutate the input');
 const trial={...result,rooms:{...result.rooms,living:{...result.rooms.living,floor:'oak'}}};assert.strictEqual(migrateHomeFloorSchedule(trial),trial);assert.equal(normalizeHomeSettings(migrateHomeFloorSchedule(trial)).rooms.living.floor,'oak','new explicit experiments still restore after the one-time correction');
 const oldKitchen={floor:'warm',base:'oak',openParts:['sink:door-left'],showElectrical:true,cleanView:true};const fixed=migrateKitchenFloorSchedule(oldKitchen);assert.equal(fixed.floor,'harash');assert.equal(fixed.base,'oak');assert.strictEqual(fixed.openParts,oldKitchen.openParts);assert.equal(fixed.showElectrical,true);assert.equal(fixed.cleanView,true);assert.equal(migrateKitchenFloorSchedule({...fixed,floor:'cool'}).floor,'cool');assert.equal(migrateKitchenFloorSchedule(null).floor,'harash');
});

test('Mona is unavailable on dry-room walls and cannot render there even when passed unvalidated legacy settings',()=>{
 const settings=normalizeHomeSettings({schema:2,rooms:{living:{wall:'ordered-mona'},'bedroom-a':{wall:'ordered-mona'},laundry:{wall:'ordered-mona'}}});
 for(const room of ROOMS){assert.equal(wallFinishesForRoom(room.id).some(f=>f.id==='ordered-mona'),roomHasOrderedCladding(room.id));if(!roomHasOrderedCladding(room.id))assert.notEqual(settings.rooms[room.id].wall,'ordered-mona');}
 settings.rooms.living.wall='ordered-mona';settings.rooms['bedroom-a'].wall='ordered-mona';
 const scene=createHomeScene(settings,{mode:'walk'});let count=0,paintedWalls=0;
 try{scene.group.traverse(o=>{if(o.userData.wallTile){count++;assert(roomHasOrderedCladding(o.userData.roomId));}if(o.userData.part==='architectural-wall'){paintedWalls++;assert(o.material.some(m=>['paint','plaster'].includes(m.userData.surfaceKind)));}});assert(count>0);assert(paintedWalls>10);}finally{scene.dispose();}
});

test('loading corrected floors gives every rendered room its ordered SKU, with separate shower overlay and matching detailed kitchen',()=>{
 const raw={schema:2,rooms:Object.fromEntries(ROOMS.map(r=>[r.id,{floor:'oak'}]))},settings=normalizeHomeSettings(migrateHomeFloorSchedule(raw)),home=createHomeScene(settings),kitchen=createKitchen({...DEFAULTS,...migrateKitchenFloorSchedule({floor:'cool'})});
 let floors=0,shower=0,kitchenFloor=0;
 try{
  home.group.traverse(o=>{if(o.userData.floorFinish){const record=floorOrderForRoom(o.userData.roomId);assert(record);assert.equal(o.material.userData.sku,productById(record.productId).sku,o.userData.roomId);floors++;}if(o.userData.productId==='shower-floor'){assert.equal(o.material.userData.sku,'YUCLAC33');assert.deepEqual(o.material.userData.tile,[.33,.3]);shower++;}});
  kitchen.group.traverse(o=>{if(o.userData.productId==='dry-floor'){kitchenFloor++;assert.equal(o.material.userData.sku,'MI402439');assert.deepEqual(o.material.userData.tile,[1,1]);}});
  assert(floors>=13);assert.equal(shower,1);assert.equal(kitchenFloor,1);
 }finally{home.dispose();kitchen.dispose();}
});
