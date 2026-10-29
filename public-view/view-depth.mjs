// Keep centimetre-scale exterior detail distinguishable at neighbourhood
// distances. Walking retains the close plane needed for doors and furniture;
// WebXR owns its projection matrices and is left untouched.
export function updateViewDepth(camera,focus,{walking=false,xr=false}={}){
 if(xr)return false;
 const near=walking?.06:Math.max(.06,Math.min(6,camera.position.distanceTo(focus)*.01));
 if(Math.abs(camera.near-near)<1e-5)return false;
 camera.near=near;camera.updateProjectionMatrix();return true;
}
