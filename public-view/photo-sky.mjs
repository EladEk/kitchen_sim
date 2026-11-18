import * as T from 'three';
import skyUrl from './assets/sky-r179.jpg?url';
// Photographic daytime sky for the walk view (CC0 Poly Haven pano, ~90 KB, see
// assets/SKY-R179-LICENSE.txt). The procedural atmosphere still owns lighting
// and IBL; this only replaces what is seen through windows, which read as a
// flat painted gradient. Loaded lazily after the tour is already drawing, never
// on the startup path, and only shown while walking in daylight.
import {photoSkyStrength,photoSkyYaw} from './photo-sky-math.mjs';
export {photoSkyStrength,photoSkyYaw};
export function createPhotoSky(scene,{delay=2500,url=skyUrl,loader=()=>new T.TextureLoader().loadAsync(url),radius=900}={}){
 let mesh=null,requested=false,disposed=false,timer=0;
 const request=()=>{if(requested)return;requested=true;timer=setTimeout(()=>{if(disposed)return;loader().then(map=>{
  if(disposed){map.dispose();return;}map.colorSpace=T.SRGBColorSpace;map.generateMipmaps=false;map.minFilter=T.LinearFilter;
  const material=new T.MeshBasicMaterial({map,side:T.DoubleSide,depthWrite:false,depthTest:false,fog:false});
  mesh=new T.Mesh(new T.SphereGeometry(1,48,24),material);mesh.name='photo-sky';mesh.scale.set(-radius,radius,radius);mesh.frustumCulled=false;mesh.renderOrder=-9999;mesh.raycast=()=>{};mesh.visible=false;
  mesh.userData={photoSky:true,celestialBackground:true,visualOnly:true,tourNonPhysical:true,sceneUi:false};scene.add(mesh);
 }).catch(()=>{});},delay);};
 return {
  update(state,camera,{walking=false}={}){
   if(disposed)return;const strength=walking?photoSkyStrength(state):0;if(strength>0)request();
   if(!mesh)return;mesh.visible=strength>0;if(!mesh.visible)return;
   mesh.material.color.setScalar(.25+.75*strength);mesh.rotation.y=photoSkyYaw(state.sun?.direction);camera.getWorldPosition(mesh.position);
  },
  get loaded(){return !!mesh;},
  dispose(){disposed=true;clearTimeout(timer);if(mesh){mesh.removeFromParent();mesh.geometry.dispose();mesh.material.map?.dispose();mesh.material.dispose();mesh=null;}}
 };
}
