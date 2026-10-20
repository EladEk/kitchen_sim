import {Droplets,Minimize2,Maximize2,X} from 'lucide-react';
import {WATER_LAYOUT,getRoom} from './home-model.mjs';
import {WATER_STYLE,waterVisible} from './home-water.mjs';
import {ELECTRICAL_REFERENCES} from './home-electrical.mjs';
import {ElectricalPhoto} from './ElectricalPhoto.jsx';

const files={harash:'/house/harash-products.pdf',hercules:'/house/hercules.pdf','apartment-spec':'/house/apartment-spec.pdf'};
export function WaterPointDetails({point:p,lang}){
 const he=lang==='he',e=p.evidence[0],reference=e&&ELECTRICAL_REFERENCES.find(r=>r.page===e.page);
 return <div className="water-point-details"><p className="water-point-status">{p.status==='observed'?(he?'נראה בצילום · המיקום במודל משוער':'Photographed · model placement estimated'):(he?'חיבור משוער לפי מיקום הכלי בהדמיה':'Assumed connection at modeled fixture')}</p><p>{he?'חדר':'Room'}: {he?getRoom(p.roomId).he:getRoom(p.roomId).en}</p><p>{he?'גובה סימון משוער':'Assumed marker height'}: <bdi>≈ {Math.round(p.height*100)} cm</bdi></p><p>{he?'הכחול מסמן מים. הסימון אינו קובע מים חמים או קרים, תוואי צנרת או מיקום הכנה מדוד.':'Blue identifies water. It does not specify hot/cold supply, pipe routing or a measured rough-in.'}</p>
  {reference?<ElectricalPhoto reference={reference} entries={WATER_LAYOUT.points.flatMap(q=>q.evidence.filter(a=>a.page===e.page).map(a=>({point:q,rect:a.rect})))} lang={lang} selectedId={p.id}/>:<><p>{he?'הסימון נשען על פריסת הכלי בסימולטור ומפרט המוצרים. אין צילום שמאמת את ההכנה בקיר בנקודה הזאת.':'The marker follows the simulator fixture layout and product schedule. No photo verifies this wall rough-in location.'}</p><a className="hs-text-link" href={`${files[p.source]}#page=${p.page}`} target="_blank" rel="noreferrer">{he?'פתיחת מסמך המקור':'Open source document'}</a></>}
 </div>;
}
export function WaterInspector({point:p,lang,minimized,onMinimize,onClose}){
 const he=lang==='he';return <aside className={`hs-inspector hs-electrical-inspector ${minimized?'hs-inspector-mini':''}`}><div className="hs-inspector-header"><Droplets size={18} color={WATER_STYLE.color}/><div><strong>{p.label} · {he?p.he:p.en}</strong><small>{he?'נקודת מים · מיקום משוער':'Water point · estimated position'}</small></div><button className="hs-icon-button" onClick={onMinimize} aria-label={he?'מזעור או הרחבת הפרטים':'Minimize or restore details'}>{minimized?<Maximize2 size={15}/>:<Minimize2 size={15}/>}</button><button className="hs-icon-button" onClick={onClose} aria-label={he?'סגירה':'Close'}><X size={17}/></button></div>{!minimized&&<div className="hs-inspector-body"><WaterPointDetails point={p} lang={lang}/></div>}</aside>;
}
export function WaterFacts({roomId,lang,settings,onChange,onInspect}){
 const he=lang==='he',rows=WATER_LAYOUT.points.filter(p=>p.roomId===roomId);return <section className="hs-construction-card hs-electrical-facts"><h3><Droplets size={16} color={WATER_STYLE.color}/>{he?'נקודות מים':'Water points'}</h3><label className="hs-electrical-check"><input type="checkbox" checked={settings.showWater!==false} onChange={e=>onChange('showWater',e.target.checked)}/>{he?'הצגת מים בכחול בשכבת התשתיות':'Show blue water points in the services layer'}</label><p className="hs-small-note">{he?WATER_LAYOUT.noteHe:WATER_LAYOUT.noteEn}</p><div className="hs-electrical-point-list">{rows.map(p=><button key={p.id} onClick={()=>onInspect(p.id,true)}><bdi style={{color:WATER_STYLE.color}}>{p.label}</bdi><span>{he?p.he:p.en}<small>{p.status==='observed'?(he?'מהצילום':'Photographed'):(he?'לפי פריסת הכלים · משוער':'Fixture layout · assumed')}</small></span></button>)}</div>{!rows.length&&<p className="hs-small-note">{he?'לא נוספו נקודות מים בחדר ללא מקור או כלי מים במודל.':'No water point was added without evidence or a modeled water fixture.'}</p>}</section>;
}
export function WaterPlanMarkers({points,settings,onSelect,scale=1,mini=false}){
 const activate=(e,p)=>{e.stopPropagation();e.preventDefault();onSelect?.(p.id);};
 return <g className="water-plan-markers">{points.filter(p=>waterVisible(p,settings)).map(p=>{const [x,,z]=p.position;return <WaterGlyph key={p.id} point={p} x={x*scale} y={z*scale} size={mini?5:scale>100?76:10} lang={settings.lang} onSelect={onSelect?e=>activate(e,p):undefined}/>;})}</g>;
}
export function WaterGlyph({point:p,x,y,size=76,lang,onSelect}){
 const r=size/2,label=`${p.label} · ${lang==='he'?p.he:p.en}`;return <g data-water-id={p.id} role={onSelect?'button':undefined} tabIndex={onSelect?0:undefined} aria-label={label} onClick={onSelect} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')onSelect?.(e);}}><title>{label}</title><circle cx={x} cy={y} r={r} fill={WATER_STYLE.color} stroke="#f8fbff" strokeWidth={size*.07} strokeDasharray={p.status==='layout'?`${size*.14} ${size*.08}`:undefined}/><path d={`M ${x} ${y-r*.62} Q ${x+r*.85} ${y+r*.58} ${x} ${y+r*.62} Q ${x-r*.85} ${y+r*.58} ${x} ${y-r*.62}`} fill="none" stroke="#fff" strokeWidth={size*.08} pointerEvents="none"/></g>;
}
