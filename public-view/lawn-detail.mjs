import * as THREE from 'three';
import {inside} from './navigation.mjs';

const hash=(x,z,seed=0)=>{const v=Math.sin(x*127.1+z*311.7+seed*73.1)*43758.5453;return v-Math.floor(v);};
export function lawnRegions(layers){
 return layers.flatMap(layer=>layer.polygons.map(([outer,...holes])=>({outer,holes,y:layer.y,bounds:{minX:Math.min(...outer.map(p=>p[0])),maxX:Math.max(...outer.map(p=>p[0])),minZ:Math.min(...outer.map(p=>p[1])),maxZ:Math.max(...outer.map(p=>p[1]))}})));
}
export function lawnAt(regions,x,z){
 return regions.find(r=>x>r.bounds.minX+.025&&x<r.bounds.maxX-.025&&z>r.bounds.minZ+.025&&z<r.bounds.maxZ-.025&&inside([x,z],r.outer)&&!r.holes.some(h=>inside([x,z],h)))||null;
}
function blades(){
 const positions=[],colours=[],indices=[];
 for(let blade=0;blade<3;blade++){
  const angle=blade*Math.PI*2/3,c=Math.cos(angle),s=Math.sin(angle),start=positions.length/3;
  for(let row=0;row<4;row++){const y=[0,.43,.8,1][row],width=.1*Math.pow(1-y,.65);for(const side of [-1,1]){const x=side*width,lean=y*y*.24;positions.push(x*c+lean*s,y,-x*s+lean*c);const shade=.52+y*.48;colours.push(shade,shade,shade);}}
  for(let row=0;row<3;row++){const i=start+row*2;indices.push(i,i+1,i+2,i+1,i+3,i+2);}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colours,3));g.setIndex(indices);g.computeVertexNormals();return g;
}

// A single small instanced draw near the walker. All locations are tested
// against the actual clipped lawn, including paths, parking and service holes.
// Visual blades never enter collision, floor support, picking or shadow maps.
export function createLawnDetail(layers,{mobile=false}={}){
 const regions=lawnRegions(layers),capacity=mobile?1500:4200,geometry=blades(),material=new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide}),mesh=new THREE.InstancedMesh(geometry,material,capacity);
 mesh.name='nearby-short-lawn';mesh.userData={tourNonPhysical:true,lawnDetail:true};mesh.count=0;mesh.visible=false;mesh.castShadow=false;mesh.receiveShadow=true;mesh.raycast=()=>{};
 const matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),point=new THREE.Vector3(),scale=new THREE.Vector3(),colour=new THREE.Color(),up=new THREE.Vector3(0,1,0);let last=-Infinity,lastX=Infinity,lastZ=Infinity,lastScale=null,disposed=false;
 return {mesh,update(position,now=0,{walking=false,detailScale=1}={}){
  if(disposed)return;mesh.visible=walking&&regions.length>0&&position.y<3.5;if(!mesh.visible)return;
  if(now-last<350||Math.hypot(position.x-lastX,position.z-lastZ)<.7&&detailScale===lastScale)return;last=now;lastX=position.x;lastZ=position.z;lastScale=detailScale;
  const radius=(mobile?5:7.5)*Math.max(.6,detailScale),step=.23,cx=Math.floor(position.x/step),cz=Math.floor(position.z/step),cells=Math.ceil(radius/step),limit=Math.round(capacity*Math.max(.4,detailScale));let count=0;
  // Centre-out sampling makes a reduced budget retain the closest blades.
  for(let ring=0;ring<=cells&&count<limit;ring++)for(let dz=-ring;dz<=ring&&count<limit;dz++)for(let dx=-ring;dx<=ring&&count<limit;dx++){
   if(Math.max(Math.abs(dx),Math.abs(dz))!==ring)continue;const gx=cx+dx,gz=cz+dz,x=(gx+hash(gx,gz,1))*step,z=(gz+hash(gx,gz,2))*step,distance=Math.hypot(x-position.x,z-position.z);if(distance>radius)continue;const region=lawnAt(regions,x,z);if(!region)continue;
   const fade=Math.min(1,(radius-distance)/1.3),height=(.035+hash(gx,gz,3)*.032)*fade;
   point.set(x,region.y+.001,z);q.setFromAxisAngle(up,hash(gx,gz,4)*Math.PI*2);scale.setScalar(height);matrix.compose(point,q,scale);mesh.setMatrixAt(count,matrix);
   colour.setHSL(.22+hash(gx,gz,5)*.055,.34+hash(gx,gz,6)*.15,.19+hash(gx,gz,7)*.09);mesh.setColorAt(count,colour);count++;
  }
  mesh.count=count;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();
 },get stats(){return {capacity,count:mesh.count,regions:regions.length};},dispose(){if(disposed)return;disposed=true;mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();mesh.count=0;regions.length=0;}};
}
