import * as THREE from 'three';
import {KITCHEN_SINK as S,roundedRect} from './kitchen-sink.mjs';
const M=.001;

export function vegasCutoutPath(x,z,scale=1){return roundedRect(new THREE.Path(),S.cutout.width*scale,S.cutout.depth*scale,S.cutout.radius*scale,x,z);}

// One hollow composite sink shared by the detailed kitchen and home view.
// Envelope is nominal; undimensioned slopes/radii follow the owner's photo.
export function createVegasSink(resources){
 const group=new THREE.Group();group.userData={productId:S.productId,model:S.model,finish:S.finish,finishCode:S.finishCode,dimensions:[S.width*M,S.depth*M,S.height*M]};
 const composite=new THREE.MeshStandardMaterial({color:S.color,roughness:.68,metalness:0,side:THREE.DoubleSide}),steel=new THREE.MeshStandardMaterial({color:'#c0c4c1',roughness:.28,metalness:.85,side:THREE.DoubleSide}),dark=new THREE.MeshStandardMaterial({color:'#46504b',roughness:.55});resources.push(composite,steel,dark);
 const add=(geometry,material,part)=>{resources.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={id:'sink',productId:S.productId,model:S.model,finish:S.finish,finishCode:S.finishCode,part};group.add(mesh);return mesh;};
 const shape=(w,d,r,x=0,z=0)=>roundedRect(new THREE.Shape(),w*M,d*M,r*M,x*M,z*M);
 const hole=(w,d,r,x=0,z=0)=>roundedRect(new THREE.Path(),w*M,d*M,r*M,x*M,z*M);
 const rim=shape(S.width,S.depth,14);rim.holes.push(hole(S.bowl.width,S.bowl.depth,S.bowl.radius,0,S.bowl.offsetZ));
 const tapHole=new THREE.Path();tapHole.absarc(0,(S.tapZ-S.centerZ)*M,.0175,0,Math.PI*2,true);rim.holes.push(tapHole);
 const rg=new THREE.ExtrudeGeometry(rim,{depth:.007,bevelEnabled:false,curveSegments:12});rg.rotateX(Math.PI/2);add(rg,composite,'sink-rim');
 const rings=[[S.bowl.width,S.bowl.depth,S.bowl.radius,-7],[603,376,36,-190],[590,364,40,-212]].map(([w,d,r,y])=>({points:shape(w,d,r,0,S.bowl.offsetZ).getPoints(12),y:y*M}));
 const positions=[];
 for(let j=0;j<rings.length-1;j++)for(let i=0;i<rings[j].points.length-1;i++){
  const a=rings[j].points[i],b=rings[j].points[i+1],c=rings[j+1].points[i],d=rings[j+1].points[i+1],y=rings[j].y,yy=rings[j+1].y;
  positions.push(a.x,y,a.y,c.x,yy,c.y,b.x,y,b.y,b.x,y,b.y,c.x,yy,c.y,d.x,yy,d.y);
 }
 const walls=new THREE.BufferGeometry();walls.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));walls.computeVertexNormals();add(walls,composite,'sink-bowl-wall');
 const bottom=shape(590,364,40,0,S.bowl.offsetZ),drainZ=(S.drainZ-S.centerZ)*M,drainHole=new THREE.Path();drainHole.absarc(0,drainZ,.04445,0,Math.PI*2,true);bottom.holes.push(drainHole);
 const bg=new THREE.ExtrudeGeometry(bottom,{depth:.008,bevelEnabled:false,curveSegments:12});bg.rotateX(Math.PI/2);bg.translate(0,-.212,0);add(bg,composite,'sink-bowl-floor');
 const drainRing=new THREE.RingGeometry(.039,.050,64);drainRing.rotateX(-Math.PI/2);drainRing.translate(0,-.210,drainZ);add(drainRing,steel,'sink-drain-ring');
 const basket=new THREE.Shape();basket.absarc(0,0,.038,0,Math.PI*2,false);for(const [radius,count] of [[.016,9],[.029,16]])for(let i=0;i<count;i++){const a=i/count*Math.PI*2,h=new THREE.Path();h.absarc(Math.cos(a)*radius,Math.sin(a)*radius,.0022,0,Math.PI*2,true);basket.holes.push(h);}const sg=new THREE.ShapeGeometry(basket,32);sg.rotateX(-Math.PI/2);sg.translate(0,-.211,drainZ);add(sg,steel,'sink-strainer');
 const center=new THREE.CylinderGeometry(.007,.007,.004,24);center.translate(0,-.210,drainZ);add(center,steel,'sink-strainer-centre');
 const overflow=new THREE.BoxGeometry(.042,.007,.003);overflow.translate(0,-.024,(S.bowl.offsetZ-S.bowl.depth/2+1.5)*M);add(overflow,steel,'sink-overflow');
 const slit=new THREE.BoxGeometry(.028,.002,.0035);slit.translate(0,-.024,(S.bowl.offsetZ-S.bowl.depth/2+2)*M);add(slit,dark,'sink-overflow-slot');
 return group;
}
