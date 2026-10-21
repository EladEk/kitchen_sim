import {Camera,DoorOpen,ArrowUpRight,X,Maximize2,Minimize2} from 'lucide-react';
import {ENTRANCE_SERVICES,entryElement} from './home-model.mjs';
import {ENTRY_SOURCE} from './entrance-services.mjs';
import {DesignEvidence} from './DesignEvidence.jsx';
import './entrance-services.css';
export function EntranceServiceFacts({lang,onInspect,onSource}){
 const he=lang==='he';
 return <details className="entry-service-facts"><summary><DoorOpen size={16}/>{he?'כניסת הבית — ארונות השירות':'Home entrance — service cabinets'}</summary>
  <p>{he?'מחוץ לדלת 4, ברכוש המשותף. בחרו ארון כדי לפתוח את הדלתות ולראות את הציוד המצולם.':'Outside door 4, in the common area. Choose a cabinet to open its doors and inspect the photographed equipment.'}</p>
  {ENTRANCE_SERVICES.cabinets.map(c=><button key={c.id} className="hs-part-row" onClick={()=>onInspect(c.id,true)}><DoorOpen size={16}/><span>{he?c.he:c.en}</span><ArrowUpRight size={15}/></button>)}
  <button className="hs-text-link" onClick={()=>onSource(ENTRY_SOURCE.id,3)}><Camera size={14}/>{he?'התמונות וסרטון הכניסה':'Entrance photos and video'}</button>
 </details>;
}
export function EntryServiceInspector({element,settings,lang,minimized,onMinimize,onClose,onPart,onOpenCabinet,onFocus,onSource}){
 const c=entryElement(element.id),he=lang==='he',photo=ENTRY_SOURCE.references.find(r=>r.page===c.page),opened=new Set(settings.openParts);
 return <section className={`hs-inspector entry-service-inspector ${minimized?'hs-inspector-mini':''}`} data-entry-cabinet={c.id}>
  <div className="hs-inspector-header"><DoorOpen size={17}/><div><strong>{he?c.he:c.en}</strong><small>{he?'מחוץ לדירה · לפי הצילומים שלך':'Outside apartment · from your photos'}</small></div><button className="hs-icon-button" onClick={onMinimize} aria-label={he?'מזעור או הרחבה':'Minimize or restore'}>{minimized?<Maximize2 size={15}/>:<Minimize2 size={15}/>}</button><button className="hs-icon-button" onClick={onClose} aria-label={he?'סגירה':'Close'}><X size={17}/></button></div>
  {!minimized&&<div className="hs-inspector-body">
   <DesignEvidence item={c} settings={settings} lang={lang}/>
   <button className="hs-button" onClick={()=>onOpenCabinet(c.id)}><DoorOpen size={16}/>{c.parts.every(p=>opened.has(p.id))?(he?'סגירת שתי הדלתות':'Close both doors'):(he?'פתיחה ומבט פנימה':'Open and look inside')}</button>
   <div className="entry-door-controls">{c.parts.map(p=><button key={p.id} className="hs-part-row" aria-pressed={opened.has(p.id)} onClick={()=>onPart(p.id)}><span>{he?p.he:p.en}</span><small>{opened.has(p.id)?(he?'פתוחה':'Open'):(he?'סגורה':'Closed')}</small></button>)}</div>
   <button className="hs-text-link" onClick={()=>onFocus(c.id,true)}><Maximize2 size={14}/>{he?'מיקוד המצלמה בארון':'Focus camera on cabinet'}</button>
   <h4>{he?'מה נראה בתוך הארון':'Visible cabinet contents'}</h4>
   {c.contents.length?<ul>{c.contents.map(item=><li key={item.id}>{he?item.he:item.en}</li>)}</ul>:<p className="hs-small-note">{he?'התא לא צולם פתוח. התכולה לא ידועה; החלל הריק בתלת־ממד אינו אישור שהתא ריק במציאות.':'This bay was not photographed open. Contents are unknown; an empty model does not mean the actual bay is empty.'}</p>}
   <details className="entry-source-compare"><summary><Camera size={15}/>{he?'השוואה לצילום האמיתי':'Compare with the real photo'}</summary><a href={photo.image} target="_blank" rel="noreferrer"><img src={photo.image} alt={he?photo.he:photo.en}/></a><p>{he?photo.noteHe:photo.noteEn}</p><button className="hs-text-link" onClick={()=>onSource(ENTRY_SOURCE.id,c.page)}>{he?'פתיחת המקור המלא':'Open full source'}<ArrowUpRight size={13}/></button></details>
   <p className="hs-small-note">{he?c.noteHe:c.noteEn}</p>
   <p className="hs-small-note">{he?'מידות מעטפת משוערות — רוחב × עומק × גובה:':'Estimated envelope — width × depth × height:'} <bdi>≈ {c.dimensions.map(v=>Math.round(v*100)).join(' × ')} cm</bdi></p>
  </div>}
 </section>;
}
export function EntranceServicesPlan({layout,settings,scale,mini,onSelect}){
 const he=settings.lang==='he',activate=(event,id)=>{if(event.type==='click'||event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();onSelect?.(id);}},opened=new Set(settings.openParts);
 return <g className="entry-services-plan">
  <polygon points={layout.context.polygon.map(p=>p.map(v=>v*scale).join(',')).join(' ')} fill="#dcd8ce" stroke="#999f95" strokeWidth="1"/>
  {layout.cabinets.map(c=><g key={c.id} data-entry-cabinet={c.id} role={mini?'img':'button'} tabIndex={mini?-1:0} aria-label={he?c.he:c.en} onClick={e=>activate(e,c.id)} onKeyDown={e=>activate(e,c.id)}>
   <title>{he?c.he:c.en}</title><rect x={(c.x-c.w/2)*scale} y={c.z*scale} width={c.w*scale} height={c.d*scale} fill="#e9e8df" stroke="#727c70" strokeWidth="1"/>
   {c.parts.map((p,i)=>{const x=c.x+(i?1:-1)*c.w/2,w=c.w/2;return <line key={p.id} data-entry-part={p.id} x1={x*scale} y1={c.z*scale} x2={(opened.has(p.id)?x:c.x)*scale} y2={(c.z-(opened.has(p.id)?w:0))*scale} stroke={opened.has(p.id)?'#4c7759':'#aaa08a'} strokeWidth="1.5"/>;})}
   {!mini&&!settings.cleanView&&<text x={c.x*scale} y={(c.z+.35)*scale} textAnchor="middle" fontSize="4.5" fill="#465346" pointerEvents="none">{c.id==='entry-pipes'?(he?'צנרת':'Pipes'):c.id==='entry-hot-water'?(he?'מיכל 4':'Tank 4'):(he?'לא צולם':'Unseen')}</text>}
  </g>)}
  {!mini&&!settings.cleanView&&<text x={(layout.context.minX+.8)*scale} y={(layout.frontZ-.7)*scale} fontSize="6" fill="#677565" pointerEvents="none">{he?'מבואת כניסה משותפת ≈':'Common entrance ≈'}</text>}
 </g>;
}
