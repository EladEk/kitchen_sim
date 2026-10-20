import React,{useEffect,useState} from 'react';
import {Eye,Info,Minimize2,Maximize2,X} from 'lucide-react';
import {OpeningControls} from './OpeningControls.jsx';
import {HOOD} from './appliances.mjs';

export function CabinetPanel({selected,spec,openParts,activePart,inspecting,lang,onToggle,onInspect,onHoodDetail,onSpec,onClose}){
 const [minimized,setMinimized]=useState(false);
 const he=lang==='he',t=(en,iw)=>he?iw:en,collapsed=inspecting&&minimized;
 // Opening a part in the same cabinet keeps the panel minimized and the camera fixed.
 useEffect(()=>setMinimized(false),[selected.id,inspecting]);
 return <aside className={`selection-card glass-cabinet-panel ${collapsed?'is-minimized':''}`} aria-label={t('Cabinet controls','שליטה בחלקי הארון')}>
  <div className="selection-card-content">
   <small>{collapsed?t('CABINET CONTROLS · MINIMIZED','בקרת ארון · ממוזערת'):t('SELECTED CABINET','הארון הנבחר')}</small>
   <strong>{he?selected.he:selected.name}</strong>
   {collapsed?<span className="minimized-panel-hint">{t('Click parts in 3D · restore for controls','לחצו על החלק בתלת־ממד · הרחיבו לכפתורים')}</span>:<div id="cabinet-opening-panel" className="cabinet-panel-body">
    <span className="cabinet-panel-dimensions" dir="ltr">{selected.w.toLocaleString()} × {selected.h.toLocaleString()} × {selected.d} mm <em>W × H × D</em></span>
    {selected.id==='sink'&&<span className="cabinet-sink-model">SCHOCK Vegas 70 · {t('Casablanca 98','קזבלנקה 98')} · <bdi>69 × 52 × 22 cm</bdi></span>}
    <OpeningControls cabinetId={selected.id} openParts={openParts} activePart={activePart} onToggle={onToggle} lang={lang}/>
    <div className="cabinet-open-actions">
     {!inspecting&&<button onClick={()=>onInspect(selected.id)}><Eye size={12}/>{t('Inspect cabinet','מבט פנימה')}</button>}
     {inspecting&&selected.id===HOOD.cabinetId&&<button onClick={onHoodDetail}><Eye size={12}/>{t('Hood underside','הקולט מלמטה')}</button>}
     {spec&&<button className="cabinet-spec-link" onClick={onSpec}><Info size={13}/><span>{t('Specification','מפרט')}</span></button>}
    </div>
   </div>}
  </div>
  <span className="selection-card-tools">
   {inspecting&&<button className="icon-button cabinet-panel-toggle" onClick={()=>setMinimized(v=>!v)} aria-expanded={!collapsed} aria-controls="cabinet-opening-panel" aria-label={collapsed?t('Restore cabinet controls','הרחבת חלונית הארון'):t('Minimize cabinet controls','מזעור חלונית הארון')} title={collapsed?t('Restore controls','הרחבת החלונית'):t('Minimize controls','מזעור החלונית')}>{collapsed?<Maximize2 size={16}/>:<Minimize2 size={16}/>}</button>}
   <button className="icon-button" onClick={onClose} aria-label={t('Close cabinet details','סגירת פרטי הארון')} title={t('Close cabinet details','סגירת פרטי הארון')}><X size={15}/></button>
  </span>
 </aside>;
}
