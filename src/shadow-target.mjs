// Native Three ShadowNode owns both its render target and the depth texture
// referenced by prepared materials. Keep those objects attached, and resize
// with the public RenderTarget API before warmup/beauty encoding begins.
// Deferring resize to ShadowNode.updateBefore can destroy a depth texture
// already referenced by another pass in that frame. Detaching the map also
// leaves prepared draws referring to a retired ShadowDepthTexture.
// WebGLShadowMap instead allocates only when light.shadow.map is null.
export function refreshShadowTarget(renderer,shadow){
 if(renderer.isWebGPURenderer)shadow.map?.setSize(shadow.mapSize.x,shadow.mapSize.y,shadow.map.depth);
 else{shadow.map?.dispose();shadow.map=null;}
 shadow.needsUpdate=true;
}

export function resizeShadowTarget(renderer,shadow,size){
 if(shadow.mapSize.x===size&&shadow.mapSize.y===size)return false;
 shadow.mapSize.set(size,size);
 refreshShadowTarget(renderer,shadow);
 return true;
}
