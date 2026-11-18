// One budget for materials, screen effects and the sun. Values are deliberately
// bounded; quality changes never increase texture allocations on a slow phone.
export function photorealQuality({mobile=false,tier=0,enhanced=false,capture=false}={}){
 const t=Math.max(0,Math.min(3,Math.trunc(tier)||0));
 return {
  pomSteps:capture?24:(mobile?[6,6,4,4]:[16,16,12,8])[t],
  ao:t<2,aoScale:mobile?.35:.5,aoSamples:mobile?8:16,
  ssr:!mobile&&t<2,ssrScale:t===0?.5:.35,ssrQuality:t===0?.35:.18,
  gi:!mobile&&t===0&&enhanced,
  temporal:t===0||(!mobile&&t===1),bloom:t<2,
  cascades:mobile?2:3,
  shadowSize:capture?4096:(mobile?[1024,1024,512,512]:[2048,2048,1024,512])[t],
  shadowSamples:capture?16:(mobile?[8,6,4,4]:[16,12,8,4])[t],
  blockerSamples:capture?8:t<2?(mobile?4:8):0,
 };
}

export function textureAnisotropy(renderer){
 const maximum=renderer?.getMaxAnisotropy?.()??renderer?.capabilities?.getMaxAnisotropy?.()??16;
 return Math.max(1,Math.min(16,Number(maximum)||1));
}

export function sharpenMaterialTextures(material,maximum=16){
 for(const value of Object.values(material)){
  if(!value?.isTexture||value.isRenderTargetTexture||value.isDepthTexture)continue;
  if(value.anisotropy!==maximum){value.anisotropy=maximum;value.needsUpdate=true;}
 }
}

export function computeTargetExposure({insideUnit=false,sunElevation=.6,nightMode=false}={}){
 const elevation=Math.max(0,Math.min(1,Number.isFinite(sunElevation)?sunElevation:.6));
 const evening=nightMode?1:1-Math.min(1,elevation/.25);
 return insideUnit?1.16+evening*.12:.94+evening*.12;
}
export function stepExposure(current,target,dt,rate=3.5){
 const from=Number.isFinite(current)?current:target;
 if(!Number.isFinite(target))return from;
 const elapsed=Math.max(0,Number.isFinite(dt)?dt:0),speed=Math.max(0,Number.isFinite(rate)?rate:3.5);
 return from+(target-from)*(1-Math.exp(-speed*elapsed));
}

export function computeViewExposure({walking=false,focused=false,cameraInside=false,targetInside=false,...lighting}={}){
 return computeTargetExposure({...lighting,insideUnit:cameraInside||(!walking&&focused&&targetInside)});
}
