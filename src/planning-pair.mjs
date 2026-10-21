import {normalizeHomeSettings} from './home-model.mjs';
import {DEFAULTS,MATERIALS,STONES} from './model.mjs';
import {migrateHomeFloorSchedule,migrateKitchenFloorSchedule} from './home-finish-schedule.mjs';
import {normalizeOpenParts} from './openings.mjs';
import {kitchenVisibilitySettings} from './kitchen-visibility.mjs';
import {normalizeLightControls} from './lighting-controls.mjs';
import {normalizeSolar} from './solar-lighting.mjs';
import {HOME_STORAGE,KITCHEN_STORAGE} from './studio-state.mjs';
export function normalizeKitchenDesign(input={}){
 const s=migrateKitchenFloorSchedule(input||{}),result={...DEFAULTS};
 for(const [k,choices] of Object.entries({base:MATERIALS.map(m=>m.id),upper:MATERIALS.map(m=>m.id),stone:STONES.map(m=>m.id),renderQuality:['realistic','light'],hardware:['black','steel','brass'],floor:['harash','warm','cool'],light:['day','evening','night'],lang:['en','he'],view:['perspective','plan','elevation','return']}))if(choices.includes(s[k]))result[k]=s[k];
 for(const k of ['lampsOn','led','dimensions','labels','showElectrical','showWater','showLighting','cleanView'])if(typeof s[k]==='boolean')result[k]=s[k];
 if(Number.isFinite(s.intensity))result.intensity=Math.max(0,Math.min(100,s.intensity));
 return {...result,openParts:normalizeOpenParts(s.openParts),lightControls:normalizeLightControls(s.lightControls),solar:normalizeSolar(s.solar),...kitchenVisibilitySettings(s),selected:null};
}
export function readHomeDesign(storage){try{return normalizeHomeSettings(migrateHomeFloorSchedule(JSON.parse(storage.getItem(HOME_STORAGE)||'{}')));}catch{return normalizeHomeSettings();}}
export function readKitchenDesign(storage){try{return normalizeKitchenDesign(JSON.parse(storage.getItem(KITCHEN_STORAGE)||'{}').settings||{});}catch{return normalizeKitchenDesign();}}
export const cleanDesignPair=(home,kitchen)=>({home:normalizeHomeSettings(home),kitchen:normalizeKitchenDesign(kitchen)});
