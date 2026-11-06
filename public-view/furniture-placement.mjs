import {normalizeWorkspace,scopeKey} from './apartment-editing.mjs';
import {createTourTap} from './tour-interaction.mjs';
export const PLACEMENT_PROMPT='הקש על מיקום בחדר להנחת הרהיט';
export function beginFurniturePlacement(session){
 if(!session?.template)return session;
 const item={...session.template};if(!session.existing&&session.mount==='floor')delete item.attachment;
 try{normalizeWorkspace({schema:1,units:{[scopeKey(session.scope)]:{items:[{...item,attachment:undefined}]}}});}catch(e){return {...session,error:e.message};}
 return {...session,item,stage:'pick',hasPoint:false,collapsed:false,error:'',status:PLACEMENT_PROMPT};
}
export function acceptFurniturePosition(session){
 if(!session)return session;
 if(session.error)return {...session,stage:'pick',hasPoint:false,status:PLACEMENT_PROMPT};
 return {...session,template:session.item,stage:'move',hasPoint:true,collapsed:false,status:'הרהיט הונח כטיוטה. אפשר להזיז, לסובב ולשמור את המיקום.'};
}
// Share the same click/touch rules in the viewer and the browser fixture.
// Pointer movement is left available to the camera; only a short tap drops.
export function createFurniturePlacement({getSession,point,select,available=()=>true}){
 const tap=createTourTap(),picking=()=>getSession()?.stage==='pick';
 return {down(e){if(!picking())return false;if(available())tap.down(e);else tap.cancel();return true;},move(e){if(!picking())return false;tap.move(e);return true;},up(e,{blocked=false}={}){if(!picking()){tap.cancel();return false;}const clicked=tap.up(e);if(!blocked&&available()&&clicked&&(e.button==null||e.button===0)){const next=point(e);if(next)select(acceptFurniturePosition(next));}return true;},cancel(){tap.cancel();}};
}
