import {Camera,Ruler,ArrowUpRight} from 'lucide-react';
import {EXTERIOR_LAYOUT} from './home-model.mjs';

export function ExteriorFacts({roomId,lang,onInspect,onSource,compact=false}){
 const he=lang==='he',t=(a,b)=>he?a:b,items=EXTERIOR_LAYOUT.elements.filter(e=>compact||roomId==='garden'||e.roomId===roomId||roomId==='safe-room'&&e.id.startsWith('ac-'));
 if(!items.length)return null;
 return <section className={compact?'hs-building-facts hs-garden-facts':'hs-construction-card hs-garden-facts'}>
  <h3><Camera size={16}/>{t('פרטי החוץ לפי הצילומים','Exterior details from your photos')}</h3>
  <p>{t('מבואת השירות מקורה ושקועה. חלון המטבח נמצא בקצה מעבר חיצוני עמוק ופתוח לשמים. שתי יחידות המזגן על קיר הממ״ד מופיעות בנפרד, עם שטח פנוי מוצע מול המאווררים.','The service porch is covered and recessed. The kitchen window ends a deep open-air passage. Two separate AC units are mounted beside the safe room, with a proposed clear area in front of the fans.')}</p>
  <div className="hs-garden-measures">{items.map(e=><button key={e.id} onClick={()=>onInspect(e.id,true)}><span><strong>{he?e.he:e.en}</strong><small>{e.id.startsWith('ac-')?t('דגם ומידות לא ידועים · המחשה','Unknown model and sizes · illustrative'):t('רוחב × עומק · הערכה מהתוכנית','Width × depth · plan-based estimate')}</small></span><bdi>≈ {e.dimensions.slice(0,2).map(v=>(v*100).toFixed(0)).join(' × ')} cm</bdi><Ruler size={14}/></button>)}</div>
  <p className="hs-small-note">{t('לחיצה פותחת מבט חוץ ומידות. רוחב ועומק השקע לפי קנה מידה נומינלי; הגבהים ומידות המזגנים משוערים. סימון השטח מול המזגנים אינו דרישת יצרן מאומתת.','Select a detail for an exterior view and dimensions. Recess spans use nominal plan scale; heights and AC dimensions are estimated. The AC frontage marking is not a verified manufacturer clearance.')}</p>
  <button className="hs-text-link" onClick={()=>onSource('exterior-details',roomId==='kitchen'?2:roomId==='laundry'?1:4)}><Camera size={14}/>{t('התמונות ופרט התוכנית','Photos & plan detail')}<ArrowUpRight size={13}/></button>
 </section>;
}
