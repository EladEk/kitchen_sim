import {SkyMesh} from 'three/addons/objects/SkyMesh.js';
import {FogExp2} from 'three';
import {MEDITERRANEAN_ATMOSPHERE,updateAtmosphereFog} from '../src/atmosphere-settings.mjs';

// Visual atmosphere only. installCelestialSky owns the shared, white-balanced
// HDR lighting; replacing it here caused blue facades and two PMREM builds.
export function createPhysicalAtmosphere(renderer,scene,camera){
 const sky=new SkyMesh(),fog=new FogExp2(MEDITERRANEAN_ATMOSPHERE.fogColor,MEDITERRANEAN_ATMOSPHERE.fogDensity),originalFog=scene.fog;
 sky.scale.setScalar(450000);sky.turbidity.value=MEDITERRANEAN_ATMOSPHERE.turbidity;sky.rayleigh.value=MEDITERRANEAN_ATMOSPHERE.rayleigh;sky.mieCoefficient.value=.004;sky.mieDirectionalG.value=.8;sky.cloudCoverage.value=MEDITERRANEAN_ATMOSPHERE.cloudCoverage;sky.cloudDensity.value=MEDITERRANEAN_ATMOSPHERE.cloudDensity;sky.showSunDisc.value=0;sky.material.depthWrite=false;sky.material.fog=false;
 sky.name='physical-atmosphere';sky.frustumCulled=false;sky.renderOrder=-10001;sky.raycast=()=>{};sky.userData.celestialBackground=true;
 sky.onBeforeRender=(_renderer,_scene,viewCamera)=>{viewCamera.getWorldPosition(sky.position);sky.updateMatrixWorld();};scene.add(sky);
 let disposed=false;
 return {
  update(state,{interior=0}={}){
   if(disposed||!state)return;
   sky.visible=!state.dark&&state.sun.elevation>0;sky.sunPosition.value.fromArray(state.sun.direction);
   scene.fog=updateAtmosphereFog(fog,state,{interior});
  },
  dispose(){if(disposed)return;disposed=true;scene.fog=originalFog;sky.removeFromParent();sky.geometry.dispose();sky.material.dispose();}
 };
}
