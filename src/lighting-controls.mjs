import {ALL_LIGHTING_DEFINITIONS} from './home-lighting.mjs';
const ids=new Set(ALL_LIGHTING_DEFINITIONS.map(p=>p.id));
export function normalizeLightControls(value){
 const result={};if(!value||typeof value!=='object')return result;
 for(const [id,p] of Object.entries(value)){if(!ids.has(id)||!p||typeof p!=='object')continue;
  result[id]={enabled:p.enabled!==false,brightness:Number.isFinite(p.brightness)?Math.max(0,Math.min(100,p.brightness)):75,kelvin:[2700,3000,4000,6500].includes(p.kelvin)?p.kelvin:4000};
 }return result;
}
export const lightControl=(settings,id)=>normalizeLightControls(settings.lightControls)[id]||{enabled:true,brightness:75,kelvin:4000};
export const lightColour=kelvin=>({2700:'#ffce85',3000:'#ffe2b1',4000:'#fff1df',6500:'#e3eeff'}[kelvin]||'#fff1df');
export function lightOutput(settings,id){const p=lightControl(settings,id);return {...p,color:lightColour(p.kelvin),power:p.enabled&&settings.lampsOn!==false?p.brightness/75:0};}
