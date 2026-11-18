// r185 restores _currentRenderContext before its asynchronous node updates.
// Transmission then falls back to the current target. Bind the exact target
// being compiled, so a viewport copy cannot read an older canvas framebuffer.
export function installNativePreparation(renderer){
 // A transmission texture can be visited by material binding before its first
 // framebuffer copy. r185 then allocates it in the canvas format even for an
 // HDR pass. Reconcile with the actual copy source before copying or sampling.
 const copy=renderer.copyFramebufferToTexture.bind(renderer);
 renderer.copyFramebufferToTexture=(framebuffer,...args)=>{
  if(framebuffer.isFramebufferTexture&&!framebuffer.isDepthTexture&&renderer.backend.isWebGPUBackend){
   const context=renderer._currentRenderContext,target=context?context.renderTarget:renderer.getRenderTarget()||renderer._getFrameBufferTarget();
   const format=target?renderer.backend.utils.getCurrentColorFormat(target):renderer.backend.utils.getPreferredCanvasFormat();
   if(framebuffer.internalFormat!==format||renderer.backend.get(framebuffer).texture?.format!==format){framebuffer.internalFormat=format;framebuffer.needsUpdate=true;}
  }
  return copy(framebuffer,...args);
 };
 const compile=renderer.compileAsync.bind(renderer);
 renderer.compileAsync=async(...args)=>{
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel(),mrt=renderer.getMRT();
  const target=previous||(renderer.needsFrameBufferTarget?renderer._getFrameBufferTarget():null);
  if(target)renderer.setRenderTarget(target);
  try{return await compile(...args);}
  finally{renderer.setMRT(mrt);renderer.setRenderTarget(previous,face,level);}
 };
}
