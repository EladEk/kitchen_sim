import test from 'node:test';
import assert from 'node:assert/strict';
import {switchLiveRoom,furnitureTemplate,liveCandidate} from './live-furniture.mjs';
import {unitContext,itemInRoom,scopeKey,emptyWorkspace,updateUnit,encodeLayout,decodeLayout} from './apartment-editing.mjs';
import {selectionRegions} from './selection.mjs';
const box=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],scope={building:'4102',floor:0,unit:1},nav={storey:3.1,floors:[{level:0,units:[{number:1,polygon:box(0,0,10,5)}],map:{rooms:[{id:'left',unit:1,he:'חדר שינה',label:[2,2],polygons:[box(0,0,5,5)]},{id:'right',unit:1,he:'חדר שינה',label:[7,2],polygons:[box(5,0,5,5)]}],walls:[]}}],destinations:[{id:'unit:1:0',floor:0,unit:1}]};
test('live room switches isolate placement and source sections without changing saved furniture in either room',()=>{
 const workspace=updateUnit(emptyWorkspace(),scopeKey(scope),[{id:'left-desk',kind:'desk',x:2,z:2,w:1.2,d:.6,h:.75,yaw:0,color:'#aa8054'},{id:'right-bed',kind:'bed',x:7,z:2,w:1,d:2,h:1,yaw:0,color:'#cbbda4'}]),before=JSON.stringify(workspace),template=furnitureTemplate('chair',unitContext(nav,scope),[],'#789786'),initial={scope,template,item:template,grid:.1,existing:false,hasPoint:false,mount:'floor'};
 const left=switchLiveRoom(initial,'left',{nav,workspace});
 assert.equal(left.session.scope.roomId,'left');assert.equal(left.session.hasPoint,false);assert.equal(left.session.item,null);assert.equal(left.session.stage,'categories');
 assert.deepEqual(workspace.units[scopeKey(scope)].items.filter(r=>itemInRoom(r,left.context)).map(r=>r.id),['left-desk']);
 assert.match(liveCandidate({item:furnitureTemplate('chair',left.context),point:[7,2],context:left.context,items:[]}).error,/חדר/);
 assert.equal(liveCandidate({item:furnitureTemplate('chair',left.context),point:[3,3],context:left.context,items:[]}).error,'');
 assert.deepEqual(selectionRegions(nav,{level:0,target:'unit:1:0',roomFocus:left.focus})[0].polygons,left.context.polygons);
 const right=switchLiveRoom(left.session,'right',{nav,workspace});
 assert.deepEqual(workspace.units[scopeKey(scope)].items.filter(r=>itemInRoom(r,right.context)).map(r=>r.id),['right-bed']);
 const all=switchLiveRoom(right.session,'',{nav,workspace});assert.equal(all.focus,null);assert.equal(all.session.scope.roomId,'');
 assert.equal(workspace.units[scopeKey(scope)].items.filter(r=>itemInRoom(r,all.context)).length,2);
 assert.equal(JSON.stringify(workspace),before);assert.equal(decodeLayout(encodeLayout(workspace),nav).workspace.units[scopeKey(scope)].items.length,2);
 assert.throws(()=>switchLiveRoom(initial,'missing',{nav,workspace}),/אינו נמצא/);
});
test('switching rooms cancels an existing placement and its support reference while preserving the original TV and host',()=>{
 const items=[{id:'host',kind:'tv_console',x:2,z:2,w:1.8,d:.45,h:.6,yaw:0},{id:'tv',kind:'tv_stand',x:2,z:2,w:1.35,d:.3,h:.9,y:.608,yaw:0,attachment:{mode:'top',supportId:'host',offset:[0,0],yaw:0}}],workspace=updateUnit(emptyWorkspace(),scopeKey(scope),items),previous=workspace.units[scopeKey(scope)].items[1],state={scope,item:previous,template:previous,existing:true,supportId:'host',mount:'top',hasPoint:true,error:'old error'};
 const changed=switchLiveRoom(state,'right',{nav,workspace}).session;
 assert.equal(changed.existing,false);assert.equal(changed.hasPoint,false);assert.equal(changed.supportId,null);assert.equal(changed.item,null);assert.equal(changed.template,null);assert.equal(changed.stage,'categories');assert.equal(changed.error,'');assert.equal(workspace.units[scopeKey(scope)].items.length,2);assert.equal(workspace.units[scopeKey(scope)].items[1].attachment.supportId,'host');
});
