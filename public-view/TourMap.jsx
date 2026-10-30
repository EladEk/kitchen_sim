import React,{memo,useId,useMemo} from 'react';
import {mapForLocation,tourMapKey} from './tour-map.mjs';

const MapStructure=memo(function MapStructure({plan,clipId,doorPaths}){
 return <><defs>{plan.clip&&<clipPath id={clipId}><path d={plan.clip}/></clipPath>}</defs><g className="map-floor">{!plan.unit&&<path d={plan.core} className="map-core"/>}{plan.units.map(u=><path key={u.number} d={u.path} className="map-unit"/>)}</g><g clipPath={plan.clip?`url(#${clipId})`:undefined}>
  {plan.furniture.map((f,i)=><path key={i} d={f.path} className={`map-furniture map-${f.kind}`}/>)}<path d={plan.walls} className="map-walls"/>{doorPaths.map((d,i)=><path key={i} d={d.path} className={`map-door${d.kind==='entry'?' map-entry':''}`}/>)}</g>{!plan.unit&&plan.units.map(u=><text key={u.number} x={u.label[0]} y={u.label[1]} className="map-number">{u.number}</text>)}</>;
});

export function TourMap({data,where,pose,overrides,getDoorOpen,onClose,doorRevision=0}){
 const clipId='tour-map-'+useId().replace(/:/g,''),key=tourMapKey(where);
 const plan=useMemo(()=>mapForLocation(data,where,overrides),[data,key,overrides]);
 const doorPaths=useMemo(()=>plan?.doors.map(d=>({kind:d.kind,path:(getDoorOpen?.(where.building,d.id)??d.defaultOpen)?d.open:d.closed}))||[],[plan,where.building,getDoorOpen,doorRevision]);
 if(!plan)return null;
 return <aside className="tour-map" aria-label={plan.unit?`מפת דירה ${plan.unit}`:'מפת הקומה'}><div className="tour-map-heading"><strong>{plan.unit?`דירה ${plan.unit}`:'מפת הקומה'} · {plan.floor?`קומה ${plan.floor}`:'קרקע'}</strong><button type="button" onClick={onClose} aria-label="סגירת מפה">×</button></div><svg viewBox={plan.viewBox} role="img" aria-label="מבנה הדירה, המיקום שלך וכיוון המבט"><MapStructure plan={plan} clipId={clipId} doorPaths={doorPaths}/><g transform={`translate(${pose.position.join(' ')})`} className="map-position"><g transform={`rotate(${pose.heading})`}><path d="M0,-1.5L-.75,-.35Q0,-.6 .75,-.35Z" className="map-look"/><path d="M0,-.95L-.3,-.3L.3,-.3Z" className="map-arrow"/></g><circle r=".27"/></g></svg><div className="tour-map-legend"><span className="map-legend-dot"/> המיקום שלך · החץ מציין את כיוון המבט</div></aside>;
}
