import {graphicsProfile} from './graphics-quality.mjs';
import {PMREMGenerator,NeutralToneMapping,SRGBColorSpace} from 'three';
import {architecturalEnvironment} from './architectural-environment.mjs';

// Both viewers use the same neutral colour pipeline. Filmic mid-tone lift made
// the photographed grey/greige tile look bleached and reduced its fine detail.
export function configureSurfaceRenderer(renderer){
 renderer.toneMapping=NeutralToneMapping;
 renderer.toneMappingExposure=1;
 renderer.outputColorSpace=SRGBColorSpace;
 // Keep WebGL for browser WebXR; higher sampling on capable devices.
 renderer.setPixelRatio(graphicsProfile({search:typeof location!=='undefined'?location.search:'',mobile:typeof matchMedia!=='undefined'&&matchMedia('(pointer: coarse)').matches,dpr:typeof devicePixelRatio!=='undefined'?devicePixelRatio:1}).pixelRatio);
}

export function installSceneEnvironment(renderer,scene){
 const target=architecturalEnvironment(renderer);scene.environment=target.texture;scene.environmentIntensity=.38;
 return ()=>{scene.environment=null;target.dispose();};
}
