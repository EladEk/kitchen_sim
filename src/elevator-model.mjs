import {BUILDING} from './building-layout.mjs';

export const ELEVATOR_STOPS=Array.from({length:9},(_,i)=>i);
export const validStop=n=>Number.isInteger(n)&&n>=0&&n<=8;
export function createElevators(){return [0,1].map(id=>({id,y:0,floor:0,target:0,phase:'open',door:1,queue:[]}));}
// A request closes the doors before motion. Hall requests never move the
// visitor; the view carries a visitor only after they actually enter the car.
export function requestElevator(cars,id,floor){
 if(!validStop(floor)||!cars[id])return cars;
 return cars.map(c=>{
  if(c.id!==id)return c;
  if(c.phase==='open'&&c.floor===floor)return c;
  if(['moving','closing','opening'].includes(c.phase))return c.target===floor||c.queue.includes(floor)?c:{...c,queue:[...c.queue,floor]};
  return {...c,target:floor,phase:'closing',queue:[]};
 });
}
export function stepElevators(cars,delta){
 const dt=Math.max(0,Math.min(.1,Number.isFinite(delta)?delta:0));
 return cars.map(before=>{
  const c={...before,queue:[...before.queue]};
  if(c.phase==='closing'){
   c.door=Math.max(0,c.door-dt*1.25);
   if(c.door===0)c.phase='moving';
  }else if(c.phase==='moving'){
   const target=c.target*BUILDING.storey,step=dt*1.65,distance=target-c.y;
   c.y+=Math.sign(distance)*Math.min(Math.abs(distance),step);
   if(Math.abs(c.y-target)<.00001){c.y=target;c.floor=c.target;c.phase='opening';}
  }else if(c.phase==='opening'){
   c.door=Math.min(1,c.door+dt*1.25);if(c.door===1){c.phase='open';c.hold=.9;}
  }else if(c.phase==='open'&&c.queue.length){
   c.hold=Math.max(0,(c.hold||0)-dt);
   if(c.hold===0){c.target=c.queue.shift();if(c.target!==c.floor)c.phase='closing';}
  }
  return c;
 });
}
export function liftIsOpen(car,floor){return !!car&&car.floor===floor&&Math.abs(car.y-floor*BUILDING.storey)<.015&&car.door>.97;}
export function carContains(lift,p,margin=0){return p[0]>lift.minX+margin&&p[0]<lift.doorCenter[0]-.04-margin&&p[1]>lift.minZ+margin&&p[1]<lift.maxZ-margin;}
export function elevatorRide(car){return car.phase==='moving'||car.phase==='closing'||car.phase==='opening';}
