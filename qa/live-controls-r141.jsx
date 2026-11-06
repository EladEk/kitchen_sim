// Actual live panel, room switching, placement and persistence modules.
// Test points substitute for canvas pointer input; this fixture needs no GPU.
import React,{useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {LiveFurniturePanel} from '../public-view/LiveFurniturePanel.jsx';
import {furnitureTemplate,liveCandidate,modeForItem,switchLiveRoom} from '../public-view/live-furniture.mjs';
import {unitContext,scopeKey,updateUnit,normalizeWorkspace,newItemId,readEditorShelf,writeEditorShelf,itemInRoom} from '../public-view/apartment-editing.mjs';
import {removeFurnitureWithDependents} from '../public-view/furniture-attachments.mjs';
const box=(x,z,w,d)=>[[x,z],[x+w,z],[x+w,z+d],[x,z+d]],scope={building:'4102',floor:0,unit:1},key=scopeKey(scope),storage='qa-live-controls-r141';
const nav={storey:3.1,floors:[{level:0,elevation:0,units:[{number:1,polygon:box(0,0,10,10)}],map:{rooms:[{id:'left',unit:1,he:'חדר שינה',label:[2,2],polygons:[box(0,0,5,5)]},{id:'right',unit:1,he:'חדר שינה',label:[7,2],polygons:[box(5,0,5,5)]},{id:'living',unit:1,he:'סלון',label:[5,7],polygons:[box(0,5,10,5)]}],furniture:[],walls:[],doors:[]}}]};
function App(){
 const [ws,setWs]=useState(()=>readEditorShelf(localStorage,storage).active),[s,set]=useState(()=>{const item=furnitureTemplate('wardrobe',unitContext(nav,scope),[]);return {scope,item,template:item,grid:.1,mount:'floor',hasPoint:false,existing:false,error:''};}),[closed,close]=useState(false),history=useRef([]),context=unitContext(nav,s.scope),items=ws.units[key]?.items||[];
 const save=next=>{const value=normalizeWorkspace(next,nav);history.current=[...history.current,ws].slice(-12);setWs(value);writeEditorShelf(localStorage,storage,{active:value,saved:[]});};
 const place=(point,item=s.item,mount=s.mount,supportId=null)=>{if(!item)return;const next=liveCandidate({item,point,mount,supportId,context,items,grid:s.grid});set({...s,...next,hasPoint:true});};
 const actions={
  kind:kind=>{const item=furnitureTemplate(kind,context,items,(s.item||s.template).color);set({...s,item,template:item,mount:modeForItem(item),existing:false,hasPoint:false,error:''});},
  patch:change=>{const item={...(s.item||s.template),...change};if(s.item&&s.hasPoint)place([item.x,item.z],item);else set({...s,item:s.item?item:null,template:item});},
  room:roomId=>set(switchLiveRoom(s,roomId,{nav,workspace:ws}).session),
  create:()=>set({...s,item:{...s.template,id:newItemId()},existing:false,hasPoint:false,error:''}),
  select:(_,id)=>{const item=items.find(r=>r.id===id);if(item)set({...s,item:{...item},template:item,existing:true,hasPoint:true,mount:modeForItem(item),error:''});},
  commit:()=>{if(!s.item||s.error||!s.hasPoint)return;save(updateUnit(ws,key,s.existing?items.map(r=>r.id===s.item.id?s.item:r):[...items,s.item]));set({...s,item:null,existing:false,hasPoint:false,status:'הרהיט הונח ונשמר.'});},
  cancel:()=>set({...s,item:null,existing:false,hasPoint:false,error:'',status:'המיקום בוטל.'}),
  undo:()=>{const previous=history.current.pop();if(!previous)return;setWs(previous);writeEditorShelf(localStorage,storage,{active:previous,saved:[]});set({...s,item:null,existing:false,hasPoint:false,error:'',status:'הפעולה בוטלה.'});},
  rotate:degrees=>{if(s.item)place([s.item.x,s.item.z],{...s.item,yaw:s.item.yaw+degrees*Math.PI/180});},
  grid:grid=>set({...s,grid}),mount:mount=>set({...s,mount,hasPoint:false}),support:()=>{},
  duplicate:()=>set({...s,item:{...s.item,id:newItemId()},existing:false,hasPoint:false}),
  remove:()=>{save(updateUnit(ws,key,removeFurnitureWithDependents(items,s.item.id)));set({...s,item:null,existing:false,hasPoint:false});},
  finish:()=>close(true)
 };
 return <><main><h1>בדיקת ממשק חדרים R141</h1><p>ממשק אמיתי עם נקודות בדיקה ללא GPU</p><button onClick={()=>place([2,2.5])}>נקודה בחדר 1</button><button onClick={()=>place([7,2.5])}>נקודה בחדר 2</button><button onClick={()=>place([5,7.5])}>נקודה בסלון</button><pre id="qa-room-scope">{JSON.stringify({room:s.scope.roomId||'',visible:items.filter(r=>itemInRoom(r,context)).map(r=>r.kind)})}</pre><pre id="qa-live-workspace" dir="ltr">{JSON.stringify(ws,null,2)}</pre></main>{!closed&&<LiveFurniturePanel session={s} rooms={context.rooms} items={items.filter(r=>itemInRoom(r,context))} actions={actions} undoAvailable={history.current.length>0}/>}<p role="status">{closed?'הבנייה הסתיימה':''}</p></>;
}
createRoot(document.getElementById('root')).render(<App/>);
