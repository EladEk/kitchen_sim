import {cutGeometryAtHeight,isSectionWall} from './section-height.mjs';
import * as THREE from 'three';
import {motionAncestor,motionRoots,createMotionCopy} from './model-motions.mjs';
import {inside} from './navigation.mjs';

// A section contains actual geometry, so live rendering, photo rendering and
// bounds all agree. Generic navigation polygons are the only selection data.
export function selectionRegions(nav,{level=9,target='',roomFocus=null}){
 const d=nav.destinations.find(d=>d.id===target);
 if(d?.unit&&roomFocus?.unit===d.unit&&roomFocus.floor===d.floor&&roomFocus.polygons?.length){const domain=roomFocus.displayDomain||roomFocus.polygons.map(p=>[p]),polygons=domain.map(r=>r[0]);return [{level:d.floor,polygon:polygons[0],polygons,triangles:domain.flatMap(r=>triangulate(r[0],r.slice(1)).map(t=>t.p))}];}
 if(d?.unit)return nav.floors.flatMap(f=>f.units.filter(u=>u.number===d.unit).map(u=>({level:f.level,polygon:u.polygon,polygons:u.displayPolygons||[u.polygon],triangles:u.displayTriangles})));
 if(d?.polygon)return [{level:d.floor,polygon:d.polygon}];
 return level===9?[]:[{level,polygon:null}];
}
const cross=(a,b,p)=>(b[0]-a[0])*(p[2]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function clip(vertices,a,b,sign){
 const out=[];
 for(let i=0;i<vertices.length;i++){
  const p=vertices[i],q=vertices[(i+1)%vertices.length],dp=sign*cross(a,b,p),dq=sign*cross(a,b,q),pin=dp>=-1e-7,qin=dq>=-1e-7;
  if(pin)out.push(p);
  if(pin!==qin)out.push(mix(p,q,Math.max(0,Math.min(1,dp/(dp-dq)))));
 }return out;
}
function triangulate(polygon,holes=[]){
 const points=polygon.map(p=>new THREE.Vector2(...p)),inner=holes.map(r=>r.map(p=>new THREE.Vector2(...p))),all=[polygon,...holes].flat();
 return THREE.ShapeUtils.triangulateShape(points,inner).map(face=>{const p=face.map(i=>all[i]),sign=Math.sign((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]));return {p,sign,minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))};});
}
function compiledTriangles(triangles){return triangles.map(p=>({p,sign:Math.sign((p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0])),minX:Math.min(...p.map(v=>v[0])),maxX:Math.max(...p.map(v=>v[0])),minZ:Math.min(...p.map(v=>v[1])),maxZ:Math.max(...p.map(v=>v[1]))}));}
export function createSelection(template,nav,state){
 const regions=selectionRegions(nav,state),group=new THREE.Group(),owned=[],instances=[],moving=[],buckets=new Map();group.name='public-selected-section';
 template.updateWorldMatrix(true,true);const inverse=template.matrixWorld.clone().invert(),instance=new THREE.Matrix4();
 const compiled=regions.map(r=>({...r,triangles:r.polygon?(r.triangles?compiledTriangles(r.triangles):triangulate(r.polygon)):null}));
 for(const source of motionRoots(template)){
  const region=compiled.find(r=>r.level===(source.userData.level??0));if(!region)continue;
  const bounds=new THREE.Box3().setFromObject(source).applyMatrix4(inverse);
  if(region.polygon&&!region.triangles.some(t=>bounds.max.x>=t.minX&&bounds.min.x<=t.maxX&&bounds.max.z>=t.minZ&&bounds.min.z<=t.maxZ))continue;
  const copy=createMotionCopy(source,template);moving.push(copy);group.add(copy.group);if(Number.isFinite(state.wallHeight)){copy.group.updateMatrixWorld(true);copy.group.traverse(o=>{if(!o.isMesh)return;const cut=cutGeometryAtHeight(o.geometry,o.matrixWorld,(nav.floors.find(f=>f.level===region.level)?.elevation??region.level*nav.storey)+state.wallHeight+.03);if(cut){owned.push(cut);o.geometry=cut;}});}
 }
 const append=(material,vertices,wallKey=null)=>{
  const key=wallKey||material;
  if(!buckets.has(key))buckets.set(key,{material,wall:!!wallKey,positions:[],normals:[],uvs:[]});const out=buckets.get(key);
  for(let i=1;i+1<vertices.length;i++){
   const face=[vertices[0],vertices[i],vertices[i+1]],a=new THREE.Vector3(...face[0]),b=new THREE.Vector3(...face[1]),c=new THREE.Vector3(...face[2]);if(b.sub(a).cross(c.sub(a)).lengthSq()<1e-15)continue;
   for(const v of face){out.positions.push(...v.slice(0,3));out.normals.push(...v.slice(3,6));out.uvs.push(...v.slice(6,8));}
  }
 };
 template.traverse(o=>{
  if(!o.isMesh||o.userData.furnitureCollisionProxy||motionAncestor(o,template)||o.userData.ceiling||o.userData.roof||o.userData.sceneUi||(o.userData.securityOverlay||o.userData.tourNonPhysical)&&!o.userData.renderFixture)return;
  const region=compiled.find(r=>r.level===(o.userData.level??0));if(!region)return;
  const base=inverse.clone().multiply(o.matrixWorld);
  if(o.userData.furnitureRender){
   // Plan-registered furniture already fits its room. Select complete instances
   // by their anchor, retaining the GLB buffers instead of clipping thousands
   // of upholstery/leaf triangles whenever an apartment is selected.
   const matrices=[];
   for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const local=new THREE.Matrix4();if(o.isInstancedMesh)o.getMatrixAt(i,local);const world=base.clone().multiply(local);if(!region.polygon||inside([world.elements[12],world.elements[14]],region.polygon))matrices.push(local);}
   if(!matrices.length)return;
   const mesh=new THREE.InstancedMesh(o.geometry,o.material,matrices.length);mesh.matrixAutoUpdate=false;mesh.matrix.copy(base);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=o.castShadow;mesh.receiveShadow=o.receiveShadow;mesh.userData={...o.userData};mesh.computeBoundingSphere();group.add(mesh);instances.push(mesh);return;
  }
  if(!region.polygon&&!(Number.isFinite(state.wallHeight)&&isSectionWall(o))){const mesh=o.clone(false);mesh.matrixAutoUpdate=false;mesh.matrix.copy(base);group.add(mesh);if(mesh.isInstancedMesh)instances.push(mesh);return;}
  const sourceGeo=o.geometry;
  for(let inst=0;inst<(o.isInstancedMesh?o.count:1);inst++){
   const matrix=base.clone();if(o.isInstancedMesh){o.getMatrixAt(inst,instance);matrix.multiply(instance);}
   const cut=Number.isFinite(state.wallHeight)&&isSectionWall(o)?cutGeometryAtHeight(sourceGeo,matrix,(nav.floors.find(f=>f.level===region.level)?.elevation??region.level*nav.storey)+state.wallHeight+.03):null;if(cut)owned.push(cut);const geo=cut||sourceGeo,pos=geo.attributes.position,normal=geo.attributes.normal,uv=geo.attributes.uv,idx=geo.index,limit=idx?.count??pos.count;if(!limit)continue;if(!geo.boundingBox)geo.computeBoundingBox();
   const box=geo.boundingBox.clone().applyMatrix4(matrix),pieces=region.polygon?region.triangles.filter(t=>box.max.x>=t.minX-1e-6&&box.min.x<=t.maxX+1e-6&&box.max.z>=t.minZ-1e-6&&box.min.z<=t.maxZ+1e-6):[null];if(!pieces.length)continue;
   const nm=new THREE.Matrix3().getNormalMatrix(matrix);
   for(let i=0;i+2<limit;i+=3){
    const face=[];
    for(let j=0;j<3;j++){
     const k=idx?idx.getX(i+j):i+j,p=new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(matrix),n=normal?new THREE.Vector3().fromBufferAttribute(normal,k).applyMatrix3(nm).normalize():new THREE.Vector3(0,1,0);face.push([p.x,p.y,p.z,n.x,n.y,n.z,uv?.getX(k)??0,uv?.getY(k)??0]);
    }
    const xs=face.map(p=>p[0]),zs=face.map(p=>p[2]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),material=Array.isArray(o.material)?o.material[geo.groups.find(g=>i>=g.start&&i<g.start+g.count)?.materialIndex??0]:o.material;
    for(const t of pieces){
     if(t&&(maxX<t.minX||minX>t.maxX||maxZ<t.minZ||minZ>t.maxZ))continue;
     let polygon=face;for(let edge=0;t&&edge<t.p.length&&polygon.length>=3;edge++)polygon=clip(polygon,t.p[edge],t.p[(edge+1)%t.p.length],t.sign);
     if(polygon.length>=3)append(material,polygon,isSectionWall(o)?o.uuid+':'+inst+':'+material.uuid:null);
    }
   }
  }
 });
 for(const b of buckets.values()){const material=b.material;const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));geo.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(b.uvs,2));geo.computeBoundingSphere();owned.push(geo);const mesh=new THREE.Mesh(geo,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.editorWallPiece=b.wall;group.add(mesh);}
 group.updateMatrixWorld(true);
 return {group,regions,sync(){moving.forEach(c=>c.sync());group.updateMatrixWorld(true);},dispose(){owned.forEach(g=>g.dispose());instances.forEach(m=>m.dispose());moving.forEach(c=>c.dispose());group.clear();owned.length=instances.length=moving.length=0;buckets.clear();}};
}
