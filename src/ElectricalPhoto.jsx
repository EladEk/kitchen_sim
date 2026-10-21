import {useEffect,useRef,useState} from 'react';
import {ZoomIn,Scan,ArrowUpRight} from 'lucide-react';
import {ELECTRICAL_KINDS} from './home-electrical.mjs';
import {ElectricalCallouts} from './ElectricalCallouts.jsx';
import {electricalPhotoCrop,electricalPhotoAnchors} from './electrical-ui.mjs';
import './electrical.css';

export function ElectricalPhoto({reference,entries,lang,selectedId,onSelect,kinds=ELECTRICAL_KINDS}){
 const he=lang==='he',frame=useRef(),markers=useRef(),[zoomed,setZoomed]=useState(false),[size,setSize]=useState([1536,1152]),[status,setStatus]=useState('loading');
 const selected=entries.find(e=>e.point.id===selectedId),crop=electricalPhotoCrop(selected?.rect,zoomed);
 useEffect(()=>{setStatus('loading');setZoomed(false);},[reference.image]);
 useEffect(()=>{const el=frame.current;if(!el)return;const update=()=>markers.current?.update(electricalPhotoAnchors(entries,crop,el.clientWidth,el.clientHeight),el.clientWidth,el.clientHeight);const observer=new ResizeObserver(update);observer.observe(el);update();return()=>observer.disconnect();},[entries,crop.x,crop.y,crop.width,crop.height,size,selectedId]);
 return <div className="electrical-photo-viewer" data-source-page={reference.page} data-selected-point={selectedId||''}>
  <div className="electrical-photo-tools"><button aria-pressed={!zoomed} onClick={()=>setZoomed(false)}><Scan size={16}/>{he?'צילום מלא':'Full photo'}</button><button disabled={!selected} aria-pressed={zoomed} onClick={()=>setZoomed(true)}><ZoomIn size={16}/>{he?'הגדלת הנקודה':'Zoom to point'}</button><a href={reference.image} target="_blank" rel="noreferrer">{he?'מקור':'Original'}<ArrowUpRight size={15}/></a></div>
  <div className="electrical-photo-frame" ref={frame} style={{aspectRatio:`${size[0]} / ${size[1]}`}}>
   <div className="electrical-photo-scene" style={{width:`${100/crop.width}%`,left:`${-crop.x/crop.width*100}%`,top:`${-crop.y/crop.height*100}%`}}>
    <img key={reference.image} src={reference.image} alt={he?reference.he:reference.en} onLoad={e=>{setSize([e.currentTarget.naturalWidth,e.currentTarget.naturalHeight]);setStatus('ready');}} onError={()=>setStatus('error')}/>
    {entries.map(({point:p,rect:[x,y,w,h]})=><div key={p.id} aria-hidden="true" className={`electrical-photo-outline ${p.id===selectedId?'is-selected':''} ${p.roomInferred?'is-inferred':''}`} style={{left:`${x*100}%`,top:`${y*100}%`,width:`${w*100}%`,height:`${h*100}%`,'--point-color':kinds[p.kind].color}}/>)}
   </div>
   {onSelect&&<ElectricalCallouts ref={markers} points={entries.map(e=>({...e.point,photoEvidence:true}))} selectedId={selectedId} lang={lang} onSelect={onSelect}/>}
  </div>
  {status==='loading'&&<p className="electrical-photo-status" role="status">{he?'טוען צילום מקור…':'Loading original photo…'}</p>}
  {status==='error'&&<p className="electrical-photo-error" role="alert">{he?'הצילום לא נטען. אפשר לנסות שוב או לפתוח את הקובץ המקורי.':'The photo could not load. Retry or open the original file.'}<button onClick={()=>{setStatus('loading');const img=frame.current.querySelector('img');img.src=reference.image;}}>{he?'ניסיון נוסף':'Retry'}</button><a href={reference.image} target="_blank" rel="noreferrer">{he?'פתיחת המקור':'Open original'}</a></p>}
  {selected&&<p className="electrical-photo-caption" aria-live="polite"><bdi>{selected.point.label}</bdi> · {he?selected.point.he:selected.point.en}</p>}
 </div>;
}
