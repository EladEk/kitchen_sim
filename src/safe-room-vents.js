import * as THREE from 'three';
import {DOORS,WALLS} from './home-model.mjs';

// Detailed inside faces only. The plan wall/opening and door motion are untouched.
export function buildSafeRoomVents({parent,element,box,cylinder,mat,resources,data}){
 const door=DOORS.find(d=>d.id==='safe'),wall=WALLS.find(w=>w.id===door.wallId);
 parent.position.set(door.start+.38,0,wall.a[1]+wall.thickness/2+.006);
 parent.userData.roomId='safe-room';
 const y=element.bottom+.17,white=mat('#efeee9'),metal=mat('#8e9693',{metalness:.6,roughness:.5}),dark=mat('#343a38');
 const disk=(x,z,r,depth,material,part)=>{
  const mesh=cylinder(x,y,z,r,depth,material,parent,{...data,part});
  mesh.rotation.x=Math.PI/2;return mesh;
 };
 const ring=(x,z,inner,outer,material,part)=>{
  const geometry=new THREE.RingGeometry(inner,outer,40);resources.push(geometry);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);
  mesh.userData={...data,part};parent.add(mesh);return mesh;
 };
 // Left: bolted flange and recessed dark opening.
 disk(-.26,.02,.145,.04,white,'safe-vent-flange');
 disk(-.26,.041,.108,.003,dark,'safe-vent-recess');
 ring(-.26,.044,.108,.119,metal,'safe-vent-metal-rim');
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,bolt=cylinder(-.26+Math.cos(a)*.132,y+Math.sin(a)*.132,.045,.007,.008,metal,parent,{...data,part:'safe-vent-bolt'});
  bolt.rotation.x=Math.PI/2;
 }
 // Right: larger round faceplate, recessed grille, separate depth for each layer.
 disk(.24,.027,.17,.054,metal,'safe-vent-grille-rim');
 disk(.24,.056,.16,.006,white,'safe-vent-grille-face');
 disk(.24,.061,.095,.003,dark,'safe-vent-grille-recess');
 for(let dy=-.08;dy<=.0801;dy+=.016){
  const length=2*Math.sqrt(.095**2-dy**2);
  box(.24,y+dy,.068,length,.005,.008,white,parent,{...data,part:'safe-vent-grille-slat'});
 }
 box(.24,y,.074,.005,.184,.006,white,parent,{...data,part:'safe-vent-grille-spine'});
}
