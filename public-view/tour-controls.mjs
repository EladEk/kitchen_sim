// OrbitControls.enabled gates DOM events, not update(). Calling update while a
// walking modal is open can pull the camera toward its old orbit target.
export function updateTourCamera({walking,paused,controls,move}){
 if(walking){if(!paused)move();}
 else controls.update();
}
