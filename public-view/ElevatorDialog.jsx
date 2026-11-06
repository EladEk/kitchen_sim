import React,{useEffect,useRef} from 'react';
export function ElevatorDialog({selection,onClose,onFloor}){
 const ref=useRef();useEffect(()=>{const d=ref.current;if(selection&&!d.open)d.showModal();else if(!selection&&d.open)d.close();},[selection]);
 return <dialog ref={ref} className="elevator-dialog" aria-labelledby="elevator-title" onClose={onClose} onCancel={e=>{e.preventDefault();onClose();}}><div><button type="button" autoFocus className="elevator-close" onClick={onClose} aria-label="סגירת בחירת קומה">×</button><h2 id="elevator-title">מעלית · בחירת קומה</h2><p>בניין {selection?.building} · יציאה ללובי הקומה</p><div className="elevator-floors">{Array.from({length:9},(_,i)=>8-i).map(floor=><button type="button" key={floor} disabled={floor===selection?.floor} onClick={()=>onFloor(floor)}>{floor===0?'קרקע':`קומה ${floor}`}{floor===selection?.floor?' · כאן':''}</button>)}</div><small>מעבר מהיר בין קומות הבניין</small></div></dialog>;
}
