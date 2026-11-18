import {Group} from 'three';
import {createSelection} from './selection.mjs';

// A detached apartment/floor owns real clipped geometry. Picking, framing and
// photo budgets therefore see exactly the same surfaces as the live renderer.
export function createFocusedSelection(template,nav){
 const group=new Group();group.name='focused-apartment-display';
 let selection=null,key='',disposed=false;
 return {group,get regions(){return selection?.regions||[];},get fallback(){return false;},
  update(state){
   if(disposed)return false;
   const next=JSON.stringify([Number(state.level),state.target||'',state.roomFocus||null,state.wallHeight??null]);
   const rebuilt=next!==key;
   if(rebuilt){
    const replacement=createSelection(template,nav,state),old=selection;
    if(old)group.remove(old.group);selection=replacement;group.add(replacement.group);key=next;old?.dispose();
   }
   selection?.sync();group.updateMatrixWorld(true);return rebuilt;
  },
  sync(){if(disposed)return;selection?.sync();group.updateMatrixWorld(true);},
  dispose(){if(disposed)return;disposed=true;selection?.dispose();selection=null;group.clear();}
 };
}
