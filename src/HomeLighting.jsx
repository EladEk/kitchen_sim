import {LightControls} from './LightControls.jsx';
import {DesignEvidence} from './DesignEvidence.jsx';
import {useState} from 'react';
import {Lightbulb,X,Play} from 'lucide-react';
import {LIGHTING_LAYOUT,getRoom} from './home-model.mjs';
import {LIGHTING_STYLE,lightingReference,lightingVisible} from './home-lighting.mjs';
import {ElectricalPhoto} from './ElectricalPhoto.jsx';
import {KITCHEN_LIGHTING_POINTS} from './kitchen-lighting.mjs';
import './lighting.css';

export function LightingFacts({roomId,lang,settings,onChange,onInspect,compact=false}){
 const he=lang==='he',items=LIGHTING_LAYOUT.points.filter(p=>!roomId||p.roomId===roomId);
 return <section className="hs-construction-card hs-lighting-facts"><h3><Lightbulb size={16}/>{he?'תאורה לפי הצילומים':'Lighting from source photos'}</h3>
  <label className="hs-electrical-check"><input type="checkbox" checked={settings.showLighting!==false} onChange={e=>onChange('showLighting',e.target.checked)}/>{he?'הצגת נקודות התאורה':'Show lighting points'}</label>
  <p className="hs-small-note">{he?'סימון זהוב קטן, ללא כיתוב על הבית. המיקומים והגבהים משוערים; בחרו נקודה ברשימה להשוואה למקור.':'Small gold markers without labels on the home. Positions and heights are estimates; choose a point in the list to compare its source.'}</p>
  <details open={!compact}><summary>{he?'נקודות מזוהות':'Observed points'} ({items.length})</summary><div className="hs-electrical-point-list">{items.map(p=><button key={p.id} onClick={()=>onInspect(p.id,true)}><Lightbulb size={15} color={LIGHTING_STYLE.color}/><span>{he?p.he:p.en}<small>{he?getRoom(p.roomId).he:getRoom(p.roomId).en}{p.roomInferred?(he?' · שיוך משוער':' · provisional assignment'):''}</small></span></button>)}</div>
   {!items.length&&<p className="hs-small-note">{he?'אין במקורות הקיימים נקודת תאורה שניתן למקם כאן בביטחון. אין פירוש הדבר שאין תאורה בחדר.':'Available sources do not show a confidently placeable light here. This does not mean the room has no lighting.'}</p>}
  </details>{items.length>0&&<details className="planning-details"><summary>{he?'שליטה במנורות':'Individual lights'}</summary><p className="planning-note">{he?'עברו לתאורת ערב להשוואה. שינוי ידני של מנורה מפעיל את התצוגה שלה גם ביום; אין כאן חיבור למפסק פיזי.':'Compare in evening mode. A manual change also previews that light in daylight; no physical switch wiring is implied.'}</p>{items.map(p=><LightControls key={p.id} point={p} settings={settings} onChange={onChange}/>)}</details>}{!roomId&&<p className="hs-small-note">{he?'לא מוקמו נקודות ללא מקור ברור: ':'No confidently located light in: '}{LIGHTING_LAYOUT.notLocated.map(id=>he?getRoom(id).he:getRoom(id).en).join(' · ')}</p>}
 </section>;
}
export function LightingInspector({point:p,lang,onClose,settings,onChange}){
 const [index,setIndex]=useState(0),he=lang==='he',e=p.evidence[index]||p.evidence[0],reference=lightingReference(e.source);
 const entries=LIGHTING_LAYOUT.points.flatMap(q=>q.evidence.filter(a=>a.source===e.source).map(a=>({point:q,rect:a.rect})));
 return <section className="hs-inspector hs-lighting-inspector"><div className="hs-inspector-header"><Lightbulb size={18} color={LIGHTING_STYLE.color}/><div><strong>{he?p.he:p.en}</strong><small>{p.label} · {he?'מיקום משוער':'Estimated location'}</small></div><button className="hs-icon-button" aria-label={he?'סגירה':'Close'} onClick={onClose}><X size={17}/></button></div><div className="hs-inspector-body">
  <DesignEvidence item={p} settings={settings} lang={lang}/><LightControls point={p} settings={settings} onChange={onChange}/><p>{he?'שיוך בהדמיה':'Shown in'}: {he?getRoom(p.roomId).he:getRoom(p.roomId).en}{p.roomInferred?' ≈':''}</p>
  <p>{he?'גובה חיבור משוער':'Estimated connection height'}: ≈{Math.round(p.height*100)} {he?'ס״מ':'cm'}</p>
  <p className="hs-small-note">{he?'גוף או בית מנורה נראים בצילום. הקואורדינטות, גובה התקרה, אורך הכבל ומידות הגוף נאמדו להמחשה. כיפות אדומות ופתחי אוורור לא נספרו כתאורה. תאורת הערב להמחשה.':'A luminaire or lamp holder is visible in the photo. Coordinates, ceiling height, cable length and body dimensions are estimates. Red caps and vents are not counted as lights. Evening illumination is illustrative.'}</p>
  {p.evidence.length>1&&<div className="hs-electrical-evidence-tabs">{p.evidence.map((a,i)=><button key={a.source} aria-pressed={index===i} onClick={()=>setIndex(i)}>{he?'מקור':'Source'} {i+1}</button>)}</div>}
  <ElectricalPhoto reference={reference} entries={entries} lang={lang} selectedId={p.id} kinds={{lighting:LIGHTING_STYLE}}/>
  {reference.second!=null&&<a className="hs-text-link" href={`/house/photos/walkthrough.mp4#t=${reference.second}`} target="_blank" rel="noreferrer"><Play size={14}/>{he?'השוואה לסרטון':'Compare video'} · {reference.second}s</a>}
 </div></section>;
}
export function LightingPlanMarkers({points=LIGHTING_LAYOUT.points,settings,scale=30,onSelect,mini=false,roomId}){
 if(settings.cleanView)return null;
 return <g className="lighting-plan-markers">{points.filter(p=>(!roomId||p.roomId===roomId)&&lightingVisible(p,settings)).map(p=>{const x=p.position[0]*scale,z=p.position[2]*scale,r=mini?2:scale*.13,stroke=mini?.8:scale*.04;return <g key={p.id} data-lighting-id={p.id} role={onSelect&&!mini?'button':undefined} tabIndex={onSelect&&!mini?0:undefined} aria-label={settings.lang==='he'?p.he:p.en} onClick={e=>{if(mini||!onSelect)return;e.stopPropagation();onSelect(p.id);}} onKeyDown={e=>{if(!mini&&onSelect&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();onSelect(p.id);}}} pointerEvents={mini||!onSelect?'none':undefined}><title>{`${settings.lang==='he'?p.he:p.en} ≈`}</title><circle cx={x} cy={z} r={r} fill="#fff6d8" stroke={LIGHTING_STYLE.color} strokeWidth={stroke} strokeDasharray={p.roomInferred?`${stroke*2} ${stroke}`:undefined}/><path d={`M ${x-r*.5} ${z-r*.5} l ${r} ${r} m 0 ${-r} l ${-r} ${r}`} fill="none" stroke={LIGHTING_STYLE.color} strokeWidth={stroke} pointerEvents="none"/></g>;})}</g>;
}
export function KitchenLighting({settings,onChange}){
 const [selected,setSelected]=useState(null),point=KITCHEN_LIGHTING_POINTS.find(p=>p.id===selected);
 return <><LightingFacts roomId="kitchen" lang={settings.lang} settings={settings} onChange={onChange} onInspect={setSelected}/>{point&&<LightingInspector key={point.id} point={point} lang={settings.lang} settings={settings} onChange={onChange} onClose={()=>setSelected(null)}/>}</>;
}
