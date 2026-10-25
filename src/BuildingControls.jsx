import {RESIDENTS_CLUB} from './residents-club.mjs';
import {ProtectedImage} from './DocumentAccess.jsx';
import {Building2,House,FileText,Camera} from 'lucide-react';
import {BUILDING,BUILDING_FLOORS,BUILDING_PHOTOS,BUILDING_ACCURACY,buildingLevel} from './building-layout.mjs';
import {duplexOnFloor} from './building-duplexes.mjs';
import './building.css';
import {BuildingSiteFacts} from './BuildingSiteFacts.jsx';

export function BuildingControls({settings,mode,onMode,onChange,onSource,onInspect}){
 const he=settings.lang==='he',selected=buildingLevel(settings.buildingLevel),roof=settings.buildingLevel===9,duplex=duplexOnFloor(selected.level);
 return <section className="building-controls" aria-label={he?'בניין 4102':'Building 4102'}>
  <h3><Building2 size={18}/>{he?'הבניין כולו · 4102':'Whole building · 4102'}</h3>
  <div className="building-view-buttons"><button aria-pressed={mode==='building'} onClick={()=>onMode('building')}><Building2 size={17}/>{he?'מבט בניין':'Building view'}</button><button aria-pressed={mode!=='building'} onClick={()=>onMode('overview')}><House size={17}/>{he?'התמקדות בדירה 4':'Focus apartment 4'}</button></div>
  <p className="building-intro">{he?'קומת קרקע + 8 קומות וגג, לפי תוכניות הבניין. דירה 4 נשמרה עם כל הפרטים והעריכות שלך.':'Ground + 8 floors and roof, from the building plans. Apartment 4 retains your detailed model and edits.'}</p>
  <label className="building-floor-label">{he?'הצגת הבניין עד קומה':'Show building up to floor'}<select value={settings.buildingLevel} onChange={e=>{onChange('buildingLevel',Number(e.target.value));onMode('building');}}>{BUILDING_FLOORS.map(f=><option value={f.level} key={f.level}>{he?f.he:f.en}</option>)}<option value="9">{he?'בניין שלם כולל הגג':'Complete building including roof'}</option></select></label>
  <div className="building-floor-summary"><strong>{roof?(he?'גג ומבני המעליות והמדרגות':'Roof and lift/stair heads'):(he?selected.he:selected.en)}</strong><span>{he?'גובה מפלס משוער':'Estimated level height'}: ≈{selected.elevation.toFixed(1)} {he?'מ׳':'m'}</span>{!roof&&<span>{he?'דירות בתוכנית הקומה':'Units on this floor plan'}: {selected.units.map(u=>u.number).join(', ')}{duplex?(he?` · דירה ${duplex.unit}: דופלקס ${duplex.entryFloor}–${duplex.upperFloor}, כניסה בקומה ${duplex.entryFloor} בלבד`:` · unit ${duplex.unit}: duplex ${duplex.entryFloor}–${duplex.upperFloor}, entry only on floor ${duplex.entryFloor}`):''}</span>}</div>
  <button className="building-source-button" onClick={()=>onSource('building-plan',selected.page)}><FileText size={17}/>{he?'השוואה לתוכנית הקומה המקורית':'Compare original floor plan'} · {selected.page}</button>
  <label className="building-shadow-choice"><input type="checkbox" checked={settings.buildingShadows!==false} onChange={e=>onChange('buildingShadows',e.target.checked)}/>{he?'צל הבניין גם כשמתמקדים בדירה':'Building shadows when focusing the apartment'}</label>
  <small>{he?'במבט הדירה מעטפת הבניין מוסתרת מהעין ושומרת על ההצללה. כיבוי האפשרות מאפשר להשוות לדירה מבודדת. בחירת קומה מסתירה את הקומות שמעליה ואת התקרה מעל הקומה הנבחרת; קיצור הקירות נקבע בנפרד ב״חתך קירות״.':'In apartment view the building is visually hidden while its shadows remain. Turn this off to compare with an isolated apartment. Selecting a floor hides the floors above it and opens its ceiling for an interior overview. Shortening the walls is controlled separately by Cutaway.'}</small>
  <details className="building-evidence"><summary>{he?'מועדון דיירים — תיעוד ודיוק':'Residents’ club — evidence and accuracy'}</summary><p>{he?RESIDENTS_CLUB.noteHe:RESIDENTS_CLUB.noteEn}</p><button className="building-source-button" onClick={()=>onSource('residents-club-video',4)}><Camera size={17}/>{he?'צפייה בסרטון המקורי':'Watch original video'}</button></details>
  <BuildingSiteFacts lang={settings.lang} onSource={onSource} onInspect={onInspect}/>
  <details className="building-evidence"><summary>{he?'מקורות ודיוק השחזור':'Sources and reconstruction accuracy'}</summary><p>{he?BUILDING_ACCURACY.planHe:BUILDING_ACCURACY.planEn}</p><p>{he?BUILDING_ACCURACY.estimateHe:BUILDING_ACCURACY.estimateEn}</p><p>{he?'מרווח קומה משוער':'Assumed storey spacing'}: {BUILDING.storey.toFixed(2)} {he?'מ׳':'m'}.</p><div className="building-photo-grid">{BUILDING_PHOTOS.map(p=><button key={p.image} onClick={()=>onSource(p.source,p.page)}><ProtectedImage src={p.image} loading="lazy" alt={he?p.he:p.en}/><span><Camera size={14}/>{he?p.he:p.en}</span></button>)}</div><a href={BUILDING.source} target="_blank" rel="noreferrer">{he?'פתיחת PDF הבניין המקורי':'Open the original building PDF'}</a></details>
 </section>;
}

export function BuildingEntry({lang,onEnter,onDetails}){const he=lang==='he';return <div className="building-entry"><div><strong>{he?'בניין 4102':'Building 4102'}</strong><small>{he?'דירה 4 מסומנת בקומת הקרקע':'Apartment 4 outlined on the ground floor'}</small></div><button onClick={onEnter}><House size={17}/>{he?'לדירה שלי':'My apartment'}</button><button className="building-more" aria-label={he?'מקורות ופרטי הבניין':'Building sources and details'} onClick={onDetails}><FileText size={18}/></button></div>;}
