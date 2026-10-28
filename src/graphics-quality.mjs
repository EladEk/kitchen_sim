/** Shared browser/WebXR graphics quality policy. WebGL remains the XR renderer:
 * replacing it with WebGPURenderer would break supported immersive sessions. */
export function graphicsProfile({search='',mobile=false,dpr=1}={}){
 const request=new URLSearchParams(search).get('quality');
 const tier=['eco','balanced','ultra'].includes(request)?request:(mobile?'balanced':'ultra');
 const pixelRatio=tier==='eco'?Math.min(dpr,1):tier==='balanced'?Math.min(dpr,mobile?1.35:1.75):Math.min(dpr,mobile?1.75:2.5);
 return {tier,pixelRatio,shadowSize:tier==='eco'?1024:tier==='balanced'?(mobile?2048:3072):(mobile?3072:4096),anisotropy:tier==='eco'?2:tier==='balanced'?8:16,ao:tier!=='eco'};
}
export function enhanceMaterialTextures(root,renderer,profile){
 const max=Math.min(renderer.capabilities.getMaxAnisotropy(),profile.anisotropy);
 const seen=new Set();
 root.traverse(obj=>{
  if(!obj.isMesh)return;
  for(const mat of Array.isArray(obj.material)?obj.material:[obj.material]){
   if(!mat||seen.has(mat))continue;seen.add(mat);
   for(const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap','bumpMap']){
    const tex=mat[key];if(tex?.isTexture&&tex.anisotropy!==max){tex.anisotropy=max;tex.needsUpdate=true;}
   }
  }
 });
}
