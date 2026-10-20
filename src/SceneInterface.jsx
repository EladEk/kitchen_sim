import {useEffect,useRef} from 'react';
import {Eye} from 'lucide-react';

// Keep controls mounted so their selections, scroll and minimized states survive.
// Native hidden also removes their descendants from touch and keyboard access.
export function SceneUiLayer({hidden,children}){
 return <div className="scene-ui-layer" hidden={hidden} inert={hidden||undefined}>{children}</div>;
}

export function restoreInterfaceOnEscape(event,onRestore){
 if(event.key!=='Escape')return;
 event.preventDefault();event.stopImmediatePropagation();onRestore();
}

export function SceneRestoreControls({hidden,lang,onRestore}){
 const button=useRef(),restore=useRef(onRestore),wasHidden=useRef(false);restore.current=onRestore;
 useEffect(()=>{
  if(!hidden){if(wasHidden.current)document.querySelector('[data-scene-ui-toggle]')?.focus({preventScroll:true});wasHidden.current=false;return;}
  wasHidden.current=true;button.current?.focus({preventScroll:true});
  // Capture before the walk/kitchen Escape handlers: restore UI without exiting.
  const key=e=>restoreInterfaceOnEscape(e,()=>restore.current());
  window.addEventListener('keydown',key,true);return()=>window.removeEventListener('keydown',key,true);
 },[hidden]);
 if(!hidden)return null;
 const text=lang==='he'?'הצגת הפקדים':'Show controls';
 return <button ref={button} className="scene-restore-controls" data-scene-ui-restore aria-label={text} title={`${text} · Esc`} onClick={onRestore}><Eye size={17}/><span>{text}</span></button>;
}
