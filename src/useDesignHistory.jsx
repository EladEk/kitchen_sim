import {useState,useRef,useCallback,useEffect} from 'react';
import {newHistory,commitDesign,stepHistory} from './design-history.mjs';
export function useDesignHistory(initial){
 const [state,setState]=useState(()=>newHistory(typeof initial==='function'?initial():initial)),current=useRef(state);
 const set=useCallback((update,meta)=>{const before=current.current,next=typeof update==='function'?update(before.present):update;current.current=commitDesign(before,next,meta);setState(current.current);},[]);
 const step=useCallback(direction=>{current.current=stepHistory(current.current,direction);setState(current.current);},[]);
 const undo=useCallback(()=>step('undo'),[step]),redo=useCallback(()=>step('redo'),[step]);
 useEffect(()=>{const key=e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||e.target?.closest?.('input,textarea,select,[contenteditable=true]'))return;const k=e.key.toLowerCase();if(k==='z'||k==='y'){e.preventDefault();step(k==='y'||e.shiftKey?'redo':'undo');}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[step]);
 return [state.present,set,{undo,redo,canUndo:!!state.past.length,canRedo:!!state.future.length}];
}
