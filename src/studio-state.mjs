export const HOME_STORAGE='elad-home-studio-v1';
export const KITCHEN_STORAGE='elad-kitchen-studio-v1';
const record=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
export function readStudioSave(storage,key){try{return record(JSON.parse(storage.getItem(key)||'{}'));}catch{return {};}}
// Active state is supplied by its React app; the unmounted simulator is read
// from storage. Neither view resets finishes, camera settings or source metadata.
export function closeAllStudioOpenings(storage,{home,kitchen}={}){
 const nextHome={...record(home??readStudioSave(storage,HOME_STORAGE)),openDoors:[],openParts:[],closedBuildingDoors:BUILDING_INTERIORS.floors.flatMap(f=>f.doors.map(d=>d.id)),closedShutters:[...SHUTTER_IDS]};
 const savedKitchen=record(kitchen??readStudioSave(storage,KITCHEN_STORAGE));
 const nextKitchen={...savedKitchen,settings:{...record(savedKitchen.settings),openParts:[]}};
 let persisted=true;
 for(const [key,value] of [[HOME_STORAGE,nextHome],[KITCHEN_STORAGE,nextKitchen]])try{storage.setItem(key,JSON.stringify(value));}catch{persisted=false;}
 return {home:nextHome,kitchen:nextKitchen,persisted};
}
import {SHUTTER_IDS} from './home-building-spec.mjs';

import {BUILDING_INTERIORS} from './building-interiors.mjs';
