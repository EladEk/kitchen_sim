// r185 restores _currentRenderContext before its asynchronous node updates.
// Transmission then falls back to the current target. Bind the exact target
// being compiled, so a viewport copy cannot read an older canvas framebuffer.
export function installNativePreparation(renderer){
 const compile=renderer.compileAsync.bind(renderer);
 renderer.compileAsync=async(...args)=>{
  const previous=renderer.getRenderTarget(),face=renderer.getActiveCubeFace(),level=renderer.getActiveMipmapLevel(),mrt=renderer.getMRT();
  const target=previous||(renderer.needsFrameBufferTarget?renderer._getFrameBufferTarget():null);
  if(target)renderer.setRenderTarget(target);
  try{return await compile(...args);}
  finally{renderer.setMRT(mrt);renderer.setRenderTarget(previous,face,level);}
 };
}
