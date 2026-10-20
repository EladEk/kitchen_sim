import {useState} from 'react';
import {MapPin,Camera,ArrowUpRight,Minimize2,Maximize2,X,Play} from 'lucide-react';
import {ELECTRICAL_LAYOUT,WATER_LAYOUT,getRoom} from './home-model.mjs';
import {ELECTRICAL_KINDS,ELECTRICAL_REFERENCES} from './home-electrical.mjs';
import {ElectricalPhoto} from './ElectricalPhoto.jsx';
import {ELECTRICAL_ROOM_REVIEWS,electricalRoomReview} from './electrical-video-review.mjs';

const sourceFor=page=>ELECTRICAL_REFERENCES.find(s=>s.page===page);
const entriesFor=page=>[...ELECTRICAL_LAYOUT.points,...WATER_LAYOUT.points.filter(p=>p.status==='observed')].flatMap(p=>p.evidence.filter(e=>e.page===page).map(e=>({point:p,rect:e.rect})));

export function ElectricalAnnotatedPhoto({reference,lang,selectedId,onSelect}){
 return <ElectricalPhoto reference={reference} entries={entriesFor(reference.page)} lang={lang} selectedId={selectedId} onSelect={onSelect}/>;
}

export function ElectricalGallerySource({reference,lang,initialSelectedId}){
 const rows=entriesFor(reference.page),[selectedId,setSelectedId]=useState(()=>rows.some(r=>r.point.id===initialSelectedId)?initialSelectedId:null),he=lang==='he',selected=rows.find(r=>r.point.id===selectedId)?.point;
 return <div className="hs-electrical-gallery"><ElectricalAnnotatedPhoto reference={reference} lang={lang} selectedId={selectedId} onSelect={setSelectedId}/>
  <p className="hs-electrical-caption">{selected?`${selected.label} · ${he?selected.he:selected.en}`:he?'בחרו מספר על הצילום או נקודה ברשימה.':'Choose an ID on the photo or a point in the list.'}</p>
  {reference.page===21&&<p className="hs-small-note">{he?reference.noteHe:reference.noteEn}</p>}
  {!rows.length&&<p className="hs-small-note">{he?'בצילום הזה אין נקודה שניתן לזהות בביטחון; לא נוספו נקודות על סמך מיקומן הצפוי.':'No point is confidently identifiable in this photo; expected locations were not invented.'}</p>}
  <div className="hs-electrical-source-list">{rows.map(({point:p})=><button key={p.id} className={p.id===selectedId?'active':''} onClick={()=>setSelectedId(p.id)}><bdi style={{color:ELECTRICAL_KINDS[p.kind].color}}>{p.label}</bdi><span>{he?p.he:p.en}<small>{p.roomInferred?(he?'שיוך חדר משוער':'Room assignment provisional'):he?getRoom(p.roomId).he:getRoom(p.roomId).en}</small></span></button>)}</div>
  {reference.second!=null&&<a className="hs-text-link" href={`/house/photos/walkthrough.mp4#t=${reference.second}`} target="_blank" rel="noreferrer"><Play size={13}/>{he?'פתיחת הסרטון בנקודת המקור':'Open video at source time'} · {reference.second}s<ArrowUpRight size={12}/></a>}
 </div>;
}

export function ElectricalFacts({roomId,lang,settings,onChange,onInspect,onSource,compact=false}){
 const he=lang==='he',t=(a,b)=>he?a:b,all=ELECTRICAL_LAYOUT.points,items=compact?all:all.filter(p=>p.roomId===roomId),reviews=compact?ELECTRICAL_ROOM_REVIEWS:[electricalRoomReview(roomId)].filter(Boolean);
 return <section className={compact?'hs-building-facts hs-electrical-facts':'hs-construction-card hs-electrical-facts'}>
  <h3><MapPin size={16}/>{t('שקעים, מפסקים והכנות','Outlets, switches & preparations')}</h3>
  <p>{t(`${all.length} מיקומי קופסאות ואשכולות סומנו לפי התמונות והסרטון. זה אינו מספר השקעים להזמנה; אין זיהוי של מעגלים או חיווט.`,`${all.length} box and cluster locations are marked from the photos and video. This is not a socket purchase count; circuits and wiring are unidentified.`)}</p>
  <details className="electrical-video-review" open={!compact}><summary>{t('בדיקה לפי חדרים מול הסרטון','Room-by-room video review')}</summary>{reviews.map(r=><div key={r.roomId} data-reviewed-room={r.roomId}><strong>{he?getRoom(r.roomId).he:getRoom(r.roomId).en}</strong><p>{he?r.he:r.en}</p>{r.second!=null&&<a className="hs-text-link" href={`/house/photos/walkthrough.mp4#t=${r.second}`} target="_blank" rel="noreferrer"><Play size={13}/>{t('בסרטון','In video')} · <bdi>{r.second}s</bdi></a>}{r.page&&<button className="hs-text-link" onClick={()=>onSource('electrical-survey',r.page)}><Camera size={13}/>{t('צילום מסומן','Annotated source')}</button>}</div>)}</details>
  <label className="hs-electrical-check"><input type="checkbox" checked={settings.showElectrical} onChange={e=>onChange('showElectrical',e.target.checked)}/>{t('הצגת הסימונים בתוכנית ובתלת־ממד','Show markers in plan and 3D')}</label>
  <label className="hs-electrical-check"><input type="checkbox" checked={settings.electricalInferred} onChange={e=>onChange('electricalInferred',e.target.checked)}/>{t('כולל נקודות עם שיוך חדר משוער','Include provisional room assignments')}</label>
  <p className="hs-small-note">{t('מסגרת מקווקוות: שיוך החדר אינו ודאי. בחדרי הילדים והעבודה הצילומים אינם מסומנים במספר חדר. כל המיקומים והגבהים במודל משוערים; התיבה על צילום המקור מציינת את מה שנראה בפועל.','Dashed outline: room assignment is provisional. Children’s/office photos have no room number. All model positions and heights are estimated; the source-image box identifies the actual visible evidence.')}</p>
  <div className="hs-electrical-point-list">{items.map(p=><button key={p.id} onClick={()=>onInspect(p.id,true)}><bdi style={{color:ELECTRICAL_KINDS[p.kind].color}}>{p.label}</bdi><span>{he?p.he:p.en}<small>{he?ELECTRICAL_KINDS[p.kind].he:ELECTRICAL_KINDS[p.kind].en}{p.roomInferred?t(' · חדר משוער',' · provisional room'):''}</small></span><Camera size={13}/></button>)}</div>
  {!items.length&&<p className="hs-small-note">{t('לא זוהתה כאן נקודה שניתן למקם מהמקורות הקיימים. אין פירוש הדבר שאין שקעים או מפסקים בחדר.','No point can be placed here from the available evidence. This does not mean the room has no sockets or switches.')}</p>}
  <button className="hs-text-link" onClick={()=>onSource('electrical-survey',items[0]?.page||1)}><Camera size={14}/>{t('כל הצילומים והפריימים עם הסימונים','All annotated photos & video frames')}<ArrowUpRight size={12}/></button>
 </section>;
}

export function ElectricalLegend({lang,onSource}){
 const he=lang==='he';return <button className="hs-electrical-legend" onClick={onSource} title={he?'פתיחת הצילומים המסומנים':'Open annotated sources'}>{Object.values(ELECTRICAL_KINDS).map(k=><span key={k.symbol}><i style={{background:k.color}}/>{he?k.symbol==='P'?'שקע':k.symbol==='S'?'מפסק משוער':k.symbol==='W'?'מים':'הכנה':k.symbol==='P'?'Socket':k.symbol==='S'?'Possible switch':k.symbol==='W'?'Water':'Preparation'}</span>)}<span className="hs-electrical-estimate">≈ {he?'מיקום משוער':'Estimated position'}</span></button>;
}

export function ElectricalInspector({point:p,lang,minimized,onMinimize,onClose,onSource}){
 const [evidenceIndex,setEvidenceIndex]=useState(0),he=lang==='he',t=(a,b)=>he?a:b,evidence=p.evidence[evidenceIndex]||p.evidence[0],source=sourceFor(evidence.page),style=ELECTRICAL_KINDS[p.kind];
 return <div className={`hs-inspector hs-electrical-inspector ${minimized?'hs-inspector-mini':''}`}>
  <div className="hs-inspector-header"><MapPin size={17} style={{color:style.color}}/><div><strong><bdi>{p.label}</bdi> · {p.relocation?(he?p.relocation.he:p.relocation.en):(he?p.he:p.en)}</strong><small>{p.relocation?t('העברה מוצעת · המקור נשמר בצילום','Proposed relocation · original kept in photo'):p.roomInferred?t('שיוך חדר משוער','Room assignment provisional'):t('מיקום במודל משוער','Model location estimated')}</small></div><button className="hs-icon-button" aria-label={minimized?t('הרחבת הפרטים','Restore details'):t('מזעור הפרטים','Minimize details')} onClick={onMinimize}>{minimized?<Maximize2 size={15}/>:<Minimize2 size={15}/>}</button><button className="hs-icon-button" aria-label={t('סגירה','Close')} onClick={onClose}><X size={17}/></button></div>
  {!minimized&&<div className="hs-inspector-body"><p><strong style={{color:style.color}}>{he?style.he:style.en}</strong></p><p>{t('שיוך בהדמיה','Shown in')}: {he?getRoom(p.roomId).he:getRoom(p.roomId).en}{p.roomInferred?' ≈':''}</p><p>{t('גובה מרכז משוער מעל הרצפה','Assumed centre above floor')}: <bdi>≈ {Math.round(p.height*100)} cm</bdi></p><p className="hs-small-note">{t('הגובה, הקיר והמיקום לאורך הקיר נאמדו לצורכי הדמיה, ללא מדידה. סוג ההזנה, מספר המודולים והייעוד המדויק אינם מאומתים.','Height, wall assignment and position along the wall are visual estimates, without measurement. Supply type, module count and exact purpose are unverified.')}</p>
   {p.relocation&&<p className="electrical-relocation-note">{he?p.relocation.noteHe:p.relocation.noteEn}</p>}
   {p.positionNoteHe&&<p className="hs-small-note">{he?p.positionNoteHe:p.positionNoteEn}</p>}
   {p.evidence.length>1&&<div className="hs-electrical-evidence-tabs">{p.evidence.map((e,i)=><button key={`${e.page}-${i}`} className={evidenceIndex===i?'active':''} onClick={()=>setEvidenceIndex(i)}>{t('מקור','Source')} {i+1}</button>)}</div>}
   <ElectricalAnnotatedPhoto reference={source} lang={lang} selectedId={p.id}/><p className="hs-small-note">{he?source.he:source.en}{source.second!=null?` · ${source.second}s`:''}</p>
   <button className="hs-text-link" onClick={()=>onSource('electrical-survey',source.page)}><Camera size={13}/>{t('הגדלת המקור והסימונים','Enlarge source & markers')}<ArrowUpRight size={12}/></button>
  </div>}
 </div>;
}
