import {useState} from 'react';
import {MapPin,Camera,Minimize2,Maximize2,X} from 'lucide-react';
import {KITCHEN_ELECTRICAL_POINTS,KITCHEN_WATER_POINTS,KITCHEN_SERVICE_POINTS,kitchenElectricalElevation} from './kitchen-electrical.mjs';
import {ELECTRICAL_KINDS} from './home-electrical.mjs';
import {WaterPointDetails,WaterPlanMarkers,WaterGlyph} from './WaterPoints.jsx';
import {waterVisible} from './home-water.mjs';
import {CABINET_VISIBILITY,cabinetVisibility,electricalLabelsVisible} from './kitchen-visibility.mjs';


export function KitchenElectricalSidebar({lang,visible,selectedId,onToggle,onInspect,onSource,settings,onViewChange}){
 const he=lang==='he',t=(a,b)=>he?a:b;
 return <section className="control-section kitchen-electrical-sidebar"><div className="section-label">{t('שקעים, מפסקים ומים','OUTLETS, SWITCHES & WATER')}<span>{KITCHEN_SERVICE_POINTS.length}</span></div>
  <label className="kitchen-electrical-check"><input type="checkbox" checked={visible} onChange={onToggle}/>{t('הצגת שכבת התשתיות','Show services layer')}</label>
  {settings&&<KitchenElectricalViewControls settings={settings} onChange={onViewChange}/>}
  <p>{t('לצפייה בשקעים שמאחורי הארונות אפשר לבחור ארונות חצי שקופים או מוסתרים. שמות מוצגים רק אם מפעילים אותם. מראה האביזרים להמחשה; הגבהים והמיקומים משוערים.','Choose translucent or hidden cabinets to see the sockets behind them. Names are optional. Fitting appearance is illustrative; heights and positions are estimated.')}</p>
  <div className="kitchen-electrical-list">{KITCHEN_SERVICE_POINTS.map(p=><button key={p.id} aria-pressed={selectedId===p.id} onClick={()=>onInspect(p.id,true)}><bdi style={{color:ELECTRICAL_KINDS[p.kind].color}}>{p.label}</bdi><span>{p.relocation?(he?p.relocation.he:p.relocation.en):(he?p.he:p.en)}</span><MapPin size={13}/></button>)}</div>
  <button className="text-link" onClick={()=>onSource(1)}><Camera size={13}/>{t('תמונות המטבח עם הסימונים','Annotated kitchen photos')}</button>
 </section>;
}

export function KitchenElectricalViewControls({settings,onChange,selectedId,onSelect,pointPicker=false}){
 const he=settings.lang==='he',t=(a,b)=>he?a:b;
 return <div className="electrical-view-controls" aria-label={t('תצוגת שקעים וארונות','Outlet and cabinet display')}>
  <label className="electrical-labels-toggle"><input type="checkbox" checked={electricalLabelsVisible(settings)} onChange={e=>onChange('showElectricalLabels',e.target.checked)}/><span>{t('שמות הנקודות','Point names')}</span></label>
  <label className="electrical-labels-toggle"><input type="checkbox" checked={settings.showWater!==false} onChange={e=>onChange('showWater',e.target.checked)}/><span>{t('מים בכחול','Blue water points')}</span></label><label className="electrical-cabinet-picker"><span>{t('ארונות','Cabinets')}</span><select aria-label={t('תצוגת ארונות המטבח','Kitchen cabinet visibility')} value={cabinetVisibility(settings)} onChange={e=>onChange('cabinetVisibility',e.target.value)}>{CABINET_VISIBILITY.map(mode=><option key={mode} value={mode}>{mode==='solid'?t('רגיל','Normal'):mode==='translucent'?t('חצי שקוף','Translucent'):t('מוסתר','Hidden')}</option>)}</select></label>
  {pointPicker&&<select className="electrical-point-picker" aria-label={t('בחירת נקודת תשתית','Select services point')} value={selectedId||''} onChange={e=>onSelect(e.target.value)}><option value="" disabled>{t('בחירת נקודה…','Select a point…')}</option>{KITCHEN_SERVICE_POINTS.filter(p=>!p.water||settings.showWater!==false).map(p=><option key={p.id} value={p.id}>{p.label} · {p.relocation?(he?p.relocation.he:p.relocation.en):(he?p.he:p.en)}</option>)}</select>}
 <div className="services-color-key" aria-label={t('מקרא צבעי תשתיות','Services color key')}>{[['outlet','שקעים','Sockets'],['control','מפסקים','Switches'],['water','מים','Water'],['preparation','הכנה לא מזוהה','Unidentified']].map(([kind,iw,en])=><span key={kind}><i style={{background:ELECTRICAL_KINDS[kind].color}}/>{t(iw,en)}</span>)}</div>
 </div>;
}

export function KitchenElectricalPanel({point:p,lang,onSource,onFocus,onClose}){
 const [minimized,setMinimized]=useState(false),he=lang==='he',t=(a,b)=>he?a:b,k=ELECTRICAL_KINDS[p.kind];
 return <aside className={`selection-card glass-cabinet-panel kitchen-electrical-panel ${minimized?'is-minimized':''}`} aria-label={t('פרטי נקודת תשתית','Services point details')}>
  <div className="selection-card-content"><small><bdi>{p.label}</bdi> · {p.relocation?t('העברה מוצעת','PROPOSED RELOCATION'):p.water?t('נקודת מים','WATER POINT'):t('נקודה מהצילומים','OBSERVED POINT')}</small><strong>{p.relocation?(he?p.relocation.he:p.relocation.en):(he?p.he:p.en)}</strong>{!minimized&&<div className="kitchen-electrical-panel-body">{p.water?<><WaterPointDetails point={p} lang={lang}/><button className="electrical-compare-button" onClick={()=>onSource(p.page)}><Camera size={13}/>{t('השוואת נקודת המים לצילום ולמודל','Compare water point with photo and model')}</button></>:<><p style={{color:k.color}}>{he?k.he:k.en}{p.identificationSource==='owner-clarification'?t(' · לפי ההבהרה שלך',' · confirmed by you'):''}</p><dl><div><dt>{p.relocation?t('גובה מרכז מוצע','Proposed centre height'):t('גובה מרכז משוער','Assumed centre height')}</dt><dd><bdi>≈ {Math.round(p.height*100)} cm</bdi></dd></div><div><dt>{t('מיקום','Location')}</dt><dd>{p.relocation?t('דופן בתא הקלפה שמעל לתנור','Side of lift-up compartment above oven'):p.wall==='long'?t('קיר העבודה','Work wall'):t('קיר המקרר','Fridge wall')}</dd></div></dl><p>{p.relocation?(he?p.relocation.noteHe:p.relocation.noteEn):t('המיקום והגובה במודל נאמדו מהצילומים. סוג ההזנה, המעגל והייעוד המדויק אינם מאומתים.','Model placement and height are estimated from the photos. Supply, circuit and exact purpose are unverified.')}</p>{p.relocation&&<button className="electrical-compare-button" onClick={()=>onFocus(p.id)}>{t('פתיחת התא והצגת הגישה לחיבור','Open compartment to view access')}</button>}<button className="electrical-compare-button" onClick={()=>onSource(p.page)}><Camera size={13}/>{t('צילום מקור והשוואת מיקום','Compare with real photo')}</button></>}</div>}</div>
  <div className="selection-card-tools"><button className="icon-button cabinet-panel-toggle" onClick={()=>setMinimized(v=>!v)} aria-label={minimized?t('הרחבת הפרטים','Restore details'):t('מזעור הפרטים','Minimize details')}>{minimized?<Maximize2 size={15}/>:<Minimize2 size={15}/>}</button><button className="icon-button" onClick={onClose} aria-label={t('סגירה','Close')}><X size={16}/></button></div>
 </aside>;
}

export function KitchenElectricalPlan({settings,onSelect}){
 if(!settings.showElectrical)return null;
 return <g className="kitchen-electrical-plan">{KITCHEN_ELECTRICAL_POINTS.map(p=><ElectricalFixtureGlyph key={p.id} point={p} x={p.position[0]*1000} y={p.position[2]*1000} settings={settings} onSelect={onSelect}/>)}<WaterPlanMarkers points={KITCHEN_WATER_POINTS} settings={settings} scale={1000} onSelect={onSelect}/></g>;
}
export function KitchenElectricalElevation({settings,wall,onSelect}){
 if(!settings.showElectrical)return null;
 return <g className="kitchen-electrical-elevation">{kitchenElectricalElevation(wall).map(({point:p,x,y})=><ElectricalFixtureGlyph key={p.id} point={p} x={x} y={y} settings={settings} onSelect={onSelect}/>)}{KITCHEN_WATER_POINTS.filter(p=>p.wall===wall&&waterVisible(p,settings)).map(p=><WaterGlyph key={p.id} point={p} x={p.position[0]*1000} y={2600-p.height*1000} lang={settings.lang} onSelect={e=>{e.stopPropagation();onSelect?.(p.id);}}/>)}</g>;
}
export function ElectricalFixtureGlyph({point:p,x,y,settings,onSelect}){
 const selected=settings.selectedElectricalId===p.id,label=`${p.label} · ${settings.lang==='he'?p.he:p.en}`,width=p.width*1000;
 return <g className="electrical-fixture-glyph" data-electrical-id={p.id} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={label} onClick={e=>{e.stopPropagation();onSelect?.(p.id);}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onSelect?.(p.id);}}}>
  <title>{label}</title><rect x={x-width/2} y={y-42.5} width={width} height="85" rx="7" fill={ELECTRICAL_KINDS[p.kind].color} stroke={selected?'#27352e':'#ffffff'} strokeWidth={selected?7:4}/>
  {p.kind==='outlet'?(width>120?[-33,33]:[0]).map(dx=><g key={dx}><circle cx={x+dx} cy={y} r="25" fill="#f3f4ef" stroke="#b5bdb4" strokeWidth="2"/>{[[-10,8],[10,8],[0,-13]].map(([a,b],i)=><circle key={i} cx={x+dx+a} cy={y+b} r="3.8" fill="#34463b"/>)}</g>):p.kind==='control'?<rect x={x-17} y={y-26} width="34" height="52" rx="3" fill="#e2e6dd" stroke="#b5bdb4" strokeWidth="2"/>:<circle cx={x} cy={y} r="7" fill="#748378"/>}
  {electricalLabelsVisible(settings)&&<text x={x} y={y-65} textAnchor="middle" fontSize="44" fill="#516a59">{p.label}</text>}
 </g>;
}
