import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {furnitureClearances,liveFurnitureClearances,clearanceLabel,CLEARANCE_DIRECTIONS} from './furniture-clearances.mjs';import {clearanceWorldGuides,projectClearanceGuide} from './furniture-clearance-overlay.mjs';import {DISTRICT,buildingTransform} from './district.mjs';import {localPoint} from './furniture-attachments.mjs';import {newLiveSession,catalogLiveSession} from './live-furniture.mjs';
const box=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],scope={building:'4102',floor:1,unit:8},context={scope,elevation:3.1,polygons:[box(0,0,10,8)],unitPolygons:[box(0,0,10,8)],walls:[box(-.2,-.2,10.4,.2),box(-.2,8,10.4,.2),box(-.2,0,.2,8),box(10,0,.2,8)]},make=(id,kind,x,z,w=1,d=.6,h=.8,y=0)=>({id,kind,x,z,w,d,h,y,yaw:0,color:'#cbbda4'}),selected=make('selected','wardrobe',3,4,1.2,.6,2.2),bed=make('bed','bed',3,5.5,1.2,1.6,.5),desk=make('desk','desk',5,4,1.2,.7,.75),chair=make('chair','chair',3,2.5,.5,.5,.8),near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} vs ${b}`);

test('four sides use the nearest wall or item and label the real target instead of adding diagonal nearest-item lines',()=>{
 const value=furnitureClearances(selected,context,[selected,bed,desk,chair]);assert.equal(value.horizontalGuides.length,4);assert.equal(value.guides.length,4);assert.deepEqual(value.horizontalGuides.map(g=>g.direction),['left','right','up','down']);assert.equal(value.directions.left.type,'wall');assert.equal(value.directions.right.id,'desk');assert.equal(value.directions.up.id,'chair');assert.equal(value.directions.down.id,'bed');near(value.directions.right.gap,.8);near(value.directions.down.gap,.4);assert(value.directions.down.name.includes('1'));assert(clearanceLabel(value.directions.down).includes(value.directions.down.name));assert.equal(new Set(value.guides.map(g=>g.color)).size,4);assert.deepEqual(value.guides.map(g=>g.number),[1,2,3,4]);
 // The tall selected wardrobe measures to the low bed at the bed's own height.
 near(value.directions.down.fromY,.25);near(value.directions.down.toY,.25);for(const g of value.horizontalGuides){assert(g.targetPolygons.length);near(Math.hypot(g.from[0]-g.to[0],g.from[1]-g.to[1]),g.gap);}
});

test('identical furniture types have stable numbered names while moving a selected item',()=>{
 const other={...desk,id:'desk-2',x:8},items=[selected,desk,other];const a=furnitureClearances(selected,context,items),b=furnitureClearances({...selected,x:6.5},context,items);assert.equal(a.directions.right.name,'שולחן מחשב 1');assert.equal(b.directions.right.name,'שולחן מחשב 2');assert.equal(b.directions.left.id,'desk');assert.equal(b.directions.left.name,'שולחן מחשב 1');
});

test('four directions follow the furniture rotation and use actual edge points in every building mirror',()=>{
 const rotated={...selected,yaw:Math.PI/2},v=furnitureClearances(rotated,context,[selected,desk,bed]);assert.equal(v.horizontalGuides.length,4);for(const g of v.horizontalGuides){const a=localPoint(rotated,...g.from),b=localPoint(rotated,...g.to),axis=['left','right'].includes(g.direction)?0:1,sign=['left','up'].includes(g.direction)?-1:1;near(a[1-axis],b[1-axis]);near((b[axis]-a[axis])*sign,g.gap);}
 for(const building of DISTRICT){const value=furnitureClearances(rotated,{...context,scope:{...scope,building:building.id}},[desk,bed]),inverse=buildingTransform(building).invert();for(const g of clearanceWorldGuides(value)){near(g.from.distanceTo(g.to),g.gap);const p=g.from.clone().applyMatrix4(inverse),source=value.directions[g.direction];near(p.x,source.from[0]);near(p.z,source.from[1]);}}
});

test('hanging cabinet above a base cabinet shows the vertical surface gap, updating when mounting height changes',()=>{
 const base=make('base','kitchen_base',3,4,1.2,.6,.9),wall=make('wall','kitchen_wall',3,4,1.2,.35,.7,1.45),items=[base,wall],before=JSON.stringify(items),v=furnitureClearances(wall,context,items);assert.equal(v.horizontalGuides.length,4);assert.equal(v.verticalGuides.length,1);const g=v.vertical.below;assert(g);assert.equal(g.id,base.id);near(g.gap,.55);near(g.fromY,1.45);near(g.toY,.9);assert.deepEqual(g.from,g.to);assert.equal(clearanceLabel(g).includes('מתחת'),true);assert.equal(v.horizontalGuides.some(g=>g.id===base.id),false);near(furnitureClearances({...wall,y:1.65},context,items).vertical.below.gap,.75);assert.equal(JSON.stringify(items),before);
 const fromBase=furnitureClearances(base,context,items);assert.equal(fromBase.vertical.above.id,wall.id);near(fromBase.vertical.above.gap,.55);
});

test('stacked furniture selects nearest surfaces above and below, excludes distant pieces and respects an L-shaped recess',()=>{
 const lower=make('lower','kitchen_base',3,4,1.2,.6,.9),middle=make('middle','wall_storage',3,4,1.2,.4,.5,1.2),upper=make('upper','wall_storage',3,4,1.2,.4,.4,2),higher=make('higher','wall_storage',3,4,1.2,.4,.3,2.5),far=make('far','wall_storage',6,4,1.2,.4,.3,1.8);const v=furnitureClearances(middle,context,[lower,middle,upper,higher,far]);assert.equal(v.verticalGuides.length,2);assert.equal(v.vertical.above.id,upper.id);assert.equal(v.vertical.below.id,lower.id);near(v.vertical.above.gap,.3);near(v.vertical.below.gap,.3);
 const sofa={...make('sofa','corner_sofa',4,4,3,3,.8),seatDepth:.8,cornerSide:'right'},aboveVoid=make('above-void','wall_storage',3.5,4.5,.5,.5,.5,1.5);assert.equal(furnitureClearances(sofa,context,[sofa,aboveVoid]).verticalGuides.length,0);
 const adjacent=make('adjacent','kitchen_wall',4.2,4,1.2,.4,.5,1.5);assert.equal(furnitureClearances(lower,context,[adjacent]).verticalGuides.length,0,'edge contact without plan area overlap is not a stacked pair');
});

test('support TVs have vertical clearance to their stand and follow changed stand height without mutating saved data',()=>{
 const base=make('base','tv_console',3,4,2,.6,.6),tv={...make('tv','tv_stand',3,4,1.35,.3,.76,.608),attachment:{mode:'top',supportId:'base',offset:[0,0],yaw:0}},items=[base,tv],before=JSON.stringify(items),moved={...base,x:5,h:.8};const v=furnitureClearances(moved,context,items);assert.equal(v.vertical.above.id,tv.id);near(v.vertical.above.gap,.008);near(v.vertical.above.fromY,.8);near(v.vertical.above.toY,.808);assert.equal(JSON.stringify(items),before);const touch={...tv,attachment:null,y:.6};near(furnitureClearances(touch,context,[base,touch]).vertical.below.gap,0);
});

test('vertical dimensions retain correct storey, endpoint surfaces and target outlines in all eight registrations',()=>{
 const base=make('base','kitchen_base',3,4,1.2,.6,.9),wall=make('wall','kitchen_wall',3,4,1.2,.35,.7,1.45);for(const building of DISTRICT){const value=furnitureClearances(wall,{...context,scope:{...scope,building:building.id}},[base,wall]),world=clearanceWorldGuides(value),g=world.find(g=>g.axis==='vertical');near(g.from.y,context.elevation+.03+1.45);near(g.to.y,context.elevation+.03+.9);near(g.from.distanceTo(g.to),.55);assert(g.targetOutlines.length);for(const p of g.targetOutlines.flat())near(p.y,g.to.y);}
});

test('open edges use an explicitly named space boundary; vertical dimensions are temporary and disappear with the edit selection',()=>{
 const ctx={...context,walls:[]},v=furnitureClearances(selected,ctx,[]);assert.equal(v.horizontalGuides.length,4);assert(v.horizontalGuides.every(g=>g.type==='boundary'&&g.name==='גבול החלל'));const session=newLiveSession(scope,selected);assert(liveFurnitureClearances(session,context,[bed]));assert.equal(liveFurnitureClearances(catalogLiveSession(session),context,[bed]),null);assert.equal(liveFurnitureClearances({...session,stage:'pick',hasPoint:false},context,[bed]),null);
});

test('camera clipping retains the visible part of long/behind-camera dimensions and precise vertical lines',()=>{
 const camera=new T.PerspectiveCamera(60,1,.1,100);camera.updateMatrixWorld(true);const crossing={from:new T.Vector3(.1,0,-2),to:new T.Vector3(.1,0,2)},partial=projectClearanceGuide(crossing,camera,394,500);assert(partial);assert(partial.clipped);assert(partial.from.concat(partial.to).every(Number.isFinite));const vertical=projectClearanceGuide({from:new T.Vector3(0,1.45,-3),to:new T.Vector3(0,.9,-3)},camera,394,500);assert(vertical);assert.notEqual(vertical.from[1],vertical.to[1]);assert.equal(projectClearanceGuide({from:new T.Vector3(0,0,1),to:new T.Vector3(0,1,2)},camera,394,500),null);
});
