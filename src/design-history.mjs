const transient=new Set(['lang','cleanView','selected','view','labels','showRoomNames','cutaway','furniture','showElectrical','showWater','showLighting','electricalInferred','renderQuality','cabinetVisibility','showElectricalLabels','furnitureSnap']);
const clone=v=>JSON.parse(JSON.stringify(v));
const signature=value=>JSON.stringify(Object.fromEntries(Object.entries(value).filter(([k])=>!transient.has(k))));
export const newHistory=present=>({present,past:[],future:[],group:null,time:0});
export function commitDesign(state,next,{group=null,time=Date.now()}={}){
 if(JSON.stringify(next)===JSON.stringify(state.present))return state;
 if(signature(next)===signature(state.present))return {...state,present:next};
 const merge=group&&state.group===group&&time-state.time<700;
 return {present:next,past:merge?state.past:[...state.past,clone(state.present)].slice(-50),future:[],group,time};
}
export function stepHistory(state,direction){
 const undo=direction==='undo',source=undo?state.past:state.future;if(!source.length)return state;
 const target=clone(source.at(-1)),ui=Object.fromEntries(Object.entries(state.present).filter(([k])=>transient.has(k)));
 return {present:{...target,...ui},past:undo?source.slice(0,-1):[...state.past,clone(state.present)].slice(-50),future:undo?[...state.future,clone(state.present)].slice(-50):source.slice(0,-1),group:null,time:0};
}
