// Only use while a new view becomes interactive, never on steady-state frames.
export function createFrameTimings({clock=()=>performance.now(),counters=()=>({})}={}){
 const start=clock(),before=counters(),phases={};
 return {
  measure(label,work){const at=clock();try{return work();}finally{phases[label]=(phases[label]||0)+clock()-at;}},
  finish(){const after=counters(),result={elapsedMs:Math.round(clock()-start)};for(const [key,value]of Object.entries(phases))result[key+'Ms']=Math.round(value);for(const key of ['nodeBuilds','syncPipelines','asyncPipelines'])if(Number.isFinite(after[key])&&Number.isFinite(before[key]))result[key]=after[key]-before[key];return result;}
 };
}
