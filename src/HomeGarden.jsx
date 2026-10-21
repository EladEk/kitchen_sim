import {PanelTop,Ruler,ArrowUpRight,Layers,Camera,Eye,EyeOff} from 'lucide-react';
import {GARDEN_LAYOUT,SERVICE_YARD,yardForSettings} from './home-model.mjs';

export function GardenDesignFacts({lang,onInspect,onSource,settings,onRoof,onEdit,compact=false}){
 const he=lang==='he',t=(a,b)=>he?a:b,L=yardForSettings(settings).garden,edited=!!settings?.yardDesign?.pergola;
 return <section className={compact?'hs-building-facts hs-garden-facts':'hs-construction-card hs-garden-facts'}>
  <h3><PanelTop size={16}/>{t('הגינה לפי העדכון שלך','Your updated garden')}</h3>
  <p>{edited?t('הפרגולה מוצגת במידות ובמיקום שבחרת, בתוך רצועת המשך הריצוף. הריצוף הקיים וקו המרפסת שמעל נשמרים.','Your pergola dimensions and position stay inside the paving-extension strip. Existing paving and the upstairs balcony edge remain unchanged.'):t('הריצוף ממשיך ישר מהמשטח הקיים עד הגדר. הפרגולה מתחילה בקצה המרפסת שמעל, באותו רוחב.','Paving continues straight from the existing terrace to the fence. The pergola starts at the upstairs balcony edge, at the same width.')}</p>
  <div className="hs-garden-measures">
   {[
    ['garden-pergola',edited?t('פרגולה מתוכננת','Planned pergola'):t('פרגולה בגוון קרם','Cream pergola'),`≈ ${L.width.toFixed(2)} × ${L.depth.toFixed(2)} m`,`${t('שטח','Area')} ≈ ${L.pergolaArea.toFixed(1)} m²`],
    ['garden-paving',t('תוספת ריצוף','Added paving'),`≈ ${L.pavingArea.toFixed(1)} m²`,t('אריחים 15×60 ס״מ','15×60 cm tiles')],
    ['fence-west',settings?.yardDesign?.fence?t('גדר שלבים — בחירת התכנון שלך','Slatted fence — your design'):t('גדר אופקית אפורה','Grey horizontal fence'),`${t('גובה כולל','Overall height')} ${Math.round(L.fence.height*100)} cm`,`${Math.round(L.fence.panel*100)} cm ${t('פנל + בסיס משוער 30 ס״מ','panel + assumed 30 cm base')}`]
   ].map(([id,name,value,detail])=><button key={id} onClick={()=>onInspect(id)}><span><strong>{name}</strong><small>{detail}</small></span><bdi>{value}</bdi><Ruler size={14}/></button>)}
  </div>
  {onEdit&&<button className="hs-simple-edit-item" onClick={onEdit}>{t('עריכת תכנון החצר','Edit yard design')}</button>}
  {onRoof&&<button className="hs-text-link" aria-pressed={settings.pergolaRoof} onClick={onRoof}>{settings.pergolaRoof?<EyeOff size={14}/>:<Eye size={14}/>}<span>{settings.pergolaRoof?t('הסתרת הגגות למבט פנימה','Hide roofs to look inside'):t('הצגת גגות המרפסת והפרגולה','Show balcony and pergola roofs')}</span></button>}
  <p className="hs-small-note">{t('≈ הערכה מהתוכנית, לפני מדידה בשטח. הגובה ופריסת הקורות והעמודים להמחשה.','≈ Plan-based estimate, pending site measurement. Heights, beams and posts are illustrative.')}</p>
  <button className="hs-text-link" onClick={()=>onSource('garden-design',4)}><Camera size={14}/>{t('תמונות החוץ ודוגמאות העיצוב','Exterior photos & design examples')}<ArrowUpRight size={13}/></button>
  <button className="hs-text-link" onClick={()=>onSource('plan',1)}><Layers size={14}/>{t('קו הקומה שמעל בתוכנית','Upper-floor line in the plan')}<ArrowUpRight size={13}/></button>
 </section>;
}

export function ServiceYardFacts({lang,onInspect,onSource,settings,onEdit,compact=false}){
 const he=lang==='he',t=(a,b)=>he?a:b,s=yardForSettings(settings).service.shed,edited=!!settings?.yardDesign?.shed;
 return <section className={compact?'hs-building-facts hs-garden-facts':'hs-construction-card hs-garden-facts'}>
  <h3><Ruler size={16}/>{t('מחסן וגישה לבור הביוב','Shed & chamber access')}</h3>
  {onEdit&&<button className="hs-simple-edit-item" onClick={onEdit}>{t('עריכת המחסן בחצר','Edit yard shed')}</button>}
  <p>{edited?t('מידות ומיקום המחסן לפי הבחירה שלך בסימולטור. אזורי הגישה המסומנים נשמרים פנויים.','Shed dimensions and position follow your simulated design. Marked access zones stay clear.'):t('המחסן קוצר כדי לפנות את חזית מנועי המזגן: 2.5 מ׳ לאורך הגדר ו־2 מ׳ לכיוון הבית. הוא מסתיים לפני אזור הגישה לבור ונמצא מחוץ לרוחב חלון הממ״ד.','The shed was shortened to leave the outdoor AC frontage clear: 2.5 m along the fence and 2 m toward the house. It ends before the chamber access area and lies outside the safe-room window width.')}</p>
  <div className="hs-garden-measures">
   <button onClick={()=>onInspect('garden-shed',true)}><span><strong>{t('מחסן מוצע · מידות חוץ','Proposed shed · external size')}</strong><small>{`${(s.w*s.d).toFixed(1)} m² · ${t('פנים משוער','Assumed inside')} ${Math.round((s.w-.12)*100)}×${Math.round((s.d-.12)*100)} cm`}</small></span><bdi>{s.d.toFixed(2)} × {s.w.toFixed(2)} m</bdi><Ruler size={14}/></button>
   <button onClick={()=>onInspect('service-manhole',true)}><span><strong>{t('בור ביוב / ניקוז','Sewage / drainage chamber')}</strong><small>{t('מרכז לפי סמל המקור · קוטר טרם נמדד','Centre from original symbol · lid not measured')}</small></span><Ruler size={14}/></button>
   <button onClick={()=>onInspect('safe-window-clearance',true)}><span><strong>{t('חלון הממ״ד — חזית פנויה','Safe-room window — clear frontage')}</strong><small>{`${t('מהקיר לצד המחסן','Wall to shed side')} ≈${s.passage.toFixed(2)} m`}</small></span><Ruler size={14}/></button>
   {s.appliances.map(a=><button key={a.id} onClick={()=>onInspect(a.id,true)}><span><strong>{he?a.he:a.en}</strong><small>{t('מידת תכנון, ללא זיהוי דגם','Planning envelope, model unknown')}</small></span><bdi>≈ 65×70×185 cm</bdi><Ruler size={14}/></button>)}
  </div>
  <p className="hs-small-note">{edited?t('רוחב מהקיר אינו מעבר פנוי מול המזגנים; מידות המזגנים ודרישות האוורור דורשות אימות לפי הדגמים בפועל.','Wall-to-shed span is not clear passage across the AC units; actual models and ventilation allowances need confirmation.'):t('שתי יחידות המזגן בולטות מהקיר לפני המחסן. אין לפרש את 1.25 מ׳ כמעבר חופשי מול המזגנים. הדלת נפתחת פנימה, בציר ימני. מרווחי ההתקנה מחייבים בדיקה לפי הדגמים בפועל.','Both AC units project from the wall before the shed. The 1.25 m span is not a clear aisle across the AC frontage. The door opens inward on its right hinge. Installation clearances need checking against the actual models.')}</p>
  <p className="hs-small-note">{t('בתמונות החדשות לא זוהה מכסה ביוב בוודאות. מיקום הבור בהדמיה מבוסס על התוכנית.','No chamber lid is confidently identified in the new photos. The chamber position in the model follows the plan.')}</p>
  <p className="hs-small-note">{t('ריבוע הגישה 160×160 ס״מ הוא מרווח תכנון מוצע בלבד. יש לאמת את הבור בשטח לפני הזמנת המחסן.','The 160×160 cm access square is a proposed planning allowance only. Confirm the chamber on site before ordering the shed.')}</p>
  <p>{t('למקרר ולמקפיא: מחסן יבש ומאוורר, התאמה לטמפרטורת הסביבה ומרווחים לפי הוראות שני הדגמים. פתחי האוורור המצוירים אינם חישוב אוורור.','For the refrigerator and freezer: a dry, ventilated shed, suitable ambient temperature and the clearances required by both models. Drawn vents are not a ventilation calculation.')}</p>
  <button className="hs-text-link" onClick={()=>onSource('service-yard',3)}><Layers size={14}/>{t('תמונות החצר, התוכנית והמקרא','Yard photos, source plan & legend')}<ArrowUpRight size={13}/></button>
  <a className="hs-text-link" href="https://www.beko.com/mm-en/Support/help-center1/fridge-freezer/installing/faq/how-much-space-should-i-leave-around-my-refrigerator-for-ventilation" target="_blank" rel="noreferrer">{t('דוגמת הוראות יצרן — מרווחי אוורור','Manufacturer example — ventilation clearance')}<ArrowUpRight size={12}/></a>
  <a className="hs-text-link" href="https://www.liebherr.com/en-ie/fridges-freezers/faq-gb-3651042" target="_blank" rel="noreferrer">{t('דוגמת הוראות יצרן — סיווג אקלימי','Manufacturer example — climate class')}<ArrowUpRight size={12}/></a>
 </section>;
}
