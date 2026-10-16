import {ALL_CABINETS} from './model.mjs';
const build=(m)=>{
 const item=(key,en,he,type='door',requires=[])=>({id:`${m.id}:${key}`,cabinetId:m.id,key,en,he,type,requires:requires.map(k=>`${m.id}:${k}`)});
 if(['drawers','hob'].includes(m.type))return ['Top drawer','Middle drawer','Bottom drawer'].map((label,i)=>item(`drawer-${i}`,label,['מגירה עליונה','מגירה אמצעית','מגירה תחתונה'][i],'drawer'));
 if(m.type==='sink')return [item('door-left','Left door','דלת שמאל'),item('door-right','Right door','דלת ימין')];
 if(m.type==='pantry')return [item('upper-door','Upper door','דלת עליונה'),item('lower-door','Lower door','דלת תחתונה')];
 if(m.type==='upper')return m.doors===2?[item('door-left','Left door','דלת שמאל'),item('door-right','Right door','דלת ימין')]:[item('door','Door','דלת')];
 if(m.type==='oven')return [item('lower-drawer-1','Upper base drawer','מגירה תחתונה עליונה','drawer'),item('lower-drawer-0','Bottom base drawer','מגירה תחתונה נמוכה','drawer'),item('oven-door','Oven door','דלת התנור'),item('oven-rack-1','Upper oven rack','רשת תנור עליונה','rack',['oven-door']),item('oven-rack-0','Lower oven rack','רשת תנור תחתונה','rack',['oven-door']),item('lift-up','HL lift-up flap','קלפה HL','lift'),item('top-door','Top cabinet door','דלת הארון העליון')];
 if(m.type==='fridge')return [item('upper-door-left','Upper left door','דלת עליונה שמאל'),item('upper-door-right','Upper right door','דלת עליונה ימין'),item('door-left','Fridge left door','דלת מקרר שמאל'),item('door-right','Fridge right door','דלת מקרר ימין'),item('bin-0','Left produce drawer','מגירת ירקות שמאל','drawer',['door-left']),item('bin-1','Right produce drawer','מגירת ירקות ימין','drawer',['door-right'])];
 if(m.type==='dishwasher')return [item('door','Dishwasher door','דלת המדיח'),item('rack-1','Upper rack','סלסלה עליונה','basket',['door']),item('rack-0','Lower rack','סלסלה תחתונה','basket',['door'])];
 if(m.type==='baskets')return [item('door','Cabinet door','דלת הארון'),...[0,1,2].map(i=>item(`basket-${i}`,['Bottom basket','Middle basket','Top basket'][i],['סלסלה תחתונה','סלסלה אמצעית','סלסלה עליונה'][i],'basket',['door']))];
 // The 500 mm bottle carriage has a single full-height front with linked levels.
 if(m.type==='pullout')return [item('front','Bottle pull-out · both levels','נשלף בקבוקים · שני מפלסים','drawer')];
 const parts=[item('door','Cabinet door','דלת הארון')];
 if(m.internalDrawers)for(let i=0;i<m.internalDrawers;i++)parts.push(item(`internal-${i}`,i?'Upper internal drawer':'Lower internal drawer',i?'מגירה פנימית עליונה':'מגירה פנימית תחתונה','drawer',['door']));
 if(m.mixerLift)parts.push(item('mixer-lift','Mixer lift','מעלית מיקסר','lift',['door']));
 return parts;
};
export const OPENINGS=ALL_CABINETS.flatMap(build);
export const OPENING_IDS=OPENINGS.map(p=>p.id);
const lookup=new Map(OPENINGS.map(p=>[p.id,p]));
export const getOpening=id=>lookup.get(id)||null;
export const getOpenings=cabinetId=>OPENINGS.filter(p=>p.cabinetId===cabinetId);
export function normalizeOpenParts(ids){return [...new Set(Array.isArray(ids)?ids.filter(id=>lookup.has(id)):[])];}
export function changeOpening(ids,id){
 const item=lookup.get(id),open=new Set(normalizeOpenParts(ids));
 if(!item)return {openParts:[...open],blockedBy:null};
 if(open.has(id)){
  const dependent=[...open].find(other=>lookup.get(other)?.requires.includes(id));
  if(dependent)return {openParts:[...open],blockedBy:dependent};
  open.delete(id);
 }else{
  const add=p=>{for(const req of p.requires)add(lookup.get(req));open.add(p.id);};add(item);
 }
 return {openParts:[...open],blockedBy:null};
}
