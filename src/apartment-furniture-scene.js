import * as THREE from 'three';
import {APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {groundPoint,groundDirection} from './ground-apartments.mjs';
const baseBeds=[{x:.70,z:5.65,w:1.05,d:1.95},{x:.70,z:8.55,w:1.05,d:1.95},{x:1.30,z:14.40,w:1.65,d:2,angle:Math.PI},{x:5.25,z:14.10,w:1.05,d:1.95},{x:7.30,z:10.40,w:1.35,d:1.9,angle:Math.PI}];
export function groundProposedBeds(){return [1,2,3].flatMap(unit=>baseBeds.map((b,i)=>{const p=groundPoint(unit,[b.x,b.z]),n=groundDirection(unit,[Math.sin(b.angle||0),Math.cos(b.angle||0)]),angle=Math.atan2(n[0],n[1]),w=Math.abs(Math.cos(angle))*b.w+Math.abs(Math.sin(angle))*b.d,d=Math.abs(Math.sin(angle))*b.w+Math.abs(Math.cos(angle))*b.d;return {...b,id:`ground-${unit}-bed-${i}`,floor:0,unit,kind:'bed',x:p[0],z:p[1],angle,box:{minX:p[0]-w/2,maxX:p[0]+w/2,minZ:p[1]-d/2,maxZ:p[1]+d/2}};}));}
export function apartmentFurnitureBoxes(level){return (level===0?groundProposedBeds():APARTMENT_FURNITURE.filter(r=>r.floor===level)).map(r=>({...r.box,apartmentFurniture:r.id,unit:r.unit}));}
export function buildApartmentFurniture({parent,resources,level,base,settings}){
 if(settings.furniture===false)return;
 const items=level===0?groundProposedBeds():APARTMENT_FURNITURE.filter(r=>r.floor===level);if(!items.length)return;
 const cube=new THREE.BoxGeometry(1,1,1);resources.push(cube);
 const mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75,...extra});resources.push(m);return m;},palette={wood:mat('#a28d76'),mattress:mat('#f1eee5'),linen:mat('#a9b8b3'),pillow:mat('#faf8ef'),cabinet:mat('#e5dfd2'),stone:mat('#c7c2b4'),dark:mat('#303a3c',{roughness:.32}),steel:mat('#9ea8a5',{metalness:.75,roughness:.28})},batches=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 function box(r,part,m,x,y,z,w,h,d){const c=Math.cos(r.angle),s=Math.sin(r.angle),key=part;let b=batches.get(key);if(!b)batches.set(key,b={part,m,items:[]});b.items.push([r.x+x*c+z*s,base+y,r.z-x*s+z*c,w,h,d,r.angle,r.id,r.unit]);}
 for(const r of items){
  if(r.kind==='bed'){
   box(r,'apartment-bed-frame',palette.wood,0,.22,0,r.w,.30,r.d);
   box(r,'apartment-mattress',palette.mattress,0,.44,0,r.w-.04,.22,r.d-.05);
   box(r,'apartment-duvet',palette.linen,0,.565,.25,r.w-.07,.04,r.d-.64);
   box(r,'apartment-headboard',palette.wood,0,.54,-r.d/2+.025,r.w,.86,.05);
   const count=r.w>1.25?2:1;for(let i=0;i<count;i++)box(r,'apartment-pillow',palette.pillow,(i-(count-1)/2)*r.w*.45,.585,-r.d/2+.28,r.w/count-.12,.10,.38);
  }else{
   box(r,'apartment-kitchen-base',palette.cabinet,0,.45,0,r.w,.82,r.d);
   box(r,'apartment-kitchen-plinth',palette.dark,0,.065,0,r.w-.04,.11,r.d-.06);
   box(r,'apartment-kitchen-worktop',palette.stone,0,.885,0,r.w+.015,.05,r.d+.02);
   const n=Math.round(r.w/.6);for(let i=0;i<n;i++){const x=-r.w/2+(i+.5)*r.w/n;box(r,'apartment-kitchen-front',palette.cabinet,x,.48,r.d/2+.006,r.w/n-.016,.71,.012);box(r,'apartment-kitchen-handle',palette.dark,x,.74,r.d/2+.023,.18,.014,.022);}
   // Sink inset and perimeter, plus flush two-zone cooktop; illustrative fixtures.
   box(r,'apartment-kitchen-sink',palette.dark,-r.w*.27,.914,0,.47,.008,.40);
   for(const x of [-r.w*.27-.24,-r.w*.27+.24])box(r,'apartment-kitchen-sink-rim',palette.steel,x,.924,0,.018,.015,.42);
   for(const z of [-.205,.205])box(r,'apartment-kitchen-sink-rim',palette.steel,-r.w*.27,.924,z,.49,.015,.018);
   box(r,'apartment-kitchen-tap',palette.steel,-r.w*.27,1.05,-.20,.025,.28,.025);
   box(r,'apartment-kitchen-tap-spout',palette.steel,-r.w*.27,1.18,-.12,.025,.025,.18);
   box(r,'apartment-kitchen-hob',palette.dark,r.w*.25,.92,0,.57,.014,.46);
   for(const x of [r.w*.25-.15,r.w*.25+.15])box(r,'apartment-kitchen-hob-zone',palette.steel,x,.929,0,.17,.002,.22);
  }
 }
 for(const b of batches.values()){const mesh=new THREE.InstancedMesh(cube,b.m,b.items.length);b.items.forEach(([x,y,z,w,h,d,angle],i)=>{q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);});mesh.name=b.part;mesh.userData={part:b.part,buildingFloor:level,proposed:true,dimensionsInferred:true,placements:b.items.map(r=>({id:r[7],unit:r[8]}))};mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);}
}
