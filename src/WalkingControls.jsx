import {ArrowUp,ArrowLeft,ArrowDown,ArrowRight} from 'lucide-react';

export function HoldButton({move,label,icon:Icon,onMove}){
 return <button className={`hs-hold hs-hold-${move}`} aria-label={label} title={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onMove(move,true);}} onPointerUp={()=>onMove(move,false)} onPointerCancel={()=>onMove(move,false)} onLostPointerCapture={()=>onMove(move,false)}><Icon size={21}/></button>;
}

// The direction pad stays mounted outside the hide-all layer, so walking
// remains available while the map, caption and other scene controls are hidden.
export function WalkingControls({lang,cleanView,minimap,onMove,compact=false,hidden=false}){
 const he=lang==='he';
 return <div className="hs-walk-controls" hidden={hidden}><div className="hs-walk-pad" role="group" aria-label={he?'בקרות הליכה':'Walking controls'}><HoldButton move="forward" icon={ArrowUp} label={he?'קדימה':'Forward'} onMove={onMove}/><HoldButton move="left" icon={ArrowLeft} label={he?'צעד שמאלה':'Step left'} onMove={onMove}/><HoldButton move="back" icon={ArrowDown} label={he?'אחורה':'Back'} onMove={onMove}/><HoldButton move="right" icon={ArrowRight} label={he?'צעד ימינה':'Step right'} onMove={onMove}/><span hidden={cleanView||compact}>W A S D</span></div><div className="hs-walk-map-slot" hidden={cleanView||compact}>{minimap}</div></div>;
}
