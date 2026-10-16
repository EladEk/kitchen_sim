import React from 'react';
import {Check,PanelTop} from 'lucide-react';
import {getOpenings} from './openings.mjs';
export function OpeningControls({cabinetId,openParts,activePart,onToggle,lang}){
 const he=lang==='he',parts=getOpenings(cabinetId);if(!parts.length)return null;
 return <div className="opening-controls"><div className="opening-controls-label">{he?'כל דלת ומגירה בנפרד':'EACH DOOR & DRAWER'}<span>{he?'לחיצה לפתיחה / סגירה':'tap to open / close'}</span></div><div className="opening-parts-grid">{parts.map(p=>{const open=openParts?.includes(p.id),active=activePart===p.id;return <button key={p.id} className={`${open?'open':''} ${active?'active-part':''}`} onClick={()=>onToggle(p.id)} aria-pressed={!!open} aria-label={`${open?(he?'סגירה':'Close'):(he?'פתיחה':'Open')}: ${he?p.he:p.en}`} title={he?p.he:p.en}><PanelTop size={12}/><span>{he?p.he:p.en}</span>{open?<Check size={11}/>:<i/>}</button>;})}</div></div>;
}
