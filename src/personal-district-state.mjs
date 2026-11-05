import {readHomeDesign,readKitchenDesign,normalizeKitchenDesign} from './planning-pair.mjs';
import {HOME_STORAGE,KITCHEN_STORAGE} from './studio-state.mjs';
import {normalizeTourDestination} from './building-layout.mjs';
import {parseDestination} from './building-navigation.mjs';
import {openingSolar} from './solar-lighting.mjs';
import {snapshot} from './model.mjs';
export function readPersonalDistrictDesign(storage){
 const home=readHomeDesign(storage);
 // The detailed editor writes its own save. A home draft may predate it.
 let hasKitchenSave=false;try{const saved=JSON.parse(storage.getItem(KITCHEN_STORAGE)||'null');hasKitchenSave=!!saved?.settings&&typeof saved.settings==='object'&&!Array.isArray(saved.settings);}catch{}
 const kitchen=hasKitchenSave?readKitchenDesign(storage):home.kitchenDraft?normalizeKitchenDesign(home.kitchenDraft):readKitchenDesign(storage);
 return {home:{...home,solar:openingSolar(home.solar)},kitchen};
}
export function personalSelectionUrl(destination='building'){return destination==='building'?'/_personal/district.html':'/_personal/district.html?tour=0&target='+encodeURIComponent(normalizeTourDestination(destination));}
export function personalTourUrl(destination='unit:4:0'){
 return '/_personal/district.html?tour=1&target='+encodeURIComponent(normalizeTourDestination(destination));
}
export function personalTourView(search,solar){
 const query=new URLSearchParams(search);if(!query.has('target')&&query.get('tour')!=='1')return {building:'4102',mode:'building',level:9,target:'',solar};
 const target=normalizeTourDestination(query.get('target')||'unit:4:0'),parsed=parseDestination(target);
 return {building:'4102',mode:query.get('tour')==='1'?'walk':'building',level:parsed.floor??0,target:target.startsWith('floor:')?'':target,solar};
}
export function saveBeforeDistrictTour(storage,home,kitchen){
 storage.setItem(HOME_STORAGE,JSON.stringify({...home,kitchenDraft:kitchen}));
 storage.setItem(KITCHEN_STORAGE,JSON.stringify(snapshot(kitchen)));
}
