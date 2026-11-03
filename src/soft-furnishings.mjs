import * as THREE from 'three';

// A small shared mesh, with real silhouettes rather than displacement in a
// photograph. The deformation stays inside the measured furniture footprint.
export function createSoftGeometry(w=1,h=1,d=1,{kind='cushion',radius=Math.min(w,h,d)*.22}={}){
 // Regular face subdivisions are essential: RoundedBoxGeometry concentrates
 // its vertices at the corners and leaves a single flat central rectangle.
 const geometry=new THREE.BoxGeometry(w,h,d,8,2,6),r=Math.min(radius,w*.12,h*.45,d*.12),inner=new THREE.Vector3(w/2-r,h/2-r,d/2-r),minimum=inner.clone().negate(),point=new THREE.Vector3(),closest=new THREE.Vector3(),delta=new THREE.Vector3();
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  point.fromBufferAttribute(p,i);closest.copy(point).clamp(minimum,inner);delta.subVectors(point,closest);if(delta.lengthSq())point.copy(closest).addScaledVector(delta.normalize(),r);
  const x=point.x,y=point.y,z=point.z,u=x/w*2,v=z/d*2;p.setXYZ(i,x,y,z);
  const envelope=Math.pow(Math.max(0,1-u*u),.7)*Math.pow(Math.max(0,1-v*v),.7);
  let relief;
  if(kind==='duvet')relief=(Math.sin(u*11+v*3)*.035+Math.sin(v*17-u*5)*.022+Math.cos(v*8+u*2)*.025)*h;
  else relief=(.12+Math.sin(u*7+v*3)*.025+Math.sin(v*9-u*2)*.018)*h;
  p.setY(i,THREE.MathUtils.clamp(y*(kind==='duvet'?.85:.74)+Math.sign(y)*relief*envelope,-h*.5,h*.5));
 }
 p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();
 geometry.userData.softFurnishing=kind;return geometry;
}
