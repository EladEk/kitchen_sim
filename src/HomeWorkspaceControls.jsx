import {Layers,Move,SlidersHorizontal,Check,X} from 'lucide-react';
import {ROOMS,FURNITURE,getFurniture,editableFurniture} from './home-model.mjs';
import {FurniturePositionControls} from './FurniturePositionControls.jsx';

export const furnitureLabel=(f,he)=>({bed:he?'מיטה':'Bed',desk:he?'שולחן':'Desk',wardrobe:he?'ארון':'Wardrobe','office-cabinet':he?'ארון':'Wardrobe'}[f?.kind]||f?.id||'');
export function furnitureEditorSelection(roomId,itemId){
 const requested=getFurniture(itemId),first=editableFurniture(requested)?requested:FURNITURE.find(f=>f.roomId===roomId&&editableFurniture(f))||FURNITURE.find(editableFurniture);
 return {roomId:first.roomId,itemId:first.id};
}
export function HomeViewChooser({mode,roomId,lang,editing,onMode,onRoom}){
 const he=lang==='he',rooms=editing?ROOMS.filter(r=>FURNITURE.some(f=>f.roomId===r.id&&editableFurniture(f))):ROOMS;
 return <div className="hs-simple-topbar"><select aria-label={he?'בחירת חדר':'Choose room'} value={roomId} onChange={e=>onRoom(e.target.value)}>{rooms.map(r=><option key={r.id} value={r.id}>{he?r.he:r.en}</option>)}</select>{editing?<span>{he?'מבט על · גרירת ריהוט':'Floor plan · drag furniture'}</span>:<select aria-label={he?'בחירת תצוגה':'Choose view'} value={mode} onChange={e=>onMode(e.target.value)}>{[['overview','כל הבית','Whole home'],['room','מבט חדר','Room view'],['walk','סיור רגלי','Walk through'],['plan','תוכנית','Floor plan']].map(([id,iw,en])=><option key={id} value={id}>{he?iw:en}</option>)}</select>}</div>;
}
export function HomePrimaryActions({panel,lang,onRooms,onEdit,onOptions,onDone}){
 const he=lang==='he';
 return <nav className="hs-simple-actions" aria-label={he?'פעולות ראשיות':'Main actions'}>{panel==='furniture'?<><span>{he?'השינויים נשמרים אוטומטית':'Changes save automatically'}</span><button className="hs-simple-done" onClick={onDone}><Check size={19}/>{he?'סיום עריכה':'Done editing'}</button></>:<>{[[Layers,he?'חדרים':'Rooms',onRooms,panel==='rooms'],[Move,he?'הזזת ריהוט':'Move furniture',onEdit,false],[SlidersHorizontal,he?'אפשרויות':'Options',onOptions,panel==='options']].map(([Icon,label,action,active])=><button key={label} aria-expanded={active} onClick={action}><Icon size={18}/><span>{label}</span></button>)}</>}</nav>;
}
export function HomePanelHeading({title,onClose,lang}){
 return <div className="hs-simple-panel-heading"><strong>{title}</strong><button aria-label={lang==='he'?'סגירת הלוח':'Close panel'} onClick={onClose}><X size={19}/></button></div>;
}
export function HomeFurnitureEditor({settings,roomId,itemId,lang,onSelect,onMove,error}){
 const he=lang==='he',item=getFurniture(itemId,settings),items=FURNITURE.filter(f=>f.roomId===roomId&&editableFurniture(f));
 return <div className="hs-simple-editor"><p className="hs-editor-instruction">{he?'בחר רהיט וגרור אותו בתוכנית. אפשר להזיז גם בחצים — 10 ס״מ בכל לחיצה.':'Choose an item and drag it on the plan, or use the arrows — 10 cm per press.'}</p><div className="hs-furniture-picker" role="group" aria-label={he?'בחירת רהיט להזזה':'Choose furniture to move'}>{items.map(f=><button key={f.id} aria-pressed={f.id===itemId} onClick={()=>onSelect(f.id)}>{furnitureLabel(f,he)}</button>)}</div><FurniturePositionControls simple item={item} lang={lang} step={.1} onMove={onMove} error={error}/></div>;
}
