import {Group} from 'three';
// Regular panels can share a shader layout. Three r185's common renderer
// binds instancing buffers to object identity, so keep each instanced object.
export function nativeCompileList(objects){
 const unique=new Map();for(const o of objects){const attributes=Object.entries(o.geometry?.attributes||{}).map(([name,a])=>[name,a.itemSize,a.normalized,a.gpuType,a.array?.constructor.name,!!a.isInstancedBufferAttribute,a.meshPerAttribute||0,a.data?.stride||0,a.offset||0].join(':')).sort();const key=JSON.stringify([o.type,o.isInstancedMesh?o.uuid:null,[o.material].flat().map(m=>m?.uuid),attributes,!!o.geometry?.index,!!o.instanceColor,!!o.receiveShadow,!!o.castShadow,Object.keys(o.geometry?.morphAttributes||{}),o.skeleton?.bones.length||0]);if(!unique.has(key))unique.set(key,o);}
 const group=new Group();group.matrixAutoUpdate=false;group.matrixWorldAutoUpdate=false;group.children=[...unique.values()];return group;
}
export function createSceneWarmup(renderer,scene,camera,{limit=64,maxNativeMs=10000,clock=()=>performance.now(),batchSize=24}={}){
 let disposed=false,epoch=0,uploaded=new WeakSet();const prepared=new Set();
 return {has:key=>prepared.has(key),async prepare(key,{signal,all=false,draw=false}={}){
  if(disposed||signal?.aborted||prepared.has(key))return false;
  const version=epoch,objects=[],textures=new Set(),valid=()=>!disposed&&!signal?.aborted&&epoch===version;
  const collect=o=>{if(!o.isMesh&&!o.isLine&&!o.isPoints&&!o.isSprite)return;objects.push(o);for(const m of[o.material].flat().filter(Boolean))for(const t of Object.values(m))if(t?.isTexture&&!t.isRenderTargetTexture&&!uploaded.has(t))textures.add(t);};
  (all?scene.traverse:scene.traverseVisible).call(scene,collect);
  for(const t of textures){if(!valid())return false;await renderer.initTexture?.(t);uploaded.add(t);}
  scene.updateMatrixWorld?.(true);
  if(renderer.isWebGPURenderer){
   const target=nativeCompileList(objects),items=target.children,shadows=[],started=clock();
   // Compile receivers with their shadow nodes, but defer the expensive shadow
   // draw until all main materials are prepared. Preserve the first-draw flags.
   scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.shadow){shadows.push([o.shadow,o.shadow.autoUpdate,o.shadow.needsUpdate]);o.shadow.autoUpdate=false;o.shadow.needsUpdate=false;}});
   try{for(let i=0;i<items.length;i+=batchSize){if(!valid())return false;if(clock()-started>maxNativeMs)throw Object.assign(Error('Native scene preparation exceeded device budget'),{name:'SceneDrawError'});target.children=items.slice(i,i+batchSize);await renderer.compileAsync(target,camera,scene);}}
   finally{target.children=[];for(const [shadow,auto,update]of shadows){shadow.autoUpdate=auto;shadow.needsUpdate=update;}}
  }else{
   const target={traverse:fn=>objects.forEach(fn),traverseVisible:()=>{}};if(renderer.compileAsync)await renderer.compileAsync(target,camera,scene);else renderer.compile?.(target,camera,scene);
  }
  if(!valid())return false;
  if(draw){const gl=renderer.getContext?.();if(gl?.getError)for(let i=0;i<8&&gl.getError()!==0;i++){}renderer.render(scene,camera);const error=gl?.getError?.();if(error&&error!==0x9242)throw Object.assign(Error('The first scene draw failed'),{name:'SceneDrawError',code:error});if(!renderer.isWebGPURenderer&&renderer.shadowMap?.enabled)scene.traverseVisible(o=>{if(o.isLight&&o.castShadow&&o.shadow&&!o.shadow.map)throw Object.assign(Error('A visible shadow has no render target'),{name:'SceneDrawError'});});}
  prepared.add(key);if(prepared.size>limit)prepared.delete(prepared.values().next().value);return true;
 },reset(){epoch++;prepared.clear();uploaded=new WeakSet();},dispose(){disposed=true;epoch++;prepared.clear();uploaded=new WeakSet();}};
}
