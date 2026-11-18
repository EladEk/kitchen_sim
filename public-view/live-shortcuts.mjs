// Keyboard shortcuts for live furniture editing. Pure mapping so it can be tested
// without a DOM; DistrictViewer turns the returned name into a liveActions call.
const typing=target=>!!target&&(target.isContentEditable||/^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName||''));
export function liveShortcut(event,session){
 if(!session||event.defaultPrevented||event.altKey||typing(event.target))return null;
 const key=(event.key||'').toLowerCase(),mod=event.ctrlKey||event.metaKey,stage=session.stage||'categories';
 const placing=(stage==='place'||stage==='move'||stage==='pick')&&!!session.item;
 // Same rule as the ↶/↷ buttons: history is unavailable while an item is open.
 if(mod&&(key==='z'||key==='y'))return session.item?null:key==='y'||event.shiftKey?'redo':'undo';
 if(mod)return null;
 if(key==='escape')return placing||stage==='configure'?'cancel':stage==='items'?'back':null;
 if((key==='r'||key==='ר')&&placing&&!session.item?.locked)return event.shiftKey?'rotateBack':'rotate';
 if((key==='delete'||key==='backspace')&&session.existing&&!session.item?.locked)return 'remove';
 if(key==='enter'&&placing&&session.hasPoint&&!session.error&&!session.item?.locked)return 'commit';
 return null;
}
export const LIVE_SHORTCUT_HELP='קיצורים: R סיבוב · Enter שמירה · Esc ביטול · Delete מחיקה · Ctrl+Z ביטול פעולה';
