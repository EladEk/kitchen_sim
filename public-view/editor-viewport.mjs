// Dock changes resize the viewport, never refit the apartment or change pose.
export function resizeEditorViewport({renderer,camera,presentation,width,height,ratio}){
 renderer.setPixelRatio(ratio);renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();presentation.resize(width,height);
}

// Opening the editor docks a panel (bottom sheet on phones, side dock on wide
// screens) and shrinks the canvas. The apartment pose was fitted for the old,
// taller viewport, so on a phone it ended up a small speck above the sheet.
// Refit once, after the layout has settled and the renderer is idle.
export function scheduleEditorFraming(frame,{settleFrames=2,timeoutMs=8000,requestFrame=globalThis.requestAnimationFrame?.bind(globalThis),cancelFrame=globalThis.cancelAnimationFrame?.bind(globalThis),now=()=>performance.now()}={}){
 if(typeof requestFrame!=='function')return ()=>{};
 const started=now();let handle=0,cancelled=false,settled=0;
 const tick=()=>{
  if(cancelled)return;
  if(settled<settleFrames){settled++;handle=requestFrame(tick);return;}
  let done=false;try{done=frame()!==false;}catch{done=true;}
  if(!done&&now()-started<timeoutMs)handle=requestFrame(tick);
 };
 handle=requestFrame(tick);
 return ()=>{cancelled=true;cancelFrame?.(handle);};
}
