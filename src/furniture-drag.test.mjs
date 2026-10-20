import test from 'node:test';
import assert from 'node:assert/strict';
import {furnitureDragHandlers} from './furniture-drag.mjs';
import {getFurniture,normalizeHomeSettings,moveHomeFurniture} from './home-model.mjs';

function surface(){
 const captured=new Set(),releases=[];
 const element={
  ownerSVGElement:{getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint:()=>({x:0,y:0,matrixTransform(){return {x:(this.x-11)/2,y:(this.y-17)/2};}})},
  setPointerCapture:id=>captured.add(id),hasPointerCapture:id=>captured.has(id),releasePointerCapture(id){captured.delete(id);releases.push(id);}
 };
 const event=(x=100,y=60,props={})=>({currentTarget:element,pointerId:9,isPrimary:true,button:0,clientX:x*2+11,clientY:y*2+17,preventDefault(){},stopPropagation(){},...props});
 return {element,event,captured,releases};
}

test('a scaled SVG drag keeps its start point across React handler replacement and saves the final furniture position',()=>{
 let settings=normalizeHomeSettings({openParts:['safe-storage:left']}),item=getFurniture('safe-storage',settings);const original=item.position,selected=[],s=surface();
 const handlers=()=>furnitureDragHandlers({item,scale:30,enabled:true,onSelect:id=>selected.push(id),onMove:(id,position)=>{
  const current=getFurniture(id,settings),result=moveHomeFurniture(settings,id,{dx:position[0]-current.position[0],dz:position[1]-current.position[1]});assert(!result.error);settings=result.settings;item=getFurniture(id,settings);
 }});
 handlers().onPointerDown(s.event());assert(s.captured.has(9));
 handlers().onPointerMove(s.event(109));assert.equal(item.position[0],Math.round((original[0]+.3)*100)/100);
 handlers().onPointerMove(s.event(118));assert.equal(item.position[0],Math.round((original[0]+.6)*100)/100,'new render handlers do not compound the pointer delta');
 handlers().onPointerUp(s.event(118));assert.deepEqual(s.releases,[9]);
 const saved=normalizeHomeSettings(JSON.parse(JSON.stringify(settings)));assert.deepEqual(getFurniture(item.id,saved),item);assert.deepEqual(saved.openParts,['safe-storage:left']);assert.deepEqual(selected,[item.id]);
 handlers().onPointerMove(s.event(130));assert.deepEqual(getFurniture(item.id,settings),item,'release ends the gesture');
});

test('drag cancellation, capture loss, disabled editing and secondary pointers cannot leave a furniture gesture running',()=>{
 const item=getFurniture('safe-bed');
 for(const finish of ['onPointerUp','onPointerCancel','onLostPointerCapture']){
  const s=surface(),moves=[],handlers=furnitureDragHandlers({item,scale:30,enabled:true,onMove:(...v)=>moves.push(v)});
  handlers.onPointerDown(s.event());handlers.onPointerMove(s.event(103));assert.equal(moves.length,1);
  handlers.onPointerMove(s.event(120,60,{pointerId:10}));assert.equal(moves.length,1,'another finger cannot move the item');
  handlers[finish](s.event());handlers.onPointerMove(s.event(130));assert.equal(moves.length,1,`${finish} ends movement`);
 }
 for(const [enabled,props] of [[false,{}],[true,{button:2}],[true,{isPrimary:false}]]){
  const s=surface(),handlers=furnitureDragHandlers({item,scale:30,enabled,onSelect(){throw Error('must not select');},onMove(){throw Error('must not move');}});
  handlers.onPointerDown(s.event(100,60,props));handlers.onPointerMove(s.event(130));assert.equal(s.captured.size,0);
 }
});

test('a drag to a blocked destination preserves the last allowed furniture position',()=>{
 const s=surface();let settings=normalizeHomeSettings(),error=null;const before=JSON.stringify(settings),item=getFurniture('safe-storage',settings);
 const handlers=furnitureDragHandlers({item,scale:30,enabled:true,onMove:(id,position)=>{const current=getFurniture(id,settings),result=moveHomeFurniture(settings,id,{dx:position[0]-current.position[0],dz:position[1]-current.position[1]});error=result.error;settings=result.settings;}});
 handlers.onPointerDown(s.event());handlers.onPointerMove(s.event(136));assert.equal(error,'furniture');assert.equal(JSON.stringify(settings),before);
 handlers.onPointerCancel(s.event());
});
