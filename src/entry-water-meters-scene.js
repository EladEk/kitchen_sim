import * as THREE from 'three';

// Photo 298252 fixes the arrangement, tags and cover states. All dimensions
// below are display estimates; the dial never fabricates a meter reading.
export function buildEntryWaterMeters({cabinet:c,parent,box,cylinder,mat,tube,component}){
 const pipe=mat('#929082',{metalness:.55,roughness:.8}),coupling=mat('#b0a18a',{metalness:.5,roughness:.72}),blue=mat('#295c91',{roughness:.55}),handle=mat('#4d5048',{metalness:.35,roughness:.8}),paper=mat('#eeeae0',{roughness:.93}),ink=mat('#252824',{roughness:.8}),cement=mat('#aaa397',{roughness:.97});
 const part=(name,extra={})=>({...component(name),...extra,source:c.source,page:c.page});
 const upright=(x,y,z,r,h,m,name)=>cylinder(x,y,z,r,h,m,parent,part(name));
 // The steel riser and larger dark vertical pipe sit on the left of the bay.
 upright(-.39,1.25,.34,.033,2.24,pipe,'observed-meter-riser');
 upright(-.26,1.25,.46,.057,2.24,mat('#50534c',{roughness:.86}),'observed-meter-dark-riser');
 for(const y of [.2,1.1,2.15])upright(-.39,y,.34,.046,.035,coupling,'observed-meter-riser-joint');
 for(const meter of c.meters){
  const {x,y,z,apartment}=meter,g=new THREE.Group();g.userData=part('observed-water-meter',{apartment,capOpen:meter.capOpen});parent.add(g);
  const data=(name)=>part(name,{apartment});
  const cyl=(xx,yy,zz,r,h,m,name)=>cylinder(xx,yy,zz,r,h,m,g,data(name));
  const horizontal=(xx,length,r,m,name)=>{const o=cyl(xx,y,z,r,length,m,name);o.rotation.z=Math.PI/2;return o;};
  horizontal(-.195,.39,.021,pipe,'observed-meter-inlet');horizontal(.245,.43,.021,pipe,'observed-meter-outlet');
  horizontal(x,.15,.046,blue,'observed-meter-body');
  for(const xx of [-.11,.15]){const union=horizontal(xx,.045,.032,coupling,'observed-meter-union');union.rotation.y=Math.PI/8;}
  for(const xx of [-.25,.29]){
   horizontal(xx,.085,.028,coupling,'observed-meter-valve-body');
   cyl(xx,y+.035,z,.01,.045,pipe,'observed-meter-valve-stem');
   box(xx-.015,y+.062,z,.13,.012,.024,handle,g,data('observed-meter-valve-handle'));
  }
  // An upward dial, tilted toward the open door, as seen from above in the photo.
  const faceY=y+.084,faceZ=z-.045,tilt=-Math.PI/4;
  const bezel=cyl(x,faceY,faceZ,.073,.041,coupling,'observed-meter-bezel');bezel.rotation.x=tilt;
  const cover=cyl(meter.capOpen?x-.085:x,meter.capOpen?y-.04:faceY+.02,meter.capOpen?z-.155:faceZ-.02,.071,.015,blue,meter.capOpen?'observed-meter-open-cover':'observed-meter-closed-cover');cover.rotation.x=meter.capOpen?-2.1:tilt;
  if(meter.capOpen){
   const dial=cyl(x,faceY+.016,faceZ-.016,.062,.006,paper,'observed-meter-dial');dial.rotation.x=tilt;
   // Marks indicate a dial face, without invented digits or a reading.
   const face=new THREE.Group();face.position.set(x,faceY+.02,faceZ-.02);face.rotation.x=tilt;g.add(face);
   for(let i=0;i<12;i++){const a=i*Math.PI/6,m=box(Math.sin(a)*.051,.003,Math.cos(a)*.051,.002,.002,.009,ink,face,{...data('meter-dial-detail-illustration'),observed:false,illustrative:true});m.rotation.y=a;}
   cyl(x-.053,y+.015,z-.09,.01,.055,blue,'observed-meter-cover-hinge');
  }
  // White hanging apartment tags: 4 above 3, with the same photographed order.
  const tx=.235,ty=y-.125,tz=.235;
  box(tx,ty,tz,.095,.135,.003,paper,g,data('observed-meter-apartment-tag'));
  const stroke=(xx,yy,w,h)=>box(tx+xx,ty+yy,tz-.003,w,h,.002,ink,g,data('observed-meter-tag-number'));
  if(apartment===4){stroke(.017,0,.009,.075);stroke(-.014,.012,.009,.05);stroke(0,-.005,.047,.009);}
  else{for(const yy of [-.035,0,.035])stroke(0,yy,.045,.008);stroke(.019,.018,.008,.037);stroke(.019,-.018,.008,.037);}
  tube([[.28,y,.32],[.28,y-.04,.255],[tx,ty+.068,tz]],.0015,ink,'observed-meter-tag-tie');
  // Only exposed pipe segments are illustrated; destinations beyond the bay are unknown.
  const downZ=apartment===4?.43:.27;
  tube([[.43,y,z],[.465,y-.025,z],[.465,y-.12,downZ],[.45,c.bottom+.08,downZ]],.02,pipe,'observed-meter-downpipe');
 }
 box(0,c.bottom+.016,c.d/2,c.w-.04,.03,c.d-.04,cement,parent,part('observed-meter-floor-plinth'));
 const d=c.drain,top=c.bottom+.04;
 upright(d.x,top,d.z,d.radius,.006,pipe,'observed-meter-floor-drain');
 upright(d.x,top+.004,d.z,d.radius-.008,.003,ink,'observed-meter-drain-opening');
 for(const offset of [-.036,-.018,0,.018,.036])box(d.x+offset,top+.007,d.z,.006,.004,2*Math.sqrt((d.radius-.006)**2-offset**2),pipe,parent,part('observed-meter-drain-grille'));
}
