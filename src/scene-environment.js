import {PMREMGenerator,NeutralToneMapping,SRGBColorSpace} from 'three';
import {architecturalEnvironment} from './architectural-environment.mjs';

// Both viewers use the same neutral colour pipeline. Filmic mid-tone lift made
// the photographed grey/greige tile look bleached and reduced its fine detail.
export function configureSurfaceRenderer(renderer){
 renderer.toneMapping=NeutralToneMapping;
 renderer.toneMappingExposure=1;
 renderer.outputColorSpace=SRGBColorSpace;
}

export function installSceneEnvironment(renderer,scene){
 const target=architecturalEnvironment(renderer);scene.environment=target.texture;scene.userData.photoEnvironment=target.sourceEnvironment;scene.environmentIntensity=.38;
 return ()=>{scene.environment=null;delete scene.userData.photoEnvironment;target.sourceEnvironment?.dispose();target.dispose();};
}
