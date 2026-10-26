import {ownerCars} from './owner-parking.mjs';
import {useState} from 'react';
import {HOUSE_OUTLINE,PLOT,yardForSettings} from './home-model.mjs';
import {CAMERA_SPEC,cameraPlacements,cameraTargets,cameraObstacles,assessTarget,coveragePolygon,ownerParking} from './security-cameras.mjs';
import {normalizeCameraPlan} from './security-camera-settings.mjs';
import './security-cameras.css';
const points=p=>p.map(v=>v.join(',')).join(' ');
export function SecurityCameraPlanner({settings,onChange,onView}){
 const [selected,setSelected]=useState('C1'),cameras=cameraPlacements(settings),c=cameras.find(x=>x.id===selected),targets=cameraTargets(settings),obstacles=cameraObstacles(settings),shed=yardForSettings(settings).service.shed;
 const edit=(key,value)=>onChange('cameraPlan',{...normalizeCameraPlan(settings.cameraPlan),[c.id]:{...normalizeCameraPlan(settings.cameraPlan)[c.id],[key]:Number(value)}});
 return <details className="security-planner" dir="rtl"><summary>תכנון 3 מצלמות · חניות 24–25</summary><p>תכנון אישי משוער · שלוש נקודות התקנה על קירות דירה 4 בלבד.</p>
 <label className="security-toggle"><input type="checkbox" checked={!!settings.showSecurityCameras} onChange={e=>onChange('showSecurityCameras',e.target.checked)}/> הצגת המצלמות וזוויות הצילום בתלת־ממד</label>
 <div className="security-map"><svg viewBox="-12 -5 37 36" role="img" aria-label="תכנון מצלמות על הדירה וחניות 24 ו־25"><rect x="-12" y="-5" width="37" height="36" fill="#f1f0e8"/><polygon points={points(PLOT)} fill="#d9e1cc"/>{ownerParking.map(b=><g key={b.id}><polygon points={points(b.polygon)} fill="#d1d6d5" stroke="#66716c" strokeWidth=".06"/><text x={b.polygon[0][0]+1.2} y={(b.polygon[0][1]+b.polygon[2][1])/2} textAnchor="middle" fontSize=".7">{b.label}</text></g>)}
 {ownerCars().map(car=><rect key={car.id} x={car.x-car.width/2} y={car.z-car.length/2} width={car.width} height={car.length} rx=".3" fill={car.color} stroke="#304740" strokeWidth=".08"/>)}
 {cameras.map(cam=><polygon key={cam.id} points={points(coveragePolygon(cam,settings))} fill={cam.color} fillOpacity={cam.id===selected ? .2 : .07} stroke={cam.color} strokeWidth=".045"/>)}
 <polygon points={points(HOUSE_OUTLINE)} fill="#e6ded0" stroke="#6d7166" strokeWidth=".1"/><polygon points={points(shed.polygon)} fill="#c3b4a2" stroke="#736d62" strokeWidth=".07"/><text x={shed.minX+shed.w/2} y={shed.minZ+shed.d/2} textAnchor="middle" fontSize=".5">מחסן</text>
 {targets.filter(t=>!t.id.startsWith('site-parking')).map(t=><circle key={t.id} cx={t.point[0]} cy={t.point[2]} r=".13" fill={cameras.some(cam=>assessTarget(cam,t,obstacles).state==='visible')?'#20856d':'#bf4736'}><title>{t.label}</title></circle>)}
 {cameras.map(cam=><g key={cam.id}><circle cx={cam.position[0]} cy={cam.position[2]} r=".28" fill={cam.color}/><text x={cam.position[0]+.5} y={cam.position[2]-.4} fontSize=".65" fill={cam.color}>{cam.id}</text></g>)}<path d="M-10 28h5m-5-.2v.4m5-.4v.4" stroke="#36483f" strokeWidth=".08"/><text x="-7.5" y="29" textAnchor="middle" fontSize=".55">5 מ׳ · לפי המודל</text></svg></div>
 <small>מבט המצלמה משתמש בזוויות קבועות ואינו מתרחב עם מסך הטלפון. המניפות הן חתך אופקי בגובה המצלמה; הטבלה בודקת גם הטיה אנכית וחסימת קירות, מחסן ורכבים במודל. נקודה ירוקה אינה הבטחת כיסוי של כל האובייקט.</small>
 <div className="security-tabs">{cameras.map(cam=><button type="button" key={cam.id} aria-pressed={selected===cam.id} onClick={()=>setSelected(cam.id)} style={{borderColor:cam.color}}>{cam.id}</button>)}</div><strong>{c.id} · {c.label}</strong>
 <label>מיקום לאורך הקיר: {Math.round(c.t*100)}%<input type="range" min=".04" max=".96" step=".01" value={c.t} onChange={e=>edit('t',e.target.value)}/></label>
 <label>גובה התקנה משוער: {c.height.toFixed(2)} מ׳<input type="range" min={c.id==='C2'?2.2:2.4} max="2.7" step=".05" value={c.height} onChange={e=>edit('height',e.target.value)}/></label>
 <label>כיוון אופקי: {c.yaw}°<input type="range" min="-180" max="180" step="1" value={c.yaw} onChange={e=>edit('yaw',e.target.value)}/></label>
 <label>הטיה כלפי מטה: {c.tilt}°<input type="range" min="0" max="55" step="1" value={c.tilt} onChange={e=>edit('tilt',e.target.value)}/></label>
 <button type="button" className="hs-button hs-outline" onClick={()=>onView(c)}>מבט דרך המצלמה {c.id}</button>
 <div className="security-table"><table><thead><tr><th>יעד</th><th>קו ראייה משוער</th></tr></thead><tbody>{targets.map(t=>{const results=cameras.map(cam=>({id:cam.id,...assessTarget(cam,t,obstacles)})),seen=results.filter(r=>r.state==='visible');return <tr key={t.id}><td>{t.label}</td><td>{seen.length?seen.map(r=>`${r.id} · ${r.distance.toFixed(1)} מ׳`).join(' / '):'אין כיסוי מאומת בהצבה זו'}</td></tr>;})}</tbody></table></div>
 <p><strong>אין כיסוי מלא מובטח בשלוש מצלמות.</strong> פינות ושקעים בחזית מסתירים חלק מהחלונות. חניות 24–25 בטור, ולכן רכב בחניה הקרובה עלול להסתיר את הרחוק. שני הרכבים להמחשה, במידות 1.8×4.05 מ׳ ובגובה 1.6 מ׳, ונכללים בחישוב. גדר, צמחייה, תריסים ופרגולה אינם כלולים במלואם בחישוב החסימות; יש לכוון ולבדוק בשטח, ביום ובלילה.</p>
 <p>רוחב שדה הצילום בזווית 87° הוא כ־9.5 מ׳ במרחק 5 מ׳ וכ־19 מ׳ במרחק 10 מ׳, במישור ניצב לציר העדשה. אלו מידות גאומטריות, לפני חסימות — לא טווח זיהוי.</p><p>המוצר שמוצג בקישור: <a href={CAMERA_SPEC.source} target="_blank" rel="noreferrer">Reolink {CAMERA_SPEC.model}</a> · ‎87° אופקי / ‎44° אנכי · 8MP · PoE. שם RLK8-810B4-A מופיע בכתובת החנות — יש לוודא את הדגם והעדשה לפני רכישה. ראיית לילה עד 30 מ׳ היא נתון תאורה של היצרן, לא טווח מובטח לזיהוי פנים או לוחית רישוי. לכל מצלמה נדרש כבל רשת למקליט.</p>
 <button type="button" onClick={()=>onChange('cameraPlan',normalizeCameraPlan())}>איפוס הצבת המצלמות</button>
 </details>;
}
