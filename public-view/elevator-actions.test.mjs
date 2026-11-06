import test from 'node:test';
import assert from 'node:assert/strict';
import {createElevatorActions} from './elevator-actions.mjs';
function fixture({near=true,building='3461',floor=3,enabled=true,safe=true}={}){
 const events=[],queued=[],state={near,building,floor,enabled,safe,id:0};
 const actions=createElevatorActions({available:()=>state.enabled,context:id=>id===undefined||[0,1].includes(id)?{building:state.building,floor:state.floor,id:id??state.id,near:state.near}:null,landing:(building,floor,id)=>state.safe&&Number.isInteger(floor)&&floor>=0&&floor<=8?{building,floor,id}:null,queue:(message,move,options)=>queued.push({message,move,...options}),move:pose=>{events.push(['move',pose]);Object.assign(state,{near:true,building:pose.building,floor:pose.floor,id:pose.id});},open:value=>events.push(['open',value]),close:()=>events.push(['close']),pause:()=>events.push(['pause']),status:value=>events.push(['status',value])});
 return {actions,state,events,queued};
}
test('nearby elevator selection opens immediately, pausing movement without preparing the scene',()=>{
 const f=fixture();assert(f.actions.open());assert.deepEqual(f.queued,[]);assert.deepEqual(f.events,[['pause'],['open',{building:'3461',floor:3,id:0,near:true}]]);
});
test('one distant click approaches the chosen car and opens selection after preparation completes',()=>{
 const f=fixture({near:false});assert(f.actions.open(1));assert.equal(f.queued.length,1);assert.deepEqual(f.events,[['close']]);f.queued[0].move();assert(!f.events.some(e=>e[0]==='open'));f.queued[0].onPrepared();assert.deepEqual(f.events.slice(-2),[['pause'],['open',{building:'3461',floor:3,id:1,near:true}]]);assert.equal(f.queued.length,1);
});
test('choosing a floor preserves the actual building and selected car, without reopening selection',()=>{
 const f=fixture();assert(f.actions.ride(8,1));assert.equal(f.queued.length,1);f.queued[0].move();f.queued[0].onPrepared();assert.deepEqual(f.events,[['close'],['move',{building:'3461',floor:8,id:1}]]);
});
test('a canceled approach, unavailable runtime or changed building cannot open stale selection',()=>{
 const f=fixture({near:false});f.actions.open();f.queued[0].move();f.state.enabled=false;f.queued[0].onPrepared();assert(!f.events.some(e=>e[0]==='open'));assert.equal(f.actions.open(),false);assert.equal(f.actions.ride(2),false);
 const g=fixture({near:false});g.actions.open();g.queued[0].move();g.state.building='4103';g.queued[0].onPrepared();assert(!g.events.some(e=>e[0]==='open'));
});
test('invalid floors, missing cars and blocked exits keep the current view in place',()=>{
 for(const floor of [-1,9,NaN,1.5]){const f=fixture();assert.equal(f.actions.ride(floor),false);assert.equal(f.queued.length,0);assert(!f.events.some(e=>e[0]==='close'||e[0]==='move'));}
 const f=fixture({safe:false});assert.equal(f.actions.ride(2,1),false);assert.equal(f.actions.open(99),false);assert.equal(f.queued.length,0);
});
