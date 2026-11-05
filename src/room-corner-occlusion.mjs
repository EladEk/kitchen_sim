import * as T from 'three';
const shared=new WeakMap();
// A shared static contact gradient at convex room corners. This is approximate
// occlusion, not baked GI. It adds one merged draw per floor and works in XR.
export function addRoomCornerOcclusion(parent,rooms,resources,{base=0,height=2.75,part='room-corner-occlusion',level=0}={}){
 const positions=[],uvs=[],indices=[],seen=new Set(),width=.16,offset=.0025;
 parent.updateWorldMatrix(true,true);const walls=[],inverse=parent.matrixWorld.clone().invert();
 parent.traverse(o=>{if(o.isMesh&&(o.userData.wallId||/wall/.test(o.userData.part||''))&&!o.userData.visualOnly&&(o.userData.buildingFloor??level)===level)walls.push(o);});
 const ray=new T.Raycaster(),instance=new T.Matrix4();
 const project=(p,tangent,inward)=>{
  const origin=new T.Vector3(p[0]+tangent[0]*.075+inward[0]*.24,base+Math.min(height/2,1.4),p[1]+tangent[1]*.075+inward[1]*.24).applyMatrix4(parent.matrixWorld),direction=new T.Vector3(-inward[0],0,-inward[1]).transformDirection(parent.matrixWorld);
  ray.set(origin,direction);ray.far=.5;
  for(const hit of ray.intersectObjects(walls,false)){
   const matrix=hit.object.matrixWorld.clone();if(hit.instanceId!==undefined){hit.object.getMatrixAt(hit.instanceId,instance);matrix.multiply(instance);}const normal=hit.face.normal.clone().applyMatrix3(new T.Matrix3().getNormalMatrix(matrix)).normalize(),expected=new T.Vector3(...[inward[0],0,inward[1]]).transformDirection(parent.matrixWorld);
   if(normal.dot(expected)<.8)continue;const at=hit.point.clone().applyMatrix4(inverse),delta=(at.x-p[0])*inward[0]+(at.z-p[1])*inward[1];return Math.abs(delta)<.18?delta:null;
  }return null;
 };
 for(const room of rooms)for(const polygon of room.polygons||[room.polygon]){
  if(!polygon?.length)continue;
  let area=0;for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length];area+=a[0]*b[1]-b[0]*a[1];}const sign=Math.sign(area)||1;
  for(let i=0;i<polygon.length;i++){
   const p=polygon[i],a=polygon[(i+polygon.length-1)%polygon.length],b=polygon[(i+1)%polygon.length],u=[a[0]-p[0],a[1]-p[1]],v=[b[0]-p[0],b[1]-p[1]],lu=Math.hypot(...u),lv=Math.hypot(...v);
   if(lu<.2||lv<.2||(-u[0]*v[1]+u[1]*v[0])*sign<.01*lu*lv)continue;
   // Skip collinear sampling points and artificial open-plan diagonals.
   if(Math.abs(u[0]*v[0]+u[1]*v[1])/(lu*lv)>.25)continue;
   let corner=p;
   if(walls.length){const un=u.map(n=>n/lu),vn=v.map(n=>n/lv),du=project(p,un,vn),dv=project(p,vn,un);if(du===null||dv===null)continue;corner=p.map((n,k)=>n+un[k]*dv+vn[k]*du);}
   const key=corner.map(n=>n.toFixed(3)).join(':')+':'+room.unit;if(seen.has(key))continue;seen.add(key);
   for(const [d,l,other,ol] of [[u,lu,v,lv],[v,lv,u,lu]]){
    const start=[corner[0]+other[0]/ol*offset,corner[1]+other[1]/ol*offset],end=[start[0]+d[0]/l*Math.min(width,l*.3),start[1]+d[1]/l*Math.min(width,l*.3)],n=positions.length/3;
    positions.push(start[0],base+.08,start[1],end[0],base+.08,end[1],end[0],base+height-.01,end[1],start[0],base+height-.01,start[1]);uvs.push(0,0,1,0,1,1,0,1);indices.push(n,n+1,n+2,n,n+2,n+3);
   }
  }
 }
 if(!positions.length)return null;
 let material=shared.get(resources);if(!material){
  const data=new Uint8Array(64*16*4);for(let y=0;y<16;y++)for(let i=0;i<64;i++){const fade=Math.min(1,y/15*12,(1-y/15)*12);data.set([255,255,255,Math.round((1-i/63)**2*fade*36)],(y*64+i)*4);}
 const map=new T.DataTexture(data,64,16);map.needsUpdate=true;map.minFilter=map.magFilter=T.LinearFilter;
  material=new T.MeshBasicMaterial({color:'#000000',map,transparent:true,depthWrite:false,side:T.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1,toneMapped:false});
  shared.set(resources,material);resources.push(map,material);
 }
 const geometry=new T.BufferGeometry().setAttribute('position',new T.Float32BufferAttribute(positions,3)).setAttribute('uv',new T.Float32BufferAttribute(uvs,2)).setIndex(indices);geometry.computeVertexNormals();
 const mesh=new T.Mesh(geometry,material);mesh.userData={part,buildingFloor:level,level,exterior:false,visualOnly:true,tourNonPhysical:true};mesh.renderOrder=1;parent.add(mesh);resources.push(geometry);return mesh;
}
