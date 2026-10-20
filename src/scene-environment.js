import {PMREMGenerator,NeutralToneMapping,SRGBColorSpace} from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';

// Both viewers use the same neutral colour pipeline. Filmic mid-tone lift made
// the photographed grey/greige tile look bleached and reduced its fine detail.
export function configureSurfaceRenderer(renderer){
 renderer.toneMapping=NeutralToneMapping;
 renderer.toneMappingExposure=1;
 renderer.outputColorSpace=SRGBColorSpace;
}

export function installSceneEnvironment(renderer,scene){
 const environment=new RoomEnvironment(),generator=new PMREMGenerator(renderer),target=generator.fromScene(environment,.04);
 scene.environment=target.texture;scene.environmentIntensity=.38;
 environment.dispose();generator.dispose();
 return ()=>{scene.environment=null;target.dispose();};
}
