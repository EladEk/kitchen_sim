import {DocumentGate} from './DocumentAccess.jsx';
import {ArrowLeft,ArrowRight,Focus} from 'lucide-react';
import {Elevation} from './PlanViews.jsx';
import {KitchenElectricalViewControls} from './KitchenElectrical.jsx';
import {ElectricalPhoto} from './ElectricalPhoto.jsx';
import {KITCHEN_SERVICE_POINTS,KITCHEN_ELECTRICAL_PHOTOS,kitchenElectricalSelection} from './kitchen-electrical.mjs';
import {ELECTRICAL_KINDS} from './home-electrical.mjs';

function KitchenElectricalCompareContent({settings,selectedId,page,onSelect,onPage,onFocus,onViewChange}){
 const he=settings.lang==='he',t=(a,b)=>he?a:b,{point,source,wall}=kitchenElectricalSelection(selectedId,page),kind=ELECTRICAL_KINDS[point.kind],index=KITCHEN_SERVICE_POINTS.indexOf(point);
 const entries=KITCHEN_SERVICE_POINTS.flatMap(p=>p.evidence.filter(e=>e.page===source.page).map(e=>({point:p,rect:e.rect})));
 const next=step=>onSelect(KITCHEN_SERVICE_POINTS[(index+step+KITCHEN_SERVICE_POINTS.length)%KITCHEN_SERVICE_POINTS.length].id);
 return <div className="kitchen-electrical-comparison" dir={he?'rtl':'ltr'} data-selected-point={point.id}>
  {onViewChange&&<KitchenElectricalViewControls settings={settings} onChange={onViewChange}/>}
  <div className="electrical-comparison-picker"><label htmlFor="compare-electrical-point">{t('בחירת נקודה','Select point')}</label><button onClick={()=>next(-1)} aria-label={t('הנקודה הקודמת','Previous point')}><ArrowRight size={18}/></button><select id="compare-electrical-point" value={point.id} onChange={e=>onSelect(e.target.value)}>{KITCHEN_SERVICE_POINTS.map(p=><option key={p.id} value={p.id}>{p.label} · {p.relocation?(he?p.relocation.he:p.relocation.en):(he?p.he:p.en)}</option>)}</select><button onClick={()=>next(1)} aria-label={t('הנקודה הבאה','Next point')}><ArrowLeft size={18}/></button></div>
  <div className="electrical-comparison-identity" aria-live="polite"><bdi style={{background:kind.color}}>{point.label}</bdi><div><strong>{point.relocation?(he?point.relocation.he:point.relocation.en):(he?point.he:point.en)}</strong><span>{he?kind.he:kind.en}{point.relocation?t(' · העברה מוצעת, המקור נשמר בצילום',' · proposed relocation; original kept in photo'):point.identificationSource==='owner-clarification'?t(' · לפי ההבהרה שלך',' · confirmed by you'):''}</span></div></div>
  <div className="electrical-comparison-grid">
   <section className="electrical-comparison-model" aria-label={t('מיקום משוער בהדמיה','Estimated model position')}>
    <header><strong>{t('בהדמיה','In the simulator')}</strong><span>{wall==='long'?t('קיר העבודה','Work wall'):t('קיר המקרר','Fridge wall')}</span></header>
    <div className="electrical-comparison-elevation"><Elevation settings={{...settings,showElectrical:true,showWater:point.water?true:settings.showWater,selectedElectricalId:point.id,labels:false,dimensions:false,selected:null}} wall={wall} calloutBounds={{top:8,bottom:8}} onElectricalSelect={onSelect}/></div>
    <div className="electrical-comparison-model-footer"><span>{point.relocation?t('גובה מרכז מוצע','Proposed centre height'):t('גובה מרכז משוער','Estimated centre height')}: <bdi>≈ {Math.round(point.height*100)} cm</bdi></span><button onClick={()=>onFocus(point.id)}><Focus size={16}/>{point.relocation?t('פתיחת התא בתלת־ממד','Open compartment in 3D'):t('מעבר לנקודה בתלת־ממד','Open point in 3D')}</button></div>
    {point.relocation&&<p className="electrical-relocation-note">{he?point.relocation.noteHe:point.relocation.noteEn}<br/>{t('עיגול מקווקו: המקום המקורי, גובה משוער','Dashed circle: original location, estimated height')} <bdi>≈ {Math.round(point.observedHeight*100)} cm</bdi>.</p>}
   </section>
   <section className="electrical-comparison-source" aria-label={t('המיקום בצילום האמיתי','Position in the real photo')}>
    <header><strong>{t('בצילום האמיתי','In the real photo')}</strong><div className="electrical-comparison-photo-tabs">{KITCHEN_ELECTRICAL_PHOTOS.map(r=><button key={r.page} aria-pressed={source.page===r.page} onClick={()=>onPage(r.page)}>{r.page===1?t('שני הקירות','Both walls'):r.page===2?t('קיר המקרר','Fridge wall'):t('המבט הנוסף','Additional view')}</button>)}</div></header>
    <ElectricalPhoto reference={source} entries={entries} lang={settings.lang} selectedId={point.id} onSelect={onSelect}/>
    <p className="electrical-comparison-file"><bdi>{source.file}</bdi> · {t('המסגרת מדגישה את הנקודה שנבחרה בצילום המקורי.','The outline highlights the selected point in the original photo.')}</p>
    {source.page===21&&<p className="electrical-comparison-note">{he?source.noteHe:source.noteEn}</p>}
   </section>
  </div>
  <p className="electrical-comparison-note">{t('בחירה במספר מעדכנת את שני הצדדים. המיקום והגובה בהדמיה הם אומדן מהצילום; הם אינם מדידה בשטח.','Selecting an ID updates both sides. Model positions and heights are photo estimates, not site measurements.')}</p>
 </div>;
}

export function KitchenElectricalCompare(props){return <DocumentGate lang={props.lang||props.settings?.lang}><KitchenElectricalCompareContent {...props}/></DocumentGate>;}
