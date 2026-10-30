export function bindRuntimeLifecycle({renderer,frame,ready=()=>true,onSuspend=()=>{},onResume=()=>{},onLost=()=>{},onRestored=()=>{},onFailure=()=>{},win=window,doc=document,clock=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}){
 const canvas=renderer.domElement;let disposed=false,active=false,lost=false,hiddenPage=false,failed=false,timer=null,losses=[];
 const canRender=()=>!disposed&&!failed&&!lost&&!hiddenPage&&!doc.hidden&&ready();
 function stop(){if(active){active=false;renderer.setAnimationLoop(null);}onSuspend();}
 function resume(){if(!canRender()||active)return;onResume();active=true;renderer.setAnimationLoop(frame);}
 function fail(error){if(disposed||failed)return;failed=true;stop();onFailure(error);}
 const visibility=()=>doc.hidden?stop():resume();
 const hide=()=>{hiddenPage=true;stop();},show=()=>{hiddenPage=false;resume();};
 const contextLost=event=>{
  event.preventDefault();if(disposed)return;lost=true;stop();if(timer!==null)cancel(timer);
  const now=clock();losses=losses.filter(t=>now-t<30000);losses.push(now);
  if(losses.length>2){fail(new Error('Graphics recovery limit'));return;}
  onLost();timer=schedule(()=>{timer=null;fail(new Error('Graphics recovery timed out'));},20000);
 };
 const contextRestored=()=>{if(disposed||failed)return;if(timer!==null)cancel(timer);timer=null;lost=false;onRestored();resume();};
 doc.addEventListener('visibilitychange',visibility);win.addEventListener('pagehide',hide);win.addEventListener('pageshow',show);
 canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 return {canRender,resume,fail,dispose(){if(disposed)return;disposed=true;stop();if(timer!==null)cancel(timer);timer=null;losses.length=0;doc.removeEventListener('visibilitychange',visibility);win.removeEventListener('pagehide',hide);win.removeEventListener('pageshow',show);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);}};
}
