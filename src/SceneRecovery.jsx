import {useCallback,useEffect,useRef,useState} from 'react';
import {RefreshCw,X} from 'lucide-react';
import {createRestartBudget} from './scene-lifecycle.mjs';
import './scene-recovery.css';
export function useSceneRecovery(){
 const [generation,setGeneration]=useState(0),[status,setStatus]=useState('ready'),[dismissed,setDismissed]=useState(false),budget=useRef(null);if(!budget.current)budget.current=createRestartBudget();
 const restart=useCallback((automatic=false)=>{if(!budget.current.allow(automatic))return false;setDismissed(false);setStatus('ready');setGeneration(v=>v+1);return true;},[]);
 const unavailable=useCallback(()=>{setStatus('unavailable');setDismissed(false);},[]),lost=useCallback(()=>{setStatus('lost');setDismissed(false);},[]);
 useEffect(()=>{if(status!=='unavailable')return;const resume=()=>{if(document.visibilityState!=='hidden')restart(true);};document.addEventListener('visibilitychange',resume);window.addEventListener('pageshow',resume);return()=>{document.removeEventListener('visibilitychange',resume);window.removeEventListener('pageshow',resume);};},[status,restart]);
 return {generation,status,dismissed,restart,unavailable,lost,dismiss:()=>setDismissed(true)};
}
export function SceneRecoveryNotice({status,dismissed,lang,onRetry,onDismiss}){
 if(status==='ready')return null;const he=lang==='he';
 if(dismissed)return <button className="scene-retry-chip" onClick={onRetry}><RefreshCw size={16}/>{he?'חידוש תלת־ממד':'Restore 3D'}</button>;
 return <section className="scene-recovery-notice" role="status" dir={he?'rtl':'ltr'} aria-label={he?'חידוש תצוגת תלת־ממד':'Restore 3D view'}><button className="scene-recovery-close" aria-label={he?'סגירת ההודעה':'Dismiss message'} onClick={onDismiss}><X size={18}/></button><strong>{he?'חידוש תצוגת תלת־ממד':'Restoring 3D view'}</strong><p>{status==='lost'?(he?'הדפדפן עצר זמנית את התצוגה. מנסה לחדש אותה…':'The browser paused the view. Trying to restore it…'):(he?'התצוגה לא נטענה. אפשר לנסות שוב בלי לאבד את העיצוב.':'The view could not start. Retry without losing your design.')}</p><button className="scene-recovery-retry" onClick={onRetry}><RefreshCw size={16}/>{he?'ניסיון נוסף':'Try again'}</button></section>;
}
