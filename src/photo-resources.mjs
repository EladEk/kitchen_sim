const safeDispose=object=>{try{object?.dispose?.();}catch{/* Continue retiring the remaining owned resources. */}};

// Terminating GenerateMeshBVHWorker alone leaves its generate() promise pending.
// Settle our caller too, so it cannot retain a canceled snapshot forever.
export function cancelableBVHWorker(worker){
 let disposed=false;const pending=new Set();
 return {generate(...args){
  if(disposed)return Promise.reject(new DOMException('Canceled','AbortError'));
  return new Promise((resolve,reject)=>{const abort=()=>reject(new DOMException('Canceled','AbortError'));pending.add(abort);Promise.resolve().then(()=>{if(disposed)throw new DOMException('Canceled','AbortError');return worker.generate(...args);}).then(resolve,reject).finally(()=>pending.delete(abort));});
 },dispose(){if(disposed)return;disposed=true;for(const abort of pending)abort();pending.clear();safeDispose(worker);}};
}

export function retirePhotoResources({tracer,worker,snapshot,renderer,canvas}={}){
 safeDispose(worker);
 // three-gpu-pathtracer 0.0.27 omits these allocations from its public dispose.
 if(tracer){safeDispose(tracer._lowResPathTracer);safeDispose(tracer._lowResPathTracer?.material);safeDispose(tracer._pathTracer?.material);safeDispose(tracer._generator?.geometry);safeDispose(tracer._internalBackground);}
 safeDispose(tracer);safeDispose(snapshot);safeDispose(renderer);
 try{renderer?.forceContextLoss?.();}catch{}
 (canvas||renderer?.domElement)?.remove?.();
}

export function disposeObjectResources(root,{skipTextures=new Set()}={}){
 if(!root)return;const resources=new Set(),textures=new Set();
 root.traverse(o=>{if(o.isInstancedMesh)resources.add(o);if(o.geometry)resources.add(o.geometry);const mats=Array.isArray(o.material)?o.material:o.material?[o.material]:[];for(const m of mats){resources.add(m);for(const v of Object.values(m))if(v?.isTexture&&!skipTextures.has(v))textures.add(v);}});
 for(const t of textures){safeDispose(t);if(t.source)t.source.data=null;}
 for(const r of resources)safeDispose(r);resources.clear();textures.clear();root.removeFromParent();root.clear();
}

export function releaseSceneRenderer(renderer){safeDispose(renderer);try{renderer?.forceContextLoss?.();}catch{}renderer?.domElement?.remove?.();}
