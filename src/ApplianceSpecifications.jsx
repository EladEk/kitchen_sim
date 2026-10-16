import React from 'react';
import {ArrowUpRight,Info} from 'lucide-react';
import {HOB,HOOD,appliancePlacement} from './appliances.mjs';

export function ApplianceSpecifications({lang,onSource}){
 const he=lang==='he',t=(en,iw)=>he?iw:en,fit=appliancePlacement();
 const rows=(items)=><dl>{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>;
 return <section className="appliance-specifications">
  <h3>{t('Your ordered appliances','המכשירים שהזמנת')}</h3>
  <div className="appliance-cards">
   <article><small>SIEMENS · iQ700</small><h4>{HOB.model}</h4><p>FlexInduction Plus</p>
    {rows([[t('Width × depth × height','רוחב × עומק × גובה'),'812 × 520 × 51 mm'],[t('Cooking areas','אזורי בישול'),t('4 areas · 2 extended Flex zones','4 אזורים · 2 אזורי Flex מורחבים')],[t('Cutout range · W × D','טווח פתח · רוחב × עומק'),'750–780 × 490–500 mm'],[t('Rated power','הספק נקוב'),'7,400 W']])}
    <div className="appliance-source-links"><button className="text-link" onClick={()=>onSource(HOB.source)}>{t('Your spec sheet','המפרט שצירפת')}<ArrowUpRight size={13}/></button><a className="text-link" href={HOB.url} target="_blank" rel="noreferrer">Siemens<ArrowUpRight size={13}/></a></div>
   </article>
   <article><small>ELICA · 1:1 MANUFACTURER DIMENSIONS</small><h4>{HOOD.model}</h4><p>{t('Rebuilt from Elica’s dimensioned 90 cm drawing','נבנה מחדש לפי שרטוט היצרן הממוספר לגרסת 90 ס״מ')}</p>
    {rows([[t('Frame · W × D','מסגרת · רוחב × עומק'),'894 × 310 mm'],[t('Mounting pan · W × H','גוף התקנה · רוחב × גובה'),'862 × 60 mm'],[t('Motor · W × D × H','מנוע · רוחב × עומק × גובה'),'305 × 269.8 × 278.8 mm'],[t('Body / including collar','גובה גוף / כולל צוואר יציאה'),'338.8 / 361.3 mm'],[t('Outlet / rear centreline offset','קוטר יציאה / מרחק ציר מהגב'),'150 / 102.7 mm'],[t('Filters / controls / lighting','מסננים / שליטה / תאורה'),t('Two metal cassettes · rotary · two LEDs','שתי מחסניות מתכת · פקד סיבובי · שתי נורות LED')]])}
    <div className="appliance-source-links"><button className="text-link" onClick={()=>onSource(HOOD.drawingSource)}>{t('Dimension drawing','שרטוט מידות')}<ArrowUpRight size={13}/></button><button className="text-link" onClick={()=>onSource('appliance-hood-reference')}>{t('Actual product photo','צילום הדגם המקורי')}<ArrowUpRight size={13}/></button><a className="text-link" href="/plans/elica-boxin-lx-90.pdf" target="_blank" rel="noreferrer">{t('Elica PDF','PDF היצרן')}<ArrowUpRight size={13}/></a></div>
    <p className="appliance-detail-accuracy">{t('The numbered dimensions are modelled at 1:1 scale. Undimensioned lamp, filter, latch and screw details follow the product photo; their fine geometry is not factory CAD. Stainless finish shown.','המידות הממוספרות ממודלות בקנה מידה 1:1. פרטי הנורות, המסננים, התפסים והברגים שאינם ממוספרים מבוססים על צילום המוצר; הגאומטריה העדינה אינה קובץ CAD של המפעל. מוצג גימור נירוסטה.')}</p>
   </article>
  </div>
  <div className="appliance-fit-note"><Info size={16}/><div><strong>{t('Fit in your plan','התאמה לתוכנית שלך')}</strong><p>{t(`The upper cabinet centre remains ${fit.centerOffset} mm right of the hob centre. The 862 mm mounting pan fits between the illustrated 18 mm sides. The motor is 305 mm wide, leaving storage beside it. The Ø150 mm pipe passes through Ø160 mm shelf openings.`,`מרכז הארון העליון נשאר ${fit.centerOffset} מ״מ ימינה ממרכז הכיריים. גוף ההתקנה ברוחב 862 מ״מ נכנס בין הדפנות המוצגות בעובי 18 מ״מ. רוחב המנוע 305 מ״מ, ולכן נשאר חלל בצדדיו. צינור בקוטר 150 מ״מ עובר בפתחי מדף בקוטר 160 מ״מ.`)}</p><p>{t('The appliance’s dimensioned envelope is distinct from the installation: cabinet mounting, shelf alterations, exhaust routing and the hob’s 780 × 500 mm preview opening still need the final installation layout.','מידות מעטפת המכשיר נפרדות מפרטי ההתקנה: עיגון בארון, שינוי המדפים, תוואי הפליטה ופתח הכיריים המוצג בגודל 780 × 500 מ״מ עדיין תלויים בתוכנית ההתקנה הסופית.')}</p></div></div>
 </section>;
}
