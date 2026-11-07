import React,{useState} from 'react';
import './editor-tools.css';
export function EditorTools({session,actions,undoAvailable,redoAvailable,alternatives=[],busy}){
 const [open,setOpen]=useState(false),[name,setName]=useState(''),item=session.item||session.template,locked=!!item?.locked,editing=!!session.item;
 return <div className="editor-tools" dir="rtl">
  <div className="editor-tools-rail">
   <button type="button" aria-pressed={session.showMeasurements!==false} onClick={()=>actions.preference('showMeasurements')}>{session.showMeasurements===false?'הצג מידות':'הסתר מידות'}</button>
   <label className="editor-wall-height">גובה קירות<select aria-label="גובה קירות בעריכה" value={session.wallHeight??'full'} onChange={e=>actions.wallHeight(e.target.value==='full'?null:Number(e.target.value))}><option value="full">מלא</option><option value="1.1">110 ס״מ</option><option value="0.35">35 ס״מ</option><option value="0">ללא</option></select></label>
   <button type="button" onClick={actions.topView}>מבט מלמעלה</button><button type="button" onClick={actions.perspective}>מבט אלכסוני</button>
   <button type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>כלי עריכה ⚙</button>
   <button type="button" disabled={!undoAvailable||editing||busy} onClick={actions.undo} aria-label="ביטול פעולה אחרונה">↶</button><button type="button" disabled={!redoAvailable||editing||busy} onClick={actions.redo} aria-label="ביצוע חוזר">↷</button>
   {session.existing&&<><button type="button" onClick={actions.lock}>{locked?'שחרור נעילה':'נעילת רהיט'}</button><button type="button" onClick={actions.duplicate}>שכפול</button></>}
  </div>
  {open&&<div className="editor-tools-expanded">
   <div className="editor-toggles">{[['autoWalls','הסתרת קירות'],['ghostFurniture','רהיטים שקופים'],['smartSnap','הצמדה חכמה'],['showHandles','ידיות גרירה']].map(([key,label])=><label key={key}><input type="checkbox" checked={!!session[key]} onChange={()=>actions.preference(key)}/>{label}</label>)}</div>
   {!editing&&session.stage!=='compare'&&<><form onSubmit={e=>{e.preventDefault();actions.saveAlternative(name);setName('');}}><input aria-label="שם חלופת הסידור" placeholder="שם חלופה לחדר" maxLength={60} required value={name} onChange={e=>setName(e.target.value)}/><button type="submit" disabled={busy}>שמור חלופה</button></form>{alternatives.length>0&&<label>השוואת חלופה<select aria-label="השוואת חלופה" value="" onChange={e=>actions.compareAlternative(e.target.value)}><option value="">בחירת חלופה להצגה</option>{alternatives.map(a=><option value={a.id} key={a.id}>{a.title}</option>)}</select></label>}<small>החלופות נשמרות בדפדפן. גיבוי לקובץ זמין באפשרויות ← שמירה וטעינה.</small></>}
  </div>}
 </div>;
}
export function ExactDistanceEditor({session,actions}){
 const [value,setValue]=useState(String(Math.round(session.distanceGuide.gap*1000)/10));
 return <form className="exact-distance" onSubmit={e=>{e.preventDefault();actions.setDistance(value);}}><label>מרחק בס״מ<input autoFocus type="number" inputMode="decimal" min="0" max="5000" step=".1" value={value} onChange={e=>setValue(e.target.value)} required/></label><button type="submit">החל</button><button type="button" onClick={()=>actions.distance(null)}>ביטול</button></form>;
}
