import {ROOMS,WALLS,DOORS,WINDOWS,FURNITURE,PLOT,HOME_FINISHES,polygonBounds,openingPoint} from './home-model.mjs';

export function HomePlan({settings,selectedRoom,position,onSelect,mini=false}){
 const bounds=polygonBounds(PLOT),margin=.5,scale=30;
 const points=poly=>poly.map(p=>p.map(n=>n*scale).join(',')).join(' ');
 const he=settings.lang==='he',opened=new Set(settings.openDoors);
 const activate=(e,id)=>{if(e.type==='click'||e.key==='Enter'||e.key===' '){e.preventDefault();onSelect?.(id);}};
 return <svg className={`hs-plan ${mini?'hs-plan-mini':''}`} viewBox={`${(bounds.minX-margin)*scale} ${(bounds.minZ-margin)*scale} ${(bounds.maxX-bounds.minX+margin*2)*scale} ${(bounds.maxZ-bounds.minZ+margin*2)*scale}`} role="img" aria-label={he?'תוכנית הבית — בחירת חדר וניווט':'House plan — select a room'}>
  <polygon points={points(PLOT)} fill="#ccd6b9" stroke="#a2ad91" strokeWidth="2"/>
  {ROOMS.map(r=><polygon key={r.id} points={points(r.polygon)} fill={r.id===selectedRoom?'#b7cbb2':r.kind==='garden'?'#ccd6b9':r.kind==='outdoor'?'#d5c9b4':HOME_FINISHES.find(f=>f.id===settings.rooms[r.id]?.wall)?.color||'#eee9df'} stroke={r.id===selectedRoom?'#4a6a4c':'#c9c3b8'} strokeWidth={r.id===selectedRoom?2:1} tabIndex={mini?-1:0} role="button" aria-label={he?r.he:r.en} onClick={e=>activate(e,r.id)} onKeyDown={e=>activate(e,r.id)}/>)}
  {settings.furniture&&FURNITURE.map(f=><rect key={f.id} x={-f.w*scale/2} y={-f.d*scale/2} width={f.w*scale} height={f.d*scale} rx="2" fill="#b7aa91" opacity=".65" transform={`translate(${f.position.map(n=>n*scale).join(' ')}) rotate(${-f.rotation*180/Math.PI})`} pointerEvents="none"/>)}
  {WALLS.map(w=><line key={w.id} x1={w.a[0]*scale} y1={w.a[1]*scale} x2={w.b[0]*scale} y2={w.b[1]*scale} stroke="#526057" strokeWidth={w.thickness*scale} strokeLinecap="square" pointerEvents="none"/>)}
  {[...DOORS.filter(d=>!d.hostDoorId),...WINDOWS].map(o=>{const [x,z]=openingPoint(o),dx=o.vertical?0:o.width*scale/2,dz=o.vertical?o.width*scale/2:0;return <g key={o.id} pointerEvents="none"><line x1={x*scale-dx} y1={z*scale-dz} x2={x*scale+dx} y2={z*scale+dz} stroke={settings.closedShutters?.includes(o.id)?'#657363':o.type==='window'?'#94b7bb':'#f4f1e8'} strokeWidth={o.type==='window'?5:10}/>{o.type!=='window'&&<line x1={x*scale-dx} y1={z*scale-dz} x2={x*scale+dx} y2={z*scale+dz} stroke={settings.closedShutters?.includes(o.id)?'#657363':DOORS.filter(d=>d.id===o.id||d.hostDoorId===o.id).every(d=>opened.has(d.id))?'#91b38c':'#ac8e62'} strokeWidth={DOORS.filter(d=>d.id===o.id||d.hostDoorId===o.id).every(d=>opened.has(d.id))?2:4}/>}</g>;})}
  {!mini&&ROOMS.map(r=><text key={r.id} x={r.walk[0]*scale} y={r.walk[1]*scale} textAnchor="middle" dominantBaseline="middle" fontSize={r.kind==='garden'?13:10} fontWeight="600" fill="#273d31" paintOrder="stroke" stroke="#f8f5eb" strokeWidth="3" pointerEvents="none">{he?r.he:r.en}</text>)}
  {position&&<g transform={`translate(${position.x*scale} ${position.z*scale})`} pointerEvents="none"><circle r={mini?8:7} fill="#fff" opacity=".9"/><path d="M 0 -12 L -5 2 L 0 0 L 5 2 Z" fill="#345f43" transform={`rotate(${-position.yaw*180/Math.PI})`}/><circle r="3" fill="#345f43"/></g>}
 </svg>;
}
