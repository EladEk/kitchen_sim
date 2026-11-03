import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

const noise=n=>{const v=Math.sin(n*127.1+31.7)*43758.5453;return v-Math.floor(v);};
function leafTexture(){
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size;let alpha=0,shade=230;
  for(let i=0;i<11;i++){
   const a=noise(i+1)*Math.PI*2,dx=u-(.12+noise(i+20)*.76),dy=v-(.12+noise(i+40)*.76),xx=(dx*Math.cos(a)+dy*Math.sin(a))/.075,yy=(-dx*Math.sin(a)+dy*Math.cos(a))/.16,edge=1-yy*yy-xx*xx;
   if(edge>0){alpha=Math.max(alpha,Math.min(1,edge*14)*255);shade=207+noise(i+90)*43-Math.max(0,1-Math.abs(xx)*20)*12;}
  }
  const j=(y*size+x)*4;data[j]=data[j+1]=data[j+2]=shade;data[j+3]=Math.round(alpha);
 }
 const map=new THREE.DataTexture(data,size,size);map.colorSpace=THREE.SRGBColorSpace;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;map.generateMipmaps=true;map.needsUpdate=true;return map;
}

// A few spatial batches share one leaf atlas and two botanical palettes.
// No lights, textures from remote hosts, timers or separate collision copies.
export function createCourtyardDetails(courtyard){
 const group=new THREE.Group();group.name='public-inner-courtyards';
 const geometries=new Set(),materials=new Set(),textures=new Set();let disposed=false;
 const geometry=g=>{geometries.add(g);return g;};
 const material=options=>{const m=new THREE.MeshStandardMaterial({roughness:.96,...options});materials.add(m);return m;};
 if(!courtyard)return {group,stats:{instances:0,drawCalls:0},resources:{geometries:[],materials:[],textures:[]},dispose(){group.removeFromParent();group.clear();}};
 const soil=material({color:'#625548'}),edge=material({color:'#d3ccbc'}),parts=[];
 const box=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),edges=[];geometry(box);
 for(const bed of courtyard.beds)for(const [outer,...holes] of bed.polygons){
  if(bed.kind==='shrubs'){
   const shape=new THREE.Shape();outer.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
   for(const ring of holes){const path=new THREE.Path();ring.forEach(([x,z],i)=>i?path.lineTo(x,-z):path.moveTo(x,-z));path.closePath();shape.holes.push(path);}
   const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,-.012,0);parts.push(g);
  }
  for(const ring of [outer,...holes])ring.forEach((a,i)=>{const b=ring[(i+1)%ring.length],dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);if(length>.1)edges.push([(a[0]+b[0])/2,.012,(a[1]+b[1])/2,length,.054,.10,-Math.atan2(dz,dx)]);});
 }
 if(parts.length){const g=geometry(mergeGeometries(parts,false));parts.forEach(p=>p.dispose());const mesh=new THREE.Mesh(g,soil);mesh.receiveShadow=true;mesh.userData={part:'courtyard-planting-soil',landscape:true};group.add(mesh);}
 if(edges.length){const mesh=new THREE.InstancedMesh(box,edge,edges.length);edges.forEach(([x,y,z,w,h,d,a],i)=>{matrix.compose(new THREE.Vector3(x,y,z),q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,a),new THREE.Vector3(w,h,d));mesh.setMatrixAt(i,matrix);});mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.userData={part:'courtyard-bed-edging',landscape:true};group.add(mesh);}
 const map=leafTexture();textures.add(map);
 const cards=[];
 for(let i=0;i<12;i++){
  const a=i*2.39996,r=.35+noise(i+90)*.14,g=new THREE.PlaneGeometry(.82,.62);g.rotateY(a);g.rotateX((noise(i+110)-.5)*1.0);g.translate(Math.cos(a)*r,.43+noise(i+130)*.34,Math.sin(a)*r);cards.push(g);
 }
 const leaves=geometry(mergeGeometries(cards,false));cards.forEach(g=>g.dispose());
 const positions=leaves.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setXYZ(i,Math.max(-.95,Math.min(.95,positions.getX(i))),Math.max(.08,Math.min(1.05,positions.getY(i))),Math.max(-.95,Math.min(.95,positions.getZ(i))));
 leaves.computeVertexNormals();leaves.computeBoundingBox();
 const core=geometry(new THREE.IcosahedronGeometry(1,0).scale(.83,.43,.83).translate(0,.43,0));
 for(const [foliage,color] of [['green','#567447'],['burgundy','#794345']]){
  const leaf=material({color,map,alphaTest:.48,alphaToCoverage:true,side:THREE.DoubleSide}),body=material({color:new THREE.Color(color).multiplyScalar(.77)});
  for(let sector=0;sector<3;sector++){
   const items=courtyard.shrubs.filter(p=>p.foliage===foliage&&Math.min(2,Math.floor((p.position[1]+25)/75))===sector);if(!items.length)continue;
   for(const [g,m,part] of [[core,body,'canopy'],[leaves,leaf,'leaves']]){
    const mesh=new THREE.InstancedMesh(g,m,items.length);
    items.forEach((p,i)=>{matrix.compose(new THREE.Vector3(p.position[0],-.01,p.position[1]),q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle),new THREE.Vector3(...p.scale));mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,new THREE.Color(1,1,1).multiplyScalar(.92+noise(i+sector*70)*.15));});
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=part==='canopy';mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.userData={part:'courtyard-'+foliage+'-'+part,landscape:true,dimensionsInferred:true};group.add(mesh);
   }
  }
 }
 group.updateMatrixWorld(true);
 return {group,stats:{instances:courtyard.shrubs.length,drawCalls:group.children.length},resources:{geometries:[...geometries],materials:[...materials],textures:[...textures]},dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const mesh of group.children)mesh.dispose?.();group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());geometries.clear();materials.clear();textures.clear();}};
}
