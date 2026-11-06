import * as T from 'three';
import {dimensionedFurnitureParts} from '../src/dimensioned-furniture.mjs';
import {DISTRICT,buildingTransform,mirroredGeometry} from './district.mjs';
import {furniturePartColor,furnitureMaterialProperties} from './furniture-palette.mjs';
export function createLiveFurniturePreview(){
 const group=new T.Group(),cube=new T.BoxGeometry(1,1,1),mirror=mirroredGeometry(cube,[0,0]),flip=new T.Matrix4().makeScale(-1,1,1),materials=new Map(),owned=[];group.userData={tourNonPhysical:true,liveFurniturePreview:true};let signature='',disposed=false,rows=[];
 function clear(){group.clear();rows.length=0;for(const m of owned)m.dispose();owned.length=0;materials.clear();}
 function set(items,scope,{visible=true,valid=true,elevation=0}={}){
  if(disposed)return false;group.visible=visible&&items.length>0;if(!group.visible)return false;
  const next=scope.building+'|'+items.map(r=>[r.id,r.kind,r.w,r.h,r.d,r.color||'',r.seatDepth||'',r.cornerSide||''].join(':')).join('|'),b=DISTRICT.find(b=>b.id===scope.building);if(!b)return false;const transform=buildingTransform(b),rebuilt=next!==signature;
  if(rebuilt){clear();signature=next;for(const item of items){if(!['w','h','d'].every(k=>Number.isFinite(item[k])&&item[k]>0))continue;for(const p of dimensionedFurnitureParts(item)){const color=furniturePartColor(item,p),key=p.material+color;if(!materials.has(key)){const m=new T.MeshStandardMaterial({color,...(p.material==='glass'?furnitureMaterialProperties('glass'):{roughness:.78}),transparent:true,opacity:p.material==='glass'?.28:.72,depthWrite:false});m.userData.architecturalInterior=true;materials.set(key,m);owned.push(m);}const mesh=new T.Mesh(b.mirror?mirror:cube,materials.get(key));mesh.matrixAutoUpdate=false;mesh.userData={tourNonPhysical:true,liveFurniturePreview:true};mesh.raycast=()=>{};group.add(mesh);rows.push({mesh,part:p,itemId:item.id});}
    const m=new T.MeshBasicMaterial({color:valid?'#3d9961':'#c24e3f',wireframe:true,transparent:true,opacity:.85,depthWrite:false});owned.push(m);const mesh=new T.Mesh(b.mirror?mirror:cube,m);mesh.matrixAutoUpdate=false;mesh.userData={tourNonPhysical:true};mesh.raycast=()=>{};group.add(mesh);rows.push({mesh,itemId:item.id,outline:true});}}
  const byId=new Map(items.map(r=>[r.id,r]));for(const row of rows){const item=byId.get(row.itemId);if(!item)continue;const local=new T.Matrix4().compose(new T.Vector3(item.x,elevation+.03+(item.y||0),item.z),new T.Quaternion().setFromAxisAngle(T.Object3D.DEFAULT_UP,item.yaw),new T.Vector3(1,1,1)),[x,y,z,w,h,d]=row.outline?[0,item.h/2,0,item.w+.008,item.h+.008,item.d+.008]:row.part.box;row.mesh.matrix.copy(transform).multiply(local).multiply(new T.Matrix4().makeTranslation(x,y,z)).multiply(new T.Matrix4().makeScale(w,h,d));if(b.mirror)row.mesh.matrix.multiply(flip);if(row.outline)row.mesh.material.color.set(valid?'#3d9961':'#c24e3f');}
  group.updateMatrixWorld(true);return rebuilt;
 }
 return {group,set,dispose(){if(disposed)return;disposed=true;clear();cube.dispose();mirror.dispose();group.removeFromParent();}};
}
