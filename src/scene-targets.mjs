import {objectVisible} from './kitchen-visibility.mjs';
export function createSceneInteractionTargets(model){
 const allPicks=[...(model.picks||[])],allOccluders=[],allWalls=[],targets={picks:[],electricalOccluders:[],walls:[]};
 model.group.traverse(o=>{if(!o.isMesh)return;const mats=[o.material].flat();if(!o.userData.sceneUi&&!o.userData.tourNonPhysical&&!o.userData.electricalId&&mats.some(m=>m?.colorWrite!==false&&m?.opacity>=.98))allOccluders.push(o);if(!o.isInstancedMesh&&mats.some(m=>(m?.userData.wallCavity||m?.userData.surfaceKind==='plaster')&&!m?.userData.architecturalCeiling))allWalls.push(o);});
 targets.refresh=()=>{const visible=o=>objectVisible(o)&&[o.material].flat().some(m=>m?.visible!==false&&m?.opacity!==0);targets.picks=allPicks.filter(visible);targets.electricalOccluders=allOccluders.filter(visible);targets.walls=allWalls.filter(visible);return targets;};
 return targets.refresh();
}
