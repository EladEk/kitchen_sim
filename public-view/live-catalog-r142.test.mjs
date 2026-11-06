import {applyLiveFurnitureControls} from './live-furniture-controls.mjs';
import test from 'node:test';import assert from 'node:assert/strict';import * as T from 'three';
import {FURNITURE_TYPES,unitContext,emptyWorkspace,scopeKey,updateUnit,decodeLayout,encodeLayout,itemPolygon,polygonsOverlap} from './apartment-editing.mjs';
import {FURNITURE_CATEGORIES,furnitureThumbnail} from './furniture-catalog.mjs';
import {newLiveSession,configureLiveFurniture,backLiveSession,switchLiveRoom,autoLivePlacement,wallPlacement,livePlacementError,topPlacement} from './live-furniture.mjs';
import {createRoomFocus} from './room-selection.mjs';import {createSelection} from './selection.mjs';
const box=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],scope={building:'4102',floor:0,unit:1},walls=[box(0,0,4,.2),box(0,3.8,4,.2),box(0,.2,.2,3.6),box(3.8,.2,.2,3.6)],nav={storey:3.1,floors:[{level:0,elevation:0,units:[{number:1,polygon:box(0,0,4,4)}],map:{walls,rooms:[{id:'room',unit:1,he:'ממ״ד',polygons:[box(.2,.2,3.6,3.6)],label:[2,2]}],doors:[],furniture:[]}}],destinations:[{id:'unit:1:0',floor:0,unit:1}]},context=unitContext(nav,{...scope,roomId:'room'});

test('every catalog category and all furniture kinds have distinct model illustrations and one complete category mapping',()=>{
 const kinds=FURNITURE_CATEGORIES.flatMap(c=>c.kinds);assert.equal(new Set(kinds).size,kinds.length);assert.deepEqual([...kinds].sort(),Object.keys(FURNITURE_TYPES).sort());
 const pictures=new Set();for(const kind of kinds){const uri=furnitureThumbnail(kind);assert(uri.startsWith('data:image/svg+xml,'));const svg=decodeURIComponent(uri.split(',').slice(1).join(','));assert(svg.includes('<polygon'));assert(!/NaN|Infinity|undefined/.test(svg));pictures.add(uri);}assert.equal(pictures.size,kinds.length);
 for(const category of FURNITURE_CATEGORIES)assert(kinds.includes(category.cover));assert.notEqual(furnitureThumbnail('sofa',{color:'#aa8054'}),furnitureThumbnail('sofa',{color:'#789786'}));
});
test('opening and switching rooms leave the camera free; category selection and configuration never activate placement implicitly',()=>{
 const controls={mouseButtons:{LEFT:T.MOUSE.ROTATE,RIGHT:T.MOUSE.PAN},touches:{ONE:T.TOUCH.ROTATE,TWO:T.TOUCH.DOLLY_PAN}},mouse={...controls.mouseButtons},touches={...controls.touches};
 const idle=newLiveSession(scope);assert.equal(idle.item,null);assert.equal(idle.template,null);assert.equal(idle.stage,'categories');
 const chosen=configureLiveFurniture(idle,'desk',context,[]);applyLiveFurnitureControls(controls,mouse,touches,chosen);assert.equal(controls.mouseButtons.LEFT,T.MOUSE.ROTATE);assert.equal(controls.touches.ONE,T.TOUCH.ROTATE);applyLiveFurnitureControls(controls,mouse,touches,{...chosen,item:chosen.template,stage:'place'});assert.equal(controls.mouseButtons.LEFT,null);applyLiveFurnitureControls(controls,mouse,touches,idle);assert.equal(controls.mouseButtons.LEFT,T.MOUSE.ROTATE);assert.equal(chosen.item,null);assert.equal(chosen.stage,'configure');assert.equal(chosen.template.kind,'desk');assert.equal(backLiveSession(chosen).stage,'items');assert.equal(backLiveSession(backLiveSession(chosen)).stage,'categories');
 const switched=switchLiveRoom(chosen,'room',{nav,workspace:emptyWorkspace()}).session;assert.equal(switched.item,null);assert.equal(switched.template,null);assert.equal(switched.stage,'categories');
});
test('configured metric furniture is added in a free position; ninety-degree wall snaps and a supported TV round-trip without overlap',()=>{
 const template={...configureLiveFurniture(newLiveSession(scope),'desk',context,[]).template,w:2.7,d:.7,color:'#789786'},a=autoLivePlacement(template,context,[]);assert.equal(a.error,'');assert.equal(a.item.w,2.7);assert.equal(livePlacementError(a.item,context,[]),'');
 const second=autoLivePlacement({...template,id:'second'},context,[a.item]);assert.equal(second.error,'');assert(!polygonsOverlap(itemPolygon(a.item),itemPolygon(second.item)));
 const host={id:'console',kind:'tv_console',x:2,z:2,w:1.6,d:.45,h:.6,yaw:0},wall=wallPlacement({...host,attachment:{mode:'wall',turns:1}},[2,.2],context);assert(wall);assert.equal(wall.attachment.turns,1);assert(Math.abs(wall.yaw-Math.PI/2)<1e-6);assert.equal(livePlacementError(wall,context,[]),'');
 const tv=topPlacement({id:'tv',kind:'tv_stand',x:wall.x,z:wall.z,w:1.2,d:.3,h:.76,yaw:wall.yaw},[wall.x,wall.z],[wall]);assert(tv,'wall-snapped cabinets remain usable as TV supports');
 const loaded=decodeLayout(encodeLayout(updateUnit(emptyWorkspace(),scopeKey(scope),[wall,tv])),nav).workspace.units[scopeKey(scope)].items;assert.equal(loaded[0].attachment.turns,1);assert.equal(loaded[1].attachment.supportId,'console');
 assert(autoLivePlacement({...template,w:8,d:8},context,[]).error);
});
test('a room crop retains the full thickness and actual outer faces of all four enclosing walls',()=>{
 const focus=createRoomFocus(context),root=new T.Group(),material=new T.MeshStandardMaterial(),owned=[];
 for(const p of walls){const xs=p.map(v=>v[0]),zs=p.map(v=>v[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),g=new T.BoxGeometry(maxX-minX,2.8,maxZ-minZ),m=new T.Mesh(g,material);m.position.set((minX+maxX)/2,1.4,(minZ+maxZ)/2);m.userData.level=0;root.add(m);owned.push(g);}
 const selection=createSelection(root,nav,{level:0,target:'unit:1:0',roomFocus:focus});try{const rays=[[[-1,1.4,2],[1,0,0]],[[5,1.4,2],[-1,0,0]],[[2,1.4,-1],[0,0,1]],[[2,1.4,5],[0,0,-1]]];for(const [origin,direction]of rays){const hit=new T.Raycaster(new T.Vector3(...origin),new T.Vector3(...direction),0,2).intersectObject(selection.group,true)[0];assert(hit);assert(Math.abs(hit.distance-1)<.001,'outer wall face remains intact');}}
 finally{selection.dispose();owned.forEach(g=>g.dispose());material.dispose();}
});
