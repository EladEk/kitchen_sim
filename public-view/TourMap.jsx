import React,{memo,useEffect,useId,useMemo,useRef,useState} from 'react';
import {mapForLocation,tourMapKey,roomAtMap,zoomMapView} from './tour-map.mjs';

const MapStructure=memo(function MapStructure({plan,clipId,doorPaths,original,opacity}){
 return <><defs>{plan.clip&&<clipPath id={clipId}><path d={plan.clip}/></clipPath>}</defs><g className="map-floor">{!plan.unit&&<path d={plan.core} className="map-core"/>}{plan.units.map(u=><path key={u.number} d={u.path} className="map-unit"/>)}</g><g clipPath={plan.clip?`url(#${clipId})`:undefined}>
  {original&&plan.originalPlan&&<image href={plan.originalPlan.url} x={plan.originalPlan.x} y={plan.originalPlan.z} width={plan.originalPlan.width} height={plan.originalPlan.height} opacity={opacity} preserveAspectRatio="none"/>}
  {plan.furniture.map((f,i)=><path key={i} d={f.path} className={`map-furniture map-${f.kind}`}/>)}<path d={plan.walls} className="map-walls"/>{doorPaths.map((d,i)=><path key={i} d={d.path} className={`map-door${d.kind==='entry'?' map-entry':''}`}/>)}</g>{!plan.unit&&plan.units.map(u=><text key={u.number} x={u.label[0]} y={u.label[1]} className="map-number">{u.number}</text>)}</>;
});

export function TourMap({data,where,pose,overrides,getDoorOpen,onClose,onExpandedChange,doorRevision=0}){
 const clipId='tour-map-'+useId().replace(/:/g,''),key=tourMapKey(where),dialog=useRef(),expandButton=useRef(),wasExpanded=useRef(false),svg=useRef(),pointers=useRef(new Map()),live=useRef();
 const [expanded,setExpanded]=useState(false),[view,setView]=useState(null),[original,setOriginal]=useState(false),[opacity,setOpacity]=useState(.28);
 const plan=useMemo(()=>mapForLocation(data,where,overrides),[data,key,overrides]);
 const base=useMemo(()=>plan?.viewBox.split(' ').map(Number)||[0,0,1,1],[plan]),box=view?.key===key?view.box:base;
 const doorPaths=useMemo(()=>plan?.doors.map(d=>({kind:d.kind,path:(getDoorOpen?.(where.building,d.id)??d.defaultOpen)?d.open:d.closed}))||[],[plan,where.building,getDoorOpen,doorRevision]);
 live.current={base,box,key};
 const change=fn=>setView(previous=>{const current=live.current;return {key:current.key,box:fn(previous?.key===current.key?previous.box:current.base,current.base)};});
 const zoom=(factor,anchor)=>change((b,base)=>zoomMapView(base,b,factor,anchor));
 const pan=(dx,dz)=>change(([x,z,w,h],[bx,bz,bw,bh])=>[Math.max(bx,Math.min(bx+bw-w,x+dx)),Math.max(bz,Math.min(bz+bh-h,z+dz)),w,h]);
 function localPoint(x,y){const node=svg.current,m=node?.getScreenCTM();if(!m)return null;const p=node.createSVGPoint();p.x=x;p.y=y;const at=p.matrixTransform(m.inverse());return [at.x,at.y];}
 useEffect(()=>{onExpandedChange?.(expanded);return()=>onExpandedChange?.(false);},[expanded,onExpandedChange]);
 useEffect(()=>{const d=dialog.current;if(expanded&&d&&!d.open)d.showModal();},[expanded]);
 useEffect(()=>{if(expanded)wasExpanded.current=true;else if(wasExpanded.current){wasExpanded.current=false;expandButton.current?.focus();}},[expanded]);
 useEffect(()=>{const node=svg.current;if(!node)return;const wheel=e=>{e.preventDefault();zoom(Math.exp(-Math.max(-120,Math.min(120,e.deltaY))*.0025),localPoint(e.clientX,e.clientY));};node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);},[expanded,plan]);
 if(!plan)return null;
 const active=roomAtMap(plan,pose.position),heading=`${plan.unit?`דירה ${plan.unit}`:'מפת הקומה'} · ${plan.floor?`קומה ${plan.floor}`:'קרקע'}`;
 const content=<>
  <div className="tour-map-heading"><div><strong>{heading}</strong>{expanded&&<small>בניין {where.building}{active?` · ${active.he}`:''}</small>}</div><button ref={expandButton} type="button" aria-haspopup="dialog" aria-expanded={expanded} onClick={()=>setExpanded(!expanded)} aria-label={expanded?'הקטנת מפה':'הגדלת מפה למסך מלא'}>{expanded?'↙':'⛶'}</button><button type="button" onClick={()=>{setExpanded(false);onClose();}} aria-label="סגירת מפה">×</button></div>
  <div className="tour-map-tools" role="group" aria-label="בקרות המפה"><button type="button" onClick={()=>zoom(1.3)} aria-label="הגדלת מפה">+</button><button type="button" onClick={()=>zoom(1/1.3)} aria-label="הקטנת תצוגת מפה">−</button><button type="button" onClick={()=>setView(null)}>התאמה</button>{expanded&&<button type="button" onClick={()=>change((b,base)=>{const next=zoomMapView(base,base,2.5,pose.position);return [Math.max(base[0],Math.min(base[0]+base[2]-next[2],pose.position[0]-next[2]/2)),Math.max(base[1],Math.min(base[1]+base[3]-next[3],pose.position[1]-next[3]/2)),next[2],next[3]];})}>המיקום שלי</button>}</div>
  <svg ref={svg} viewBox={box.join(' ')} role="img" tabIndex={0} aria-label="מפה אינטראקטיבית: שמות חדרים, המיקום שלך וכיוון המבט" onKeyDown={e=>{if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();if(['+','='].includes(e.key))zoom(1.3);else if(e.key==='-')zoom(1/1.3);else if(e.key==='0')setView(null);else pan((e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)*box[2]*.12,(e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0)*box[3]*.12);}}}
   onPointerDown={e=>{if(e.button!==0&&e.pointerType==='mouse')return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,[e.clientX,e.clientY]);}}
   onPointerMove={e=>{const points=pointers.current,previous=points.get(e.pointerId);if(!previous)return;const before=[...points.values()];points.set(e.pointerId,[e.clientX,e.clientY]);const after=[...points.values()];if(points.size===2){const old=Math.hypot(before[0][0]-before[1][0],before[0][1]-before[1][1]),next=Math.hypot(after[0][0]-after[1][0],after[0][1]-after[1][1]);if(old>4)zoom(next/old,localPoint((after[0][0]+after[1][0])/2,(after[0][1]+after[1][1])/2));}else if(points.size===1){const a=localPoint(...previous),b=localPoint(e.clientX,e.clientY);if(a&&b)pan(a[0]-b[0],a[1]-b[1]);}}}
   onPointerUp={e=>pointers.current.delete(e.pointerId)} onPointerCancel={e=>pointers.current.delete(e.pointerId)} onLostPointerCapture={e=>pointers.current.delete(e.pointerId)}>
   <MapStructure plan={plan} clipId={clipId} doorPaths={doorPaths} original={original} opacity={opacity}/>
   {active&&<path d={active.path} className="map-active-room" clipPath={plan.clip?`url(#${clipId})`:undefined}/>}
   {plan.rooms.map(r=><text key={r.id} x={r.label[0]} y={r.label[1]} className={`map-room-label${r.id===active?.id?' map-room-current':''}`}>{(()=>{const xs=r.polygons.flat().map(p=>p[0]),zs=r.polygons.flat().map(p=>p[1]),narrow=Math.min(Math.max(...xs)-Math.min(...xs),Math.max(...zs)-Math.min(...zs))<1.8,words=r.he.split(' ');return narrow&&words.length>1?words.map((word,i)=><tspan key={i} x={r.label[0]} dy={i===0?-(words.length-1)*.18:.36}>{word}</tspan>):r.he;})()}</text>)}
   <g transform={`translate(${pose.position.join(' ')})`} className="map-position"><g transform={`rotate(${pose.heading})`}><path d="M0,-1.5L-.75,-.35Q0,-.6 .75,-.35Z" className="map-look"/><path d="M0,-.95L-.3,-.3L.3,-.3Z" className="map-arrow"/></g><circle r=".27"/></g>
  </svg>
  {expanded&&plan.originalPlan&&<div className="map-original-controls"><label><input type="checkbox" checked={original} onChange={e=>setOriginal(e.target.checked)}/> תוכנית הקבלן המקורית</label>{original&&<label>שקיפות<input type="range" min=".1" max=".7" step=".05" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>}</div>}
  <div className="tour-map-legend"><span className="map-legend-dot"/>{active?`אתה ב${active.he} · `:''}החץ מציין את כיוון המבט</div>{expanded&&<p className="map-help">גררו להזזה · צביטה או + / − לזום · ההליכה מושהית כשהמפה מוגדלת</p>}
 </>;
 return expanded?<dialog ref={dialog} className="tour-map tour-map-expanded" aria-label={heading} onCancel={e=>{e.preventDefault();setExpanded(false);}} onClose={()=>setExpanded(false)}>{content}</dialog>:<aside className="tour-map" aria-label={heading} onPointerDown={e=>e.stopPropagation()}>{content}</aside>;
}
