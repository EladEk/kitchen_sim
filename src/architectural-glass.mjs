import * as THREE from 'three';
import {ARCHITECTURAL_MATERIALS} from './architectural-materials.mjs';
// Screen-space transmission is limited to high quality on desktop. Mobile and
// stereo use dielectric reflections plus transparency, with no refraction pass.
export function createArchitecturalGlass(resources,{mobile=globalThis.matchMedia?.('(pointer: coarse)').matches===true}={}){
 const material=new THREE.MeshPhysicalMaterial({...ARCHITECTURAL_MATERIALS.glass,transmission:mobile?0:.9,transparent:mobile,opacity:mobile?.075:1,depthWrite:false,side:THREE.DoubleSide});material.userData.architecturalGlass=true;material.userData.transmissionBase=.9;resources.push(material);return material;
}
// Alpha-blended glass has no transmission pass, so its colour is lit like a
// white diffuse sheet and blended over the view: a milky veil, doubled by
// stacked panes. Real glazing is near-black in diffuse terms; reflections come
// from the specular/env lobe, which keeps working with the dark body colour.
export const ALPHA_GLASS_COLOR='#282a2a';
export const DISTANT_GLASS_COLOR='#1c2327',DISTANT_GLASS_OPACITY=.66;
// District copies get their own glass clone (shared template glass stays clear
// for the visited apartment).
export function distantGlazing(source){const m=source.clone();m.userData={...source.userData,distantGlazing:true};m.roughness=Math.min(m.roughness,.04);setArchitecturalGlassQuality(m);return m;}
export function setArchitecturalGlassQuality(material,{mobile=false,tier=0,xr=false}={}){
 // Neighbouring buildings (district copies) have no lit interiors behind their
 // panes, so a 7.5% veil shows the back walls and reads as blank stone. Real
 // windows across the street read as dark, reflective glass: always alpha
 // (no transmission pass for distant copies), with a dense near-black body.
 const distant=material.userData.distantGlazing===true;
 const transmission=!distant&&!mobile&&tier===0&&!xr?(material.userData.transmissionBase??.9):0,transparent=transmission===0,opacity=transparent?(distant?DISTANT_GLASS_OPACITY:.075):1;
 material.userData.glassColor??='#'+material.color.getHexString();const color=transparent?(distant?DISTANT_GLASS_COLOR:ALPHA_GLASS_COLOR):material.userData.glassColor;
 if(material.transmission===transmission&&material.transparent===transparent&&material.opacity===opacity&&'#'+material.color.getHexString()===color)return false;
 material.transmission=transmission;material.transparent=transparent;material.opacity=opacity;material.color.set(color);material.needsUpdate=true;return true;
}
// Legacy door/window panes from the public baseline and building scene are
// always alpha-blended #f6faf8 sheets (no transmission path); give them the same
// near-black body once. Their opacity and reflections are unchanged.
export const isAlphaGlazing=m=>!!m&&m.transparent&&!m.userData?.architecturalGlass&&!(m.transmission>0)&&!m.map&&m.opacity>0&&m.opacity<=.2&&m.color?.getHexString()==='f6faf8';
export function dimAlphaGlazing(m){if(!isAlphaGlazing(m))return false;m.userData.glassColor='#f6faf8';m.userData.alphaGlazing=true;m.color.set(ALPHA_GLASS_COLOR);return true;}
