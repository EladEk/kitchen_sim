import {Map,MapPin,X} from 'lucide-react';
import {commonSpace} from './common-spaces.mjs';
import {BuildingMiniMap} from './BuildingTour.jsx';
import {walkingLocation} from './walking-location.mjs';
import {duplexForUnit} from './building-duplexes.mjs';
import './walking-location.css';

export function WalkingLocation({position,context,destination,lang='he',mapOpen=false,onMap,onSource}){
 const he=lang==='he',at=walkingLocation(position,context,destination),common=commonSpace(at.common),duplex=at.ready?duplexForUnit(at.unit,at.floor):null,floor=at.floor?(he?`קומה ${at.floor}`:`Floor ${at.floor}`):(he?'קומת קרקע':'Ground floor');
 const place=!at.ready?(he?'מאתר מיקום…':'Locating…'):at.lift?(he?'בתא המעלית':'Inside elevator'):at.unit?(he?`דירה ${at.unit}`:`Apartment ${at.unit}`):common?(he?common.he:common.en):(he?'שטח משותף':'Common area');
 return <aside className="hs-walking-location" aria-label={he?'המיקום שלי בסיור':'Your walking location'} onPointerDown={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape'&&mapOpen){e.preventDefault();e.stopPropagation();onMap(false);}}}>
  <div className="hs-walking-location-heading"><MapPin size={16} aria-hidden="true"/><div aria-live="polite" aria-atomic="true"><small>{at.ready?floor:'—'}</small><strong>{place}</strong>{duplex&&<small>{he?`דופלקס · כניסה בקומה ${duplex.entryFloor}`:`Duplex · entry on floor ${duplex.entryFloor}`}</small>}</div><button type="button" aria-label={mapOpen?(he?'סגירת מפה':'Close map'):(he?'פתיחת מפה':'Open map')} aria-expanded={mapOpen} aria-controls="walking-floor-map" onClick={()=>onMap(!mapOpen)}>{mapOpen?<X size={17}/>:<Map size={17}/>}<span>{mapOpen?(he?'סגור':'Close'):(he?'מפה':'Map')}</span></button></div>
  {mapOpen&&<div id="walking-floor-map" className="hs-walking-location-map"><BuildingMiniMap floor={at.floor} position={position} lang={lang} onSource={onSource}/><span className="hs-walking-location-key"><i aria-hidden="true"/>{he?'המיקום וכיוון המבט שלי':'Your position and viewing direction'}</span></div>}
 </aside>;
}
