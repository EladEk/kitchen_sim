// A renderer, its camera and its render targets have one owner while preparing
// a view. Coalesce mobile viewport changes until that owner has finished.
export function createRendererWork(applyResize=()=>{}){
 let serial=Promise.resolve(),busy=false,pendingResize=false,disposed=false;
 const flush=()=>{if(!disposed&&!busy&&pendingResize){pendingResize=false;applyResize();}};
 return {
  get busy(){return busy;},
  resize(){pendingResize=true;flush();},
  run(work,{signal}={}){
   const task=serial.then(async()=>{
    if(disposed||signal?.aborted)return false;
    flush();busy=true;
    try{return await work();}finally{busy=false;flush();}
   });
   serial=task.catch(()=>{});return task;
  },
  dispose(){disposed=true;pendingResize=false;}
 };
}
