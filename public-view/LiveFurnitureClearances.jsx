import React from 'react';
import {clearanceCentimetres,clearanceLabel} from './furniture-clearances.mjs';
import './furniture-clearances.css';
export function LiveFurnitureClearances({value,onSelect}){
 if(!value)return null;
 return <div className="live-furniture-clearances" aria-label="מרווחי הרהיט בסנטימטרים"><div className="live-clearance-grid">{value.guides.map(g=><button type="button" onClick={()=>onSelect?.(g)} key={g.direction} className="live-clearance-row" style={{'--clearance-color':g.color}} title={clearanceLabel(g)} aria-label={clearanceLabel(g)}><b className="live-clearance-key">{g.axis==='vertical'?(g.direction==='above'?'↑':'↓'):g.number}</b><bdi>≈ {clearanceCentimetres(g.gap)} ס״מ</bdi></button>)}</div></div>;
}
