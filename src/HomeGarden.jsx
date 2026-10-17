import {PanelTop,Ruler,ArrowUpRight,Layers,Camera,Eye,EyeOff} from 'lucide-react';
import {GARDEN_LAYOUT} from './home-model.mjs';

export function GardenDesignFacts({lang,onInspect,onSource,settings,onRoof,compact=false}){
 const he=lang==='he',t=(a,b)=>he?a:b,L=GARDEN_LAYOUT;
 return <section className={compact?'hs-building-facts hs-garden-facts':'hs-construction-card hs-garden-facts'}>
  <h3><PanelTop size={16}/>{t('הגינה לפי העדכון שלך','Your updated garden')}</h3>
  <p>{t('הריצוף ממשיך ישר מהמשטח הקיים עד הגדר. הפרגולה מתחילה בקצה המרפסת שמעל, באותו רוחב.','Paving continues straight from the existing terrace to the fence. The pergola starts at the upstairs balcony edge, at the same width.')}</p>
  <div className="hs-garden-measures">
   {[
    ['garden-pergola',t('פרגולה בגוון קרם','Cream pergola'),`≈ ${L.width.toFixed(2)} × ${L.depth.toFixed(2)} m`,`${t('שטח','Area')} ≈ ${L.pergolaArea.toFixed(1)} m²`],
    ['garden-paving',t('תוספת ריצוף','Added paving'),`≈ ${L.pavingArea.toFixed(1)} m²`,t('אריחים 15×60 ס״מ','15×60 cm tiles')],
    ['fence-west',t('גדר אופקית אפורה','Grey horizontal fence'),t('גובה כולל 150 ס״מ','Overall height 150 cm'),t('120 ס״מ פנל + בסיס משוער 30 ס״מ','120 cm panel + assumed 30 cm base')]
   ].map(([id,name,value,detail])=><button key={id} onClick={()=>onInspect(id)}><span><strong>{name}</strong><small>{detail}</small></span><bdi>{value}</bdi><Ruler size={14}/></button>)}
  </div>
  {onRoof&&<button className="hs-text-link" aria-pressed={settings.pergolaRoof} onClick={onRoof}>{settings.pergolaRoof?<EyeOff size={14}/>:<Eye size={14}/>}<span>{settings.pergolaRoof?t('הסתרת הגגות למבט פנימה','Hide roofs to look inside'):t('הצגת גגות המרפסת והפרגולה','Show balcony and pergola roofs')}</span></button>}
  <p className="hs-small-note">{t('≈ הערכה מהתוכנית, לפני מדידה בשטח. הגובה ופריסת הקורות והעמודים להמחשה.','≈ Plan-based estimate, pending site measurement. Heights, beams and posts are illustrative.')}</p>
  <button className="hs-text-link" onClick={()=>onSource('garden-design',4)}><Camera size={14}/>{t('תמונות החוץ ודוגמאות העיצוב','Exterior photos & design examples')}<ArrowUpRight size={13}/></button>
  <button className="hs-text-link" onClick={()=>onSource('plan',1)}><Layers size={14}/>{t('קו הקומה שמעל בתוכנית','Upper-floor line in the plan')}<ArrowUpRight size={13}/></button>
 </section>;
}
