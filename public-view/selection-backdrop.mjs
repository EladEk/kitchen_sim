import {Color} from 'three';

// Detached plans need contrast around white walls. Only the visible backdrop
// changes; sunlight, IBL and the material palette retain their normal values.
export function createSelectionBackdrop(scene){
 const background=new Color('#d9d5ce'),sky=[];
 // The astronomical rig is installed before this helper. Cache its few meshes
 // instead of traversing the hidden full building on every editing frame.
 scene.traverse(o=>{if(o.userData.celestialBackground)sky.push(o);});
 const visibility=new Array(sky.length);let previous=null,active=false;
 const restore=()=>{scene.background=previous;for(let i=0;i<sky.length;i++)sky[i].visible=visibility[i];active=false;};
 return {render(focused,draw){
  if(!focused||active)return draw();
  previous=scene.background;active=true;
  scene.background=background;
  for(let i=0;i<sky.length;i++){visibility[i]=sky[i].visible;sky[i].visible=false;}
  try{const result=draw();if(result?.then)return Promise.resolve(result).finally(restore);restore();return result;}
  catch(error){restore();throw error;}
 }};
}
