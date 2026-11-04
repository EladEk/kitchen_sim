import * as THREE from 'three';
// Screen-space transmission is limited to high quality on desktop. Mobile and
// stereo use dielectric reflections plus transparency, with no refraction pass.
export function createArchitecturalGlass(resources,{mobile=globalThis.matchMedia?.('(pointer: coarse)').matches===true}={}){
 const material=new THREE.MeshPhysicalMaterial({color:'#e6eeea',roughness:.08,ior:1.5,thickness:.008,transmission:mobile?0:.92,transparent:mobile,opacity:mobile?.22:1,depthWrite:false,side:THREE.DoubleSide});material.userData.architecturalGlass=true;resources.push(material);return material;
}
export function setArchitecturalGlassQuality(material,{mobile=false,tier=0,xr=false}={}){
 const transmission=!mobile&&tier===0&&!xr?.92:0,transparent=transmission===0,opacity=transparent?.22:1;if(material.transmission===transmission&&material.transparent===transparent&&material.opacity===opacity)return false;material.transmission=transmission;material.transparent=transparent;material.opacity=opacity;material.needsUpdate=true;return true;
}
