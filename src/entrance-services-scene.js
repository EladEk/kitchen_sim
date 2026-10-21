import * as THREE from 'three';
import {ENTRANCE_SERVICES as E} from './home-model.mjs';
import {buildEntryWaterMeters} from './entry-water-meters-scene.js';

export function buildEntranceServices({group,box,cylinder,floor,mat,resources,motions,picks,settings,mode}){
 const groups=new Map(),opened=new Set(settings.openParts),paint=mat('#e6e3db',{roughness:.72}),frame=mat('#a4aaa5',{metalness:.5,roughness:.43}),white=mat('#f4f3ee',{roughness:.38}),black=mat('#242727',{roughness:.95}),blue=mat('#266b86',{roughness:.6}),grey=mat('#626561',{roughness:.75}),steel=mat('#9d9e91',{metalness:.66,roughness:.5}),brass=mat('#92754d',{metalness:.7,roughness:.42});
 const context=new THREE.Group();context.userData={part:'entry-common-context',outsideApartment:true,dimensionsInferred:true};group.add(context);
 floor(E.context.polygon,mat('#d3cec2'),-.005,context);
 // Show the public ceiling only in the full-height views, keeping the cutaway clear.
 if(mode==='walk'||!settings.cutaway){const slab=floor(E.context.polygon,paint,E.ceiling,context);slab.userData.part='entry-common-ceiling';}
 for(const c of E.cabinets){
  const p=new THREE.Group();p.position.set(c.x,0,c.z);p.userData={buildingId:c.id,entryService:true,inspectionView:c.meters?{from:[c.x,1.4,c.z-1.7],target:[c.x,.72,c.z+.28]}:{from:[c.x,1.5,c.z-2.8],target:[c.x,1.3,c.z+.24]}};group.add(p);groups.set(c.id,p);
  const data={action:'building',buildingId:c.id,entryService:true};
  box(0,c.bottom+c.h/2,c.d-.016,c.w,c.h,.032,paint,p,{...data,part:'entry-cabinet-back'});
  for(const x of [-c.w/2,c.w/2])box(x,c.bottom+c.h/2,c.d/2,.028,c.h,c.d,paint,p,{...data,part:'entry-cabinet-side'});
  for(const y of [c.bottom,c.bottom+c.h])box(0,y,c.d/2,c.w,.026,c.d,paint,p,data);
  for(const x of [-c.w/2,c.w/2])box(x,c.bottom+c.h/2,-.012,.024,c.h+.03,.04,frame,p,data);
  for(const y of [c.bottom,c.bottom+c.h])box(0,y,-.012,c.w+.02,.022,.04,frame,p,data);
  for(const [i,part] of c.parts.entries()){
   const sign=i? -1:1,leaf=new THREE.Group();leaf.position.set((i?1:-1)*c.w/2,c.bottom,-.035);p.add(leaf);
   const target=opened.has(part.id)?sign*Math.PI/2:0;leaf.rotation.y=target;leaf.userData={entryPartId:part.id,buildingId:c.id};
   motions.push({id:part.id,object:leaf,axis:'rotation',property:'y',target,openTarget:sign*Math.PI/2});
   const leafData={action:'part',partId:part.id,buildingId:c.id,part:'entry-service-door'};
   box(sign*c.w/4,c.h/2,0,c.w/2-.015,c.h-.03,.026,paint,leaf,leafData);
   box(sign*(c.w/2-.045),c.h*.46,-.025,.017,.12,.02,white,leaf,leafData);
   for(const y of [.22,c.h-.24])box(0,y,-.018,.02,.065,.018,frame,leaf,leafData);
  }
  const component=(part)=>({...data,part,observed:true,dimensionsInferred:true});
  const tube=(points,r,material,part)=>{const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v))),28,r,12,false);resources.push(geometry);const mesh=new THREE.Mesh(geometry,material);mesh.userData=component(part);mesh.castShadow=true;p.add(mesh);picks.push(mesh);return mesh;};
  if(c.id==='entry-pipes'){
   for(const [x,r,m,part] of [[-.14,.105,blue,'observed-blue-riser'],[.15,.052,grey,'observed-grey-riser']]){
    cylinder(x,c.bottom+c.h/2,.34,r,c.h-.04,m,p,component(part));
    for(const y of [.22,.7,1.62])cylinder(x,y,.34,r+.014,.045,m,p,component('observed-pipe-coupling'));
    const y=x<0?.52:.27,fitting=cylinder(x,y,.2,r*.9,.25,m,p,component('observed-capped-inspection-fitting'));fitting.rotation.x=Math.PI/2;
    const cap=cylinder(x,y,.066,r*.94,.025,m,p,component('observed-inspection-cap'));cap.rotation.x=Math.PI/2;
    for(let b=0;b<4;b++){const a=b*Math.PI/2;const bolt=cylinder(x+Math.cos(a)*r*.68,y+Math.sin(a)*r*.68,.049,.008,.012,steel,p,component('observed-cap-bolt'));bolt.rotation.x=Math.PI/2;}
    box(x,1.56,.34,r*2+.02,.026,r*2+.02,steel,p,component('observed-pipe-clamp'));
   }
   box(0,1.56,.48,c.w-.08,.032,.035,steel,p,component('observed-clamp-support'));
  }else if(c.id==='entry-hot-water'){
   cylinder(-.13,1.63,.31,.242,1.27,white,p,component('observed-hot-water-tank'));
   for(const y of [1.0,2.26])cylinder(-.13,y,.31,.24,.025,white,p,component('tank-end-illustration'));
   // The red 4 is visible in the source; never invent a manufacturer nameplate.
   const red=mat('#bb4a44');box(-.12,1.87,.062,.012,.09,.004,red,p,component('observed-tank-mark-4'));box(-.15,1.85,.062,.075,.012,.004,red,p,component('observed-tank-mark-4'));box(-.18,1.89,.062,.012,.07,.004,red,p,component('observed-tank-mark-4'));
   tube([[.25,2.39,.25],[.25,1.9,.24],[.22,1.3,.2],[.08,.65,.18],[-.25,.29,.22]],.043,black,'observed-black-insulated-pipe');
   tube([[-.22,1.0,.29],[-.28,.86,.26],[-.29,.46,.3],[-.29,.16,.4]],.013,white,'observed-lower-light-pipe');
   tube([[-.02,1.0,.28],[.01,.8,.22],[.06,.49,.3],[.19,.23,.39]],.018,black,'observed-lower-dark-pipe');
   cylinder(.15,.26,.38,.023,.065,brass,p,component('observed-lower-metal-connection'));
  }else if(c.meters){
   buildEntryWaterMeters({cabinet:c,parent:p,box,cylinder,mat,tube,component});
  }
 }
 return groups;
}
