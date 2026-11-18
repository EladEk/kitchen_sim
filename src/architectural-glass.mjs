import * as THREE from 'three';
import {ARCHITECTURAL_MATERIALS} from './architectural-materials.mjs';
// Screen-space transmission is limited to high quality on desktop. Mobile and
// stereo use dielectric reflections plus transparency, with no refraction pass.
export function createArchitecturalGlass(resources,{mobile=globalThis.matchMedia?.('(pointer: coarse)').matches===true}={}){
 const material=new THREE.MeshPhysicalMaterial({...ARCHITECTURAL_MATERIALS.glass,transmission:mobile?0:.9,transparent:mobile,opacity:mobile?.075:1,depthWrite:false,side:THREE.DoubleSide});material.userData.architecturalGlass=true;material.userData.transmissionBase=.9;resources.push(material);return material;
}
export function setArchitecturalGlassQuality(material,{mobile=false,tier=0,xr=false}={}){
 const transmission=!mobile&&tier===0&&!xr?(material.userData.transmissionBase??.9):0,transparent=transmission===0,opacity=transparent?.075:1;if(material.transmission===transmission&&material.transparent===transparent&&material.opacity===opacity)return false;material.transmission=transmission;material.transparent=transparent;material.opacity=opacity;material.needsUpdate=true;return true;
}
