import * as THREE from 'three';

export const contextRect=([minX,maxX,minZ,maxZ])=>({minX,maxX,minZ,maxZ});
export const contextPolygon=b=>[[b[0],b[2]],[b[1],b[2]],[b[1],b[3]],[b[0],b[3]]];
export function contextParking(context){
 const bays=[];for(const aisle of [27,56])for(const side of [-1,1])for(let z=238;z<267;z+=2.65){const x=aisle+side*5.6;bays.push({x,z,w:5,d:2.5,angle:Math.PI/2,length:4.05});}return bays;
}

// Shared external context, rendered once outside the residential template.
export function createDistrictContext(context,utilities=[]){
 const group=new THREE.Group();group.name='district-education-and-utilities';
 const geometry=new THREE.BoxGeometry(1,1,1),materials=[],batches=new Map(),matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion();let disposed=false;
 const mat=(color,options={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.87,...options});materials.push(m);return m;};
 const wall=mat('#dedbd1'),roof=mat('#e5e4dc'),stone=mat('#b9b9b0'),frame=mat('#7e8988',{metalness:.52,roughness:.43}),glass=mat('#526b73',{metalness:.12,roughness:.24,envMapIntensity:.9}),wood=mat('#9f8465'),blue=mat('#526f80'),line=mat('#eeeadd'),asphalt=mat('#50575a'),pipe=mat('#57786a',{metalness:.38,roughness:.66});
 function box(x,y,z,w,h,d,m,data={},angle=0){if(!batches.has(m))batches.set(m,[]);batches.get(m).push({x,y,z,w,h,d,angle,data});}
 function solid(bounds,height,m,data={}){const [a,b,c,d]=bounds;box((a+b)/2,height/2,(c+d)/2,b-a,height,d-c,m,data);}
 for(const b of context.buildings){
  const [x0,x1,z0,z1]=b.bounds,w=x1-x0,d=z1-z0,h=b.height,data={contextBuilding:b.id,part:'education-wall',exterior:true,dimensionsInferred:true};
  solid(b.bounds,h,wall,data);box((x0+x1)/2,h+.04,(z0+z1)/2,w,.12,d,roof,{...data,part:'education-roof'});
  for(const x of [x0+.12,x1-.12])box(x,h+.27,(z0+z1)/2,.24,.44,d,wall,data);
  for(const z of [z0+.12,z1-.12])box((x0+x1)/2,h+.27,z,w,.44,.24,wall,data);
  // Repeated daylight windows and vertical mullions follow the visible scale.
  const storey=h/b.floors;
  for(let f=0;f<b.floors;f++){
   const y=f*storey+storey*.55,wh=b.style==='glazed'?storey*.69:storey*.40;
   for(const z of [z0-.032,z1+.032])for(let x=x0+1.65;x<x1-1;x+=b.style==='glazed'?2.65:2.9){box(x,y,z,2.05,wh,.045,glass,{...data,part:'education-window'});box(x,y,z,0.055,wh+.08,.065,frame,data);}
   for(const x of [x0-.032,x1+.032])for(let z=z0+1.65;z<z1-1;z+=2.8){box(x,y,z,.045,wh,2.05,glass,{...data,part:'education-window'});box(x,y,z,.065,wh+.08,.055,frame,data);}
   if(b.style==='glazed')for(const z of [z0-.07,z1+.07])box((x0+x1)/2,f*storey+.12,z,w,.20,.18,stone,data);
  }
  if(b.style==='accent'){box(x0+w*.35,h*.49,z1+.07,w*.17,h*.87,.12,wood,data);box(x0+w*.57,h*.57,z1+.071,w*.15,h*.79,.12,blue,data);}
  const skylightW=w>d?w*.74:w*.58,skylightD=w>d?d*.25:d*.62;
  box((x0+x1)/2,h+.7,(z0+z1)/2,skylightW,.85,skylightD,stone,{...data,part:'education-clerestory'});
  box((x0+x1)/2,h+.73,(z0+z1)/2+skylightD/2+.025,skylightW*.95,.61,.035,glass,data);
  box((x0+x1)/2,h+1.15,(z0+z1)/2,skylightW+.22,.10,skylightD+.2,roof,data);
 }
 // Campus parking has no claimed numbering or allocation.
 const bays=contextParking(context);
 for(const bay of bays)for(const z of [bay.z-bay.d/2,bay.z+bay.d/2])box(bay.x,-.023,z,bay.w,.012,.055,line,{part:'education-parking-mark'});
 // A single main-meter assembly occupies the common plot edge.
 for(const u of utilities){
  const [x,z]=u.position,[w,h,d]=u.size,part=(dx,y,dz,a,b,c,m)=>box(x+dx*Math.cos(u.angle)+dz*Math.sin(u.angle),y,z-dx*Math.sin(u.angle)+dz*Math.cos(u.angle),a,b,c,m,{part:'shared-water-meter',utilityId:u.id},u.angle);
  part(0,h/2,0,w,h,d,stone);
  for(let i=0;i<4;i++){const dx=-w/2+(i+.5)*w/4;part(dx,h/2,d/2+.016,w/4-.018,h-.09,.028,pipe);part(dx+w/8-.09,h*.52,d/2+.043,.023,.15,.025,frame);}
  const marker=new THREE.Group();marker.name='shared-main-water-meter';marker.userData={utilityId:u.id,shared:true,positionReconciled:true};marker.position.set(x,0,z);group.add(marker);
 }
 for(const [material,items] of batches){
  const mesh=new THREE.InstancedMesh(geometry,material,items.length);items.forEach((p,i)=>{matrix.compose(new THREE.Vector3(p.x,p.y,p.z),quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle),new THREE.Vector3(p.w,p.h,p.d));mesh.setMatrixAt(i,matrix);});
  mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.userData={part:'district-context-batch',context:true,exterior:true};group.add(mesh);
 }
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=128;const ctx=canvas.getContext('2d');
  if(ctx){ctx.fillStyle='#f1f1e9';ctx.fillRect(0,0,1024,128);ctx.direction='rtl';ctx.fillStyle='#365343';ctx.font='bold 52px Arial';ctx.textAlign='center';ctx.fillText(context.label,512,83);const map=new THREE.CanvasTexture(canvas),material=new THREE.SpriteMaterial({map,depthTest:true}),label=new THREE.Sprite(material);label.position.set(115,15,242);label.scale.set(40,5,1);group.add(label);materials.push(material);label.userData.contextLabel=true;}
 }
 group.updateMatrixWorld(true);
 return {group,bays,stats:{drawCalls:batches.size,buildingParts:context.buildings.length,utilities:utilities.length},dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const o of group.children){o.dispose?.();if(o.isSprite)o.material.map?.dispose();}geometry.dispose();materials.forEach(m=>m.dispose());materials.length=0;batches.clear();group.clear();}};
}
