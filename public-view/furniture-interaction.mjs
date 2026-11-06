import {parseScope} from './apartment-editing.mjs';

// Walking interactions must never enter the resident's layout editor.
export function selectResidentFurniture({state,data,hit,nav,onEdit,onToggle,walking=false}){
 const scope=parseScope(data?.editorScope,nav),id=data?.editorItemIds?.[hit?.instanceId??0];
 if(!scope||!id)return false;
 if(walking||state.mode==='walk')return state.liveSession?false:!!onToggle(scope,id,hit?.point,hit?.furnitureMotionId);
 if(state.mode==='building'&&state.liveSession){onEdit(scope,id);return true;}
 return false;
}
