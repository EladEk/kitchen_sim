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
 return <section className="hs-construction-card hs-lighting-facts"><h3><Lightbulb size={16}/>{he?'גופי ונקודות תאורה':'Fixtures and lighting points'}</h3>
  <label className="hs-electrical-check"><input type="checkbox" checked={settings.showLighting!==false} onChange={e=>onChange('showLighting',e.target.checked)}/>{he?'הצגת גופי התאורה':'Show lighting fixtures'}</label>
  <p className="hs-small-note">{he?'זהב: נקודה מתועדת. סגול: מנורה זמנית בסימולטור, שתוחלף לפי תיעוד אמיתי עתידי. בכל בית מנורה מתועד נוספה נורה להדמיה. המיקומים והגבהים משוערים.':'Gold: documented connection. Purple: temporary simulator lamp awaiting real documentation. Each documented holder has an illustrative bulb. Positions and heights are estimates.'}</p>
  <details open={!compact}><summary>{he?'רשימת המנורות':'Lamp list'} ({items.length})</summary><div className="hs-electrical-point-list">{items.map(p=><button key={p.id} onClick={()=>onInspect(p.id,true)}><Lightbulb size={15} color={p.simulation?'#8a65ac':LIGHTING_STYLE.color}/><span>{he?p.he:p.en}<small>{he?getRoom(p.roomId).he:getRoom(p.roomId).en}{p.roomInferred?(he?' · שיוך משוער':' · provisional assignment'):''}{p.simulation?(he?' · זמנית ללא תיעוד':' · temporary, undocumented'):''}</small></span></button>)}</div>
   {!items.length&&<p className="hs-small-note">{he?'אין במקורות הקיימים נקודת תאורה שניתן למקם כאן בביטחון. אין פירוש הדבר שאין תאורה בחדר.':'Available sources do not show a confidently placeable light here. This does not mean the room has no lighting.'}</p>}
  </details>{items.length>0&&<details className="planning-details"><summary>{he?'שליטה במנורות':'Individual lights'}</summary><p className="planning-note">{he?'ברירת מחדל 4000K. בחרו „מנורות בלבד” להשוואה בחושך. אין כאן חיבור למפסק פיזי.':'Default 4000K. Choose Lamps only to compare in darkness. No physical switch wiring is implied.'}</p>{items.map(p=><LightControls key={p.id} point={p} settings={settings} onChange={onChange}/>)}</details>}{!roomId&&<p className="hs-small-note">{he?'מנורות זמניות ללא תיעוד: ':'Temporary lamps awaiting documentation: '}{LIGHTING_LAYOUT.notLocated.map(id=>he?getRoom(id).he:getRoom(id).en).join(' · ')}</p>}
 </section>;
}
export function LightingInspector({point:p,lang,onClose,settings,onChange}){
 const [index,setIndex]=useState(0),he=lang==='he',e=p.evidence[index]||p.evidence[0],reference=e?lightingReference(e.source):null;
 const entries=e?LIGHTING_LAYOUT.points.flatMap(q=>q.evidence.filter(a=>a.source===e.source).map(a=>({point:q,rect:a.rect}))):[];
 return <section className="hs-inspector hs-lighting-inspector"><div className="hs-inspector-header"><Lightbulb size={18} color={LIGHTING_STYLE.color}/><div><strong>{he?p.he:p.en}</strong><small>{p.label} · {he?'מיקום משוער':'Estimated location'}</small></div><button className="hs-icon-button" aria-label={he?'סגירה':'Close'} onClick={onClose}><X size={17}/></button></div><div className="hs-inspector-body">
  <DesignEvidence item={p} settings={settings} lang={lang}/><LightControls point={p} settings={settings} onChange={onChange}/><p>{he?'שיוך בהדמיה':'Shown in'}: {he?getRoom(p.roomId).he:getRoom(p.roomId).en}{p.roomInferred?' ≈':''}</p>
  <p>{he?'גובה חיבור משוער':'Estimated connection height'}: ≈{Math.round(p.height*100)} {he?'ס״מ':'cm'}</p>
  {p.simulation?<p className="lighting-simulation-note">{he?'מנורה זמנית בסימולטור — אין תיעוד אמיתי למיקום זה. היא נוספה לצורך הדמיית תאורה ותוחלף בנקודה מתועדת כשיתקבל צילום או סרטון. אין כאן הוכחה לנקודת חשמל קיימת.':'Temporary simulator lamp — no real documentation for this location. Added for lighting simulation; it will be replaced by a documented point when a photo or video becomes available. This is not evidence of an existing electrical connection.'}</p>:<p className="hs-small-note">{he?'גוף או בית מנורה נראים בצילום. נוספה נורה כללית להדמיה; זו אינה בחירת דגם מתועדת. הקואורדינטות, הגובה, אורך הכבל ומידות הגוף משוערים. כיפות אדומות ופתחי אוורור לא נספרו כתאורה.':'A fixture or holder is photographed. A generic simulation bulb is installed; it is not a documented product selection. Coordinates, height, cable length and dimensions are estimates. Red caps and vents are not counted as lights.'}</p>}
  {p.evidence.length>1&&<div className="hs-electrical-evidence-tabs">{p.evidence.map((a,i)=><button key={a.source} aria-pressed={index===i} onClick={()=>setIndex(i)}>{he?'מקור':'Source'} {i+1}</button>)}</div>}
  {reference&&<ElectricalPhoto reference={reference} entries={entries} lang={lang} selectedId={p.id} kinds={{lighting:LIGHTING_STYLE}}/>}
  {reference?.second!=null&&<a className="hs-text-link" href={`/house/photos/walkthrough.mp4#t=${reference.second}`} target="_blank" rel="noreferrer"><Play size={14}/>{he?'השוואה לסרטון':'Compare video'} · {reference.second}s</a>}
 </div></section>;
}
export function LightingPlanMarkers({points=LIGHTING_LAYOUT.points,settings,scale=30,onSelect,mini=false,roomId}){
 if(settings.cleanView)return null;
 return <g className="lighting-plan-markers">{points.filter(p=>(!roomId||p.roomId===roomId)&&lightingVisible(p,settings)).map(p=>{const x=p.position[0]*scale,z=p.position[2]*scale,r=mini?2:scale*.13,stroke=mini?.8:scale*.04;return <g key={p.id} data-lighting-id={p.id} role={onSelect&&!mini?'button':undefined} tabIndex={onSelect&&!mini?0:undefined} aria-label={settings.lang==='he'?p.he:p.en} onClick={e=>{if(mini||!onSelect)return;e.stopPropagation();onSelect(p.id);}} onKeyDown={e=>{if(!mini&&onSelect&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();onSelect(p.id);}}} pointerEvents={mini||!onSelect?'none':undefined}><title>{`${settings.lang==='he'?p.he:p.en} ≈`}</title><circle cx={x} cy={z} r={r} fill="#fff6d8" stroke={p.simulation?'#8a65ac':LIGHTING_STYLE.color} strokeWidth={stroke} strokeDasharray={p.roomInferred||p.simulation?`${stroke*2} ${stroke}`:undefined}/><path d={`M ${x-r*.5} ${z-r*.5} l ${r} ${r} m 0 ${-r} l ${-r} ${r}`} fill="none" stroke={p.simulation?'#8a65ac':LIGHTING_STYLE.color} strokeWidth={stroke} pointerEvents="none"/></g>;})}</g>;
}
export function KitchenLighting({settings,onChange}){
 const [selected,setSelected]=useState(null),point=KITCHEN_LIGHTING_POINTS.find(p=>p.id===selected);
 return <><LightingFacts roomId="kitchen" lang={settings.lang} settings={settings} onChange={onChange} onInspect={setSelected}/>{point&&<LightingInspector key={point.id} point={point} lang={settings.lang} settings={settings} onChange={onChange} onClose={()=>setSelected(null)}/>}</>;
}
