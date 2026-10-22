const finite=n=>Number.isFinite(n)?n:0;
export function joystickVector(dx,dy,radius=44,deadZone=.12){
 const length=Math.hypot(finite(dx),finite(dy));if(length<=radius*deadZone)return {x:0,y:0};
 const amount=Math.min(1,(length/radius-deadZone)/(1-deadZone)),scale=amount/length;
 return {x:finite(dx)*scale,y:finite(dy)*scale};
}
export function walkingInput(keys=new Set(),mobile={}){
 const stick=mobile.joystick||{},x=Math.max(-1,Math.min(1,finite(stick.x))),y=Math.max(-1,Math.min(1,finite(stick.y)));
 let forward=(keys.has('KeyW')||keys.has('ArrowUp')||mobile.forward?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')||mobile.back?1:0)-y;
 let side=(keys.has('KeyD')||mobile.right?1:0)-(keys.has('KeyA')||mobile.left?1:0)+x;
 const scale=Math.max(1,Math.hypot(forward,side));forward/=scale;side/=scale;
 return {forward,side,turn:(keys.has('ArrowLeft')||mobile.turnLeft?1:0)-(keys.has('ArrowRight')||mobile.turnRight?1:0),moving:Math.hypot(forward,side)>.001};
}
