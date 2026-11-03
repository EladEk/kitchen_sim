import {SITE_TRACE} from './building-site-trace.mjs';

// The cyan main-meter symbol on page 2 is shared plot infrastructure, above
// 4101 in that drawing. It must never be cloned with each apartment building.
// The copied neighbour gardens are illustrative. Reconcile the symbol with
// their outside fence edge, leaving the 4 m perimeter footway centre clear.
const original=SITE_TRACE.features.find(f=>f.id==='site-main-water-meter');
const shiftZ=-5.744;
export function siteMainMeterFeature(){
 return {...original,position:[original.position[0],original.position[1]+shiftZ],
  polygon:original.polygon.map(([x,z])=>[x,z+shiftZ]),sourcePosition:[...original.position],
  placementReconciled:true,scope:'shared-plot-1410',
  noteHe:'מד המים הראשי הוא מתקן משותף למגרש, ליד 4101. המיקום הותאם לשפה החיצונית של הגדר במודל; זה אינו מיקום מדוד בשטח.',
  noteEn:'Shared plot1410 main meter beside4101. Reconciled to the outside fence edge of the reconstructed gardens; not an as-built survey.'};
}
