import * as THREE from 'three';
import {architecturalSkyPixels} from './daylight.js';
// Linear HDR sky, independent of private photos and external network requests.
export function architecturalEnvironment(renderer,{sunDirection,hour=13.5,turbidity=2.2}={}){
 const {data,width,height}=architecturalSkyPixels({sunDirection,hour,turbidity});
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(source);generator.dispose();target.sourceEnvironment=source;return target;
}
