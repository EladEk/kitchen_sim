import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCourtyardDetails} from './courtyard-details.mjs';

// Relative landmark positions follow the aerial trace. Heights, sections and
// bench construction are illustrative; there is no claim of surveyed fixtures.
export function createLandscapeDetails(layout){
 const group=new THREE.Group();group.name='public-park-details';
 const courtyards=createCourtyardDetails(layout.courtyards);group.add(courtyards.group);
 const geometry=new Set(),materials=new Set(),batches=new Map(),surfaces=new Map();let disposed=false;
 const material=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.88,...options});materials.add(m);return m;};
 const canopy=material('#edece5',{side:THREE.DoubleSide,roughness:.94}),steel=material('#78817e',{metalness:.55,roughness:.48}),timber=material('#89765e',{roughness:.94}),concrete=material('#d8d4ca',{roughness:.95});
 const cube=new THREE.BoxGeometry(1,1,1);geometry.add(cube);
 function box(x,y,z,w,h,d,m,angle=0){if(!batches.has(m))batches.set(m,[]);batches.get(m).push([x,y,z,w,h,d,angle]);}
 function beam(a,b,r,m){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),delta=q.clone().sub(p),g=new THREE.CylinderGeometry(r,r,delta.length(),6);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(THREE.Object3D.DEFAULT_UP,delta.normalize())).translate(...p.add(q).multiplyScalar(.5).toArray());if(!surfaces.has(m))surfaces.set(m,[]);surfaces.get(m).push(g);}
 function surface(g,m){if(!surfaces.has(m))surfaces.set(m,[]);surfaces.get(m).push(g);}
 for(const shelter of layout.shelters){
  const [x,z]=shelter.position,n=6,vertices=[],index=[];vertices.push(x,shelter.height+.6,z);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2;vertices.push(x+Math.cos(a)*shelter.radius,shelter.height,z+Math.sin(a)*shelter.radius);}
  for(let i=0;i<n;i++)index.push(0,(i+1)%n+1,i+1);
  const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));roof.setAttribute('uv',new THREE.Float32BufferAttribute(Array.from({length:vertices.length/3},(_,i)=>[vertices[i*3]/10,vertices[i*3+2]/10]).flat(),2));roof.setIndex(index);roof.computeVertexNormals();surface(roof,canopy);
  for(let i=0;i<n;i++){const a=i/n*Math.PI*2,p=[x+Math.cos(a)*shelter.radius*.87,shelter.height,z+Math.sin(a)*shelter.radius*.87];if(i%2===0)beam([p[0],-.01,p[2]],p,.055,steel);beam([x,shelter.height+.55,z],p,.027,steel);}
 }
 for(const bench of layout.benches){
  const [x,z]=bench.position,c=Math.cos(bench.angle),s=Math.sin(bench.angle),part=(dx,y,dz,w,h,d,m)=>box(x+dx*c+dz*s,y,z-dx*s+dz*c,w,h,d,m,bench.angle);
  for(let i=0;i<5;i++)part(0,.45,-.2+i*.1,1.8,.045,.082,timber);
  for(let i=0;i<3;i++)part(0,.66+i*.11,-.22,1.8,.075,.032,timber);
  for(const side of [-1,1]){part(side*.68,.21,0,.045,.46,.42,steel);part(side*.68,.64,-.24,.035,.46,.035,steel);}
 }
 for(const amphitheatre of layout.amphitheatres){
  const [x,z]=amphitheatre.position,arc=new THREE.CatmullRomCurve3(amphitheatre.worldArcOuter.map(p=>new THREE.Vector3(p[0],0,p[1]))).getPoints(32);
  for(let row=0;row<amphitheatre.rows;row++){
   const inner=.30+row*.115,outer=inner+.11,poly=arc.map(p=>[x+(p.x-x)*outer,z+(p.z-z)*outer]).concat(arc.slice().reverse().map(p=>[x+(p.x-x)*inner,z+(p.z-z)*inner])),shape=new THREE.Shape();poly.forEach(([a,b],i)=>i?shape.lineTo(a,b):shape.moveTo(a,b));shape.closePath();
   const g=new THREE.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});g.rotateX(Math.PI/2);g.translate(0,-.06+(row+1)*amphitheatre.rise,0);surface(g,concrete);
  }
 }
 // A low curved seat follows the small garden's visible landscaped recess.
 for(let i=0;i<10;i++){const a=-.1*Math.PI+i/9*Math.PI,x=194+Math.cos(a)*5.1,z=55+Math.sin(a)*5.1;box(x,.22,z,1.48,.44,.48,concrete,-a+Math.PI/2);}
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion();
 for(const [m,items] of batches){const mesh=new THREE.InstancedMesh(cube,m,items.length);items.forEach(([x,y,z,w,h,d,a],i)=>{matrix.compose(new THREE.Vector3(x,y,z),q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,a),new THREE.Vector3(w,h,d));mesh.setMatrixAt(i,matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part:'public-park-furniture',landscape:true,dimensionsInferred:true};mesh.computeBoundingSphere();group.add(mesh);}
 for(const [m,parts] of surfaces){const g=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());geometry.add(g);const mesh=new THREE.Mesh(g,m);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={part:m===canopy?'public-park-shade':m===concrete?'public-park-amphitheatre':'public-park-shade-support',landscape:true,dimensionsInferred:true};group.add(mesh);}
 batches.clear();surfaces.clear();group.updateMatrixWorld(true);
 return {group,courtyards,dispose(){if(disposed)return;disposed=true;courtyards.dispose();for(const o of group.children)o.dispose?.();geometry.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());geometry.clear();materials.clear();group.removeFromParent();group.clear();}};
}
