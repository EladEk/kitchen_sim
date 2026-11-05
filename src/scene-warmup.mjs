import {Group,Frustum,Matrix4,Box3,Vector3} from 'three';

// Keep actual instanced/skinned object identities: r185 binds their per-object
// buffers when building node materials. Static panels can share shader layouts.
const perObject=o=>o.isInstancedMesh||o.isSkinnedMesh||o.isBatchedMesh||o.morphTargetInfluences?.length;
function compileKey(o){
 const attributes=Object.entries(o.geometry?.attributes||{}).map(([name,a])=>[name,a.itemSize,a.normalized,a.gpuType,(a.array||a.data?.array)?.constructor.name,!!a.isInstancedBufferAttribute,a.meshPerAttribute||0,a.data?.stride||0,a.offset||0].join(':')).sort();
 return JSON.stringify([o.type,perObject(o)?o.uuid:null,[o.material].flat().map(m=>[m?.uuid,m?.version]),attributes,o.geometry?.index?.array?.constructor.name||null,!!o.instanceColor,!!o.receiveShadow,!!o.castShadow,Object.keys(o.geometry?.morphAttributes||{}),!!o.geometry?.morphTargetsRelative,o.skeleton?.bones.length||0]);
}
export function nativeCompileList(objects){
 const unique=new Map();for(const o of objects){const key=compileKey(o);if(!unique.has(key))unique.set(key,o);}
 const group=new Group();group.matrixAutoUpdate=false;group.matrixWorldAutoUpdate=false;group.children=[...unique.values()];return group;
}
function drawable(o){return (o.isMesh||o.isLine||o.isPoints||o.isSprite)&&!o.userData.furnitureCollisionProxy&&(!o.isInstancedMesh||o.count>0)&&o.geometry?.drawRange?.count!==0&&[o.material].flat().some(m=>m&&m.visible!==false&&m.opacity!==0);}
function lightingKey(renderer,scene){const lights=[];scene.traverseVisible(o=>{if(o.isLight)lights.push([o.uuid,o.type,!!o.castShadow]);});return JSON.stringify([lights,scene.environment?.uuid,scene.fog?.type,scene.overrideMaterial?.uuid,!!renderer.shadowMap?.enabled,renderer.shadowMap?.type,renderer.getMRT?.()?.uuid,renderer.getRenderTarget?.()?.samples,renderer.getRenderTarget?.()?.textures?.map(t=>[t.name,t.type,t.format])]);}

export function createSceneWarmup(renderer,scene,camera,{limit=64,maxNativeMs=10000,clock=()=>performance.now(),batchSize=24,viewOnly=false,onDiagnostic=()=>{}}={}){
 let disposed=false,epoch=0,uploaded=new WeakSet(),compiled=new WeakMap(),sceneKey='',serial=null;const prepared=new Set(),layouts=new Set();
 const diagnose=(event,details={})=>{try{onDiagnostic({event,details});}catch{}};
 const remember=object=>{const signature=compileKey(object);compiled.set(object,signature);if(!perObject(object)){layouts.add(signature);if(layouts.size>2048)layouts.delete(layouts.values().next().value);}};
 async function prepareScene(key,{signal,all=false,draw=false,renderDepth,neighborhood,preparationObjects=[],beforeReady=()=>{},renderFrame=()=>renderer.render(scene,camera),onProgress=()=>{}}={}){
  if(disposed||signal?.aborted)return false;if(prepared.has(key)&&!renderer.isWebGPURenderer){onProgress(1);return false;}
  const version=epoch,objects=[],textures=new Set(),valid=()=>!disposed&&!signal?.aborted&&epoch===version;
  scene.updateMatrixWorld?.(true);camera.updateMatrixWorld?.(true);
  const frustum=renderer.isWebGPURenderer&&viewOnly&&!all?new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse),camera.coordinateSystem,camera.reversedDepth):null;
  const near=neighborhood?new Box3().setFromCenterAndSize(camera.getWorldPosition(new Vector3()),new Vector3(neighborhood.radius*2,neighborhood.height*2,neighborhood.radius*2)):null,bounds=new Box3();
  const nearby=o=>{if(!near)return false;if(o.isInstancedMesh){if(!o.boundingBox)o.computeBoundingBox();bounds.copy(o.boundingBox);}else{if(!o.geometry.boundingBox)o.geometry.computeBoundingBox();bounds.copy(o.geometry.boundingBox);}return near.intersectsBox(bounds.applyMatrix4(o.matrixWorld));};
  const additional=new Set(preparationObjects);
  const collect=o=>{if(!drawable(o))return;if(frustum&&o.frustumCulled!==false&&!(o.isSprite?frustum.intersectsSprite(o):frustum.intersectsObject(o))&&!nearby(o)&&!additional.has(o))return;objects.push(o);for(const m of[o.material].flat().filter(Boolean))for(const t of Object.values(m))if(t?.isTexture&&!t.isRenderTargetTexture&&!uploaded.has(t))textures.add(t);};
  (all?scene.traverse:scene.traverseVisible).call(scene,collect);
  let target=null,entries=[],cached=0;
  if(renderer.isWebGPURenderer){
   const nextKey=lightingKey(renderer,scene)+':depth:'+(renderDepth??0);if(nextKey!==sceneKey){compiled=new WeakMap();layouts.clear();sceneKey=nextKey;}
   target=nativeCompileList(objects);const candidates=target.children;entries=candidates.map(object=>({object,signature:compileKey(object)})).filter(({object,signature})=>compiled.get(object)!==signature&&(perObject(object)||!layouts.has(signature)));cached=candidates.length-entries.length;target.children=entries.map(e=>e.object);
  }
  const compileSteps=target?Math.ceil(entries.length/batchSize):1,total=Math.max(1,textures.size+compileSteps+(draw?1:0));let done=0;
  const report=()=>{if(valid())onProgress(Math.min(1,done/total));};diagnose('texture-upload',{textures:textures.size,drawObjects:objects.length,compileObjects:entries.length,cachedObjects:cached,compileBatches:compileSteps,viewOnly:!!frustum,neighborhood:!!near});report();
  for(const t of textures){if(!valid())return false;await renderer.initTexture?.(t);if(!valid())return false;uploaded.add(t);done++;report();}
  diagnose('shader-compilation',{compileBatches:compileSteps,compileObjects:entries.length,cachedObjects:cached});
  if(renderer.isWebGPURenderer){
   const shadows=[],started=clock();
   // Keep the real lights/environment, parent pointers, instancing buffers and
   // first-draw shadow flags. No synthetic representative instanced meshes.
   scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.shadow){shadows.push([o.shadow,o.shadow.autoUpdate,o.shadow.needsUpdate]);o.shadow.autoUpdate=false;o.shadow.needsUpdate=false;}});
   try{for(let i=0;i<entries.length;i+=batchSize){
    if(!valid())return false;
    const batch=entries.slice(i,i+batchSize),batchStarted=clock();target.children=batch.map(e=>e.object);
    // compileAsync performs its own camera culling. The neighborhood was
    // already selected above; include its rear-facing objects in the GPU work.
    const culling=batch.map(({object})=>[object,object.frustumCulled]);
    try{for(const [object]of culling)object.frustumCulled=false;await renderer.compileAsync(target,camera,scene,renderDepth);}
    finally{for(const [object,culled]of culling)object.frustumCulled=culled;}if(!valid())return false;
    const batchElapsedMs=clock()-batchStarted;
    // A healthy sequence can legitimately take more than one minute on a
    // phone. Limit individual expensive batches, not elapsed time across all
    // batches that are successfully making progress.
    if(batchElapsedMs>maxNativeMs)throw Object.assign(Error('A native compilation batch exceeded device budget'),{name:'SceneDrawError',code:'WEBGPU_PREPARATION_BUDGET',details:{elapsedMs:Math.round(clock()-started),batchElapsedMs:Math.round(batchElapsedMs),budgetMs:maxNativeMs,budgetScope:'single-compilation-batch',completedBatches:Math.floor(i/batchSize)+1,totalBatches:compileSteps,drawObjects:objects.length,compileObjects:entries.length,cachedObjects:cached}});
    for(const {object}of batch)remember(object);
    done++;report();diagnose('shader-compilation',{completedBatches:Math.floor(i/batchSize)+1,compileBatches:compileSteps,elapsedMs:Math.round(clock()-started),compileObjects:entries.length,cachedObjects:cached});
   }}finally{target.children=[];for(const [shadow,auto,update]of shadows){shadow.autoUpdate=auto;shadow.needsUpdate=update;}}
  }else{
   const target={traverse:fn=>objects.forEach(fn),traverseVisible:()=>{}};if(renderer.compileAsync)await renderer.compileAsync(target,camera,scene,renderDepth);else renderer.compile?.(target,camera,scene);done++;report();
  }
  if(!valid())return false;
  if(draw){diagnose('first-frame-draw');const gl=renderer.getContext?.();if(gl?.getError)for(let i=0;i<8&&gl.getError()!==0;i++){}const culling=[],shadowOnly=new Set(),selected=new Set(objects),previousFunction=renderer.getRenderObjectFunction?.();
   // The sun can see distant facade casters which the walking camera cannot.
   // Prime those real shadow variants while retaining ordinary beauty culling.
   if(renderer.isWebGPURenderer&&near)scene.traverseVisible(object=>{if(drawable(object)&&(nearby(object)||object.castShadow)){culling.push([object,object.frustumCulled]);if(!selected.has(object))shadowOnly.add(object);}});
   const filter=shadowOnly.size&&renderer.setRenderObjectFunction;
   try{for(const [object]of culling)object.frustumCulled=false;if(filter)renderer.setRenderObjectFunction((object,...args)=>{if(!shadowOnly.has(object))(previousFunction||renderer.renderObject).call(renderer,object,...args);});renderFrame();}
   finally{if(filter)renderer.setRenderObjectFunction(previousFunction);for(const [object,culled]of culling)object.frustumCulled=culled;}const error=gl?.getError?.();if(error&&error!==0x9242)throw Object.assign(Error('The first scene draw failed'),{name:'SceneDrawError',code:error});if(!renderer.isWebGPURenderer&&renderer.shadowMap?.enabled)scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.shadow&&!o.shadow.map)throw Object.assign(Error('A visible shadow has no render target'),{name:'SceneDrawError'});});}
  if(!valid())return false;beforeReady();if(!valid())return false;if(renderer.isWebGPURenderer&&draw)for(const {object}of entries)remember(object);done=total;report();diagnose('scene-preparation-ready');prepared.add(key);if(prepared.size>limit)prepared.delete(prepared.values().next().value);return true;
 }
 async function prepare(key,options={}){
  const staged=[];let restored=false;
  const restore=()=>{if(restored)return;restored=true;for(const [object,visible,count]of staged){object.visible=visible;if(object.isInstancedMesh)object.count=count;}};
  // These are the actual bounded LOD/context meshes, not cloned stand-ins.
  // Their matrix/colour capacities are initialized by the owning scene.
  if(renderer.isWebGPURenderer&&options.neighborhood&&!disposed&&!options.signal?.aborted){
   for(const object of new Set(options.preparationObjects||[]))if(object?.isMesh&&(!object.visible||object.isInstancedMesh&&object.count===0)){
    if(![object.material].flat().some(m=>m&&m.visible!==false&&m.opacity!==0))continue;
    staged.push([object,object.visible,object.count]);object.visible=true;if(object.isInstancedMesh&&object.count===0)object.count=1;
   }
  }
  try{return await prepareScene(key,{...options,beforeReady:()=>{restore();if(staged.length&&options.draw){scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.shadow)o.shadow.needsUpdate=true;});(options.renderFrame||(()=>renderer.render(scene,camera)))();}}});}
  finally{restore();}
 }
 return {has:key=>prepared.has(key),prepare(key,options){const task=serial?serial.then(()=>prepare(key,options)):prepare(key,options),tail=task.catch(()=>{});serial=tail;void tail.then(()=>{if(serial===tail)serial=null;});return task;},reset(){epoch++;prepared.clear();uploaded=new WeakSet();compiled=new WeakMap();layouts.clear();sceneKey='';},dispose(){disposed=true;epoch++;prepared.clear();uploaded=new WeakSet();compiled=new WeakMap();layouts.clear();sceneKey='';}};
}
