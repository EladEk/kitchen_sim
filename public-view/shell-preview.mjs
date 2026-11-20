import {FACADE_COLOR} from '../src/facade-finish.mjs';
import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {buildingTransform,DISTRICT} from './district.mjs';

// Small public-only shell description. Detailed/private models are never inputs.
export function createShellPreview(data,{aspect=1}={}){
 const scene=new T.Scene(),root=new T.Group(),cube=new T.BoxGeometry(),owned=[cube],rows={walls:[],windows:[],frames:[]};scene.add(root);scene.background=new T.Color('#f2eee6');
 const push=(kind,x,y,z,w,h,d,angle)=>{if(w>.001&&h>.001)rows[kind].push(new T.Matrix4().compose(new T.Vector3(x,y,z),new T.Quaternion().setFromEuler(new T.Euler(0,angle,0)),new T.Vector3(w,h,d)));};
 const plates=[];
 for(const floor of data.floors)for(const path of floor.envelope){
  const shape=new T.Shape(path.polygon.map(p=>new T.Vector2(...p))),plate=new T.ShapeGeometry(shape);plate.rotateX(Math.PI/2);plate.translate(0,floor.elevation,0);plates.push(plate);
  path.polygon.forEach((a,i)=>{
   const b=path.polygon[(i+1)%path.polygon.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),u=[(b[0]-a[0])/length,(b[1]-a[1])/length],at=t=>[a[0]+u[0]*t,a[1]+u[1]*t],angle=-Math.atan2(u[1],u[0]),base=floor.elevation;
   const segment=(l,r,y,h)=>{const p=at((l+r)/2);push('walls',p[0],base+y+h/2,p[1],r-l,h,.3,angle);};
   const openings=path.openings.filter(o=>o.edge===i).map(o=>({...o,span:[o.a,o.b].map(p=>(p[0]-a[0])*u[0]+(p[1]-a[1])*u[1]).sort((a,b)=>a-b)})).sort((a,b)=>a.span[0]-b.span[0]);let cursor=0;
   for(const opening of openings){const [l,r]=opening.span,sill=opening.kind==='slider'?0:1,h=opening.kind==='slider'?2.3:1.25;segment(cursor,l,0,data.storey);segment(l,r,0,sill);segment(l,r,sill+h,data.storey-sill-h);const p=at((l+r)/2);push('windows',p[0],base+sill+h/2,p[1],r-l-.05,h-.05,.025,angle);for(const edge of [l,r,(l+r)/2]){const q=at(edge);push('frames',q[0],base+sill+h/2,q[1],.045,h,.06,angle);}for(const y of [sill,sill+h])push('frames',p[0],base+y,p[1],r-l,.045,.06,angle);cursor=r;}
   segment(cursor,length,0,data.storey);
  });
 }
 for(const [kind,color]of Object.entries({walls:FACADE_COLOR,windows:'#a3b5b5',frames:'#2d3136'})){
  const material=new T.MeshLambertMaterial({color}),mesh=new T.InstancedMesh(cube,material,rows[kind].length);rows[kind].forEach((m,i)=>mesh.setMatrixAt(i,m));root.add(mesh);owned.push(material);mesh.computeBoundingSphere();
 }
 if(plates.length){const geometry=mergeGeometries(plates),material=new T.MeshLambertMaterial({color:'#b8bcc0',side:T.DoubleSide});root.add(new T.Mesh(geometry,material));owned.push(geometry,material);plates.forEach(g=>g.dispose());}
 root.applyMatrix4(buildingTransform(DISTRICT.find(b=>b.id==='4102')));root.updateMatrixWorld(true);scene.add(new T.HemisphereLight('#fff9f0','#dcd8d0',2));const sun=new T.DirectionalLight('#ffffff',2);sun.position.set(-20,40,20);scene.add(sun);
 const bounds=new T.Box3().setFromObject(root),centre=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3()),distance=Math.max(size.x,size.y,size.z)*1.6,camera=new T.PerspectiveCamera(48,aspect,.1,1000);camera.position.copy(centre).add(new T.Vector3(distance*.8,distance*.55,distance));camera.lookAt(centre);
 return {scene,camera,dispose(){root.traverse(o=>o.isInstancedMesh&&o.dispose());owned.forEach(o=>o.dispose());scene.clear();}};
}
export async function showShellPreview(renderer,{revision,signal,aspect,allowed=()=>true}={}){
 const response=await fetch('/baseline/shell.json?v='+revision,{signal,cache:'default'});if(!response.ok)return null;
 const data=await response.json();if(data.revision!==revision||!allowed())return null;const shell=createShellPreview(data,{aspect});
 try{await renderer.compileAsync(shell.scene,shell.camera);if(signal?.aborted||!allowed()){shell.dispose();return null;}renderer.render(shell.scene,shell.camera);return shell;}catch(error){shell.dispose();throw error;}
}
