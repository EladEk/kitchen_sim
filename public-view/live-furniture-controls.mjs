import {MOUSE,TOUCH} from 'three';
export function applyLiveFurnitureControls(controls,originalMouse,originalTouches,session){
 Object.assign(controls.mouseButtons,originalMouse);Object.assign(controls.touches,originalTouches);
 if(session?.item&&session.stage==='place'){controls.mouseButtons.LEFT=null;controls.mouseButtons.RIGHT=MOUSE.ROTATE;controls.touches.ONE=null;controls.touches.TWO=TOUCH.DOLLY_ROTATE;}
}
