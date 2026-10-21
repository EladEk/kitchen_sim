import * as THREE from 'three';
import {yardForSettings} from './home-model.mjs';

export function buildServiceYard({group,box,cylinder,floor,lines,mat,surface=(kind,color,options)=>mat(color,options),resources,motions,settings,mode}){
 const service=yardForSettings(settings).service,{manhole:m,shed:s}=service,groups=new Map(),full=mode==='walk'||!settings.cutaway,open=new Set(settings.openParts);
 const node=id=>{const p=new THREE.Group();p.userData={buildingId:id,source:'service-yard',dimensionsInferred:true};group.add(p);groups.set(id,p);return p;};
 const chamber=node(m.id),tag={action:'building',buildingId:m.id},steel=mat('#77817c',{metalness:.5,roughness:.6}),cover=mat('#7c8581',{roughness:.8});
 const [mx,mz]=m.position;
 cylinder(mx,.004,mz,m.diameter/2,.016,steel,chamber,{...tag,part:'inspection-cover'});
 cylinder(mx,.014,mz,m.diameter/2-.025,.008,cover,chamber,tag);
 for(const dx of [-.25,-.12,0,.12,.25]){const half=Math.sqrt((m.diameter/2-.055)**2-dx**2);box(mx+dx,.019,mz,.008,.004,half*2,steel,chamber,tag);}
 for(const dx of [-.2,.2])box(mx+dx,.021,mz,.075,.008,.024,mat('#424c48'),chamber,tag);
 const access=floor(m.access,mat('#ca9d4c',{transparent:true,opacity:.12,depthWrite:false}),.001,chamber);access.userData.part='manhole-access-reserve';
 const edge=[];for(let j=0;j<4;j++){const a=m.access[j],b=m.access[(j+1)%4],length=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let d=0;d<length;d+=.17){const end=Math.min(d+.09,length);edge.push([a[0]+(b[0]-a[0])*d/length,.025,a[1]+(b[1]-a[1])*d/length],[a[0]+(b[0]-a[0])*end/length,.025,a[1]+(b[1]-a[1])*end/length]);}}lines(edge,'#b18a42',.8,chamber);
 const windowReserve=node(service.safeWindow.id),wp=service.safeWindow.polygon;
 floor(wp,mat('#8eafb5',{transparent:true,opacity:.16,depthWrite:false}),.002,windowReserve,{action:'building',buildingId:service.safeWindow.id});
 lines(wp.flatMap((a,i)=>{const b=wp[(i+1)%wp.length];return [[a[0],.018,a[1]],[b[0],.018,b[1]]];}),'#789da4',.6,windowReserve);
 const shed=node(s.id),shedTag={action:'building',buildingId:s.id},wall=surface('paint','#d9dcce'),trim=mat('#68776d',{metalness:.15}),inside=mat('#eceae0');
 const cx=(s.minX+s.maxX)/2,cz=(s.minZ+s.maxZ)/2,h=full?s.h-.06:.8;
 floor(s.polygon,surface('cement','#c8c7bc'),.01,shed,shedTag);
 for(const x of [s.minX+s.wall/2,s.maxX-s.wall/2])box(x,h/2,cz,s.wall,h,s.d,wall,shed,{...shedTag,part:'shed-wall'});
 box(cx,h/2,s.maxZ-s.wall/2,s.w,h,s.wall,wall,shed,{...shedTag,part:'shed-wall'});
 const door=s.door,left=door.x-door.width/2,right=door.x+door.width/2;
 for(const [a,b] of [[s.minX,left],[right,s.maxX]])box((a+b)/2,h/2,s.minZ+s.wall/2,b-a,h,s.wall,wall,shed,{...shedTag,part:'shed-wall'});
 if(h>door.height)box(door.x,(h+door.height)/2,s.minZ+s.wall/2,door.width,h-door.height,s.wall,wall,shed,shedTag);
 for(const x of [left,right])box(x,Math.min(h,door.height)/2,s.minZ,.04,Math.min(h,door.height),.075,trim,shed,shedTag);
 const sign=door.hinge==='end'?-1:1,pivot=new THREE.Group();pivot.position.set(sign===1?left:right,0,s.minZ+.006);pivot.rotation.y=open.has(door.id)?door.swing*Math.PI*.49:0;shed.add(pivot);motions.push({id:door.id,object:pivot,property:'y',axis:'rotation',target:pivot.rotation.y});
 const doorTag={action:'part',partId:door.id};
 box(sign*door.width/2,Math.min(h,door.height)/2,0,door.width-.025,Math.min(h,door.height)-.015,.04,trim,pivot,{...doorTag,part:'shed-door'});
 box(sign*(door.width-.08),Math.min(1.02,h*.65),-.035,.07,.02,.035,steel,pivot,doorTag);
 // Roof is inspectable independently; cutaway always opens the view from above.
 if(full&&settings.shedRoof!==false)box(cx,s.h-.03,cz,s.w,.06,s.d,trim,shed,{...shedTag,part:'shed-roof'});
 if(full){
  for(const x of [s.minX+s.wall+.01,s.maxX-s.wall-.01]){
   box(x,1.93,s.minZ+.55,.012,.22,.4,trim,shed,shedTag);
   for(let i=0;i<5;i++)box(x+(x<cx?.008:-.008),1.85+i*.04,s.minZ+.55,.012,.015,.37,inside,shed,shedTag);
  }
 }
 const shelves=s.shelves;
 for(const y of [.45,.95,1.45,1.9])box((shelves.minX+shelves.maxX)/2,y,(shelves.minZ+shelves.maxZ)/2,shelves.maxX-shelves.minX,.025,shelves.maxZ-shelves.minZ,inside,shed,{...shedTag,part:'shed-shelf'});
 for(const x of [shelves.minX+.025,shelves.maxX-.025])for(const z of [shelves.minZ+.025,shelves.maxZ-.025])box(x,.96,z,.025,1.92,.025,trim,shed,shedTag);
 for(const [i,a] of s.appliances.entries()){
  const p=node(a.id);p.position.set(a.x,0,a.z);p.rotation.y=Math.PI;const data={action:'building',buildingId:a.id},white=mat(i?'#c3c9c4':'#eeeee7');
  for(const x of [-a.w/2+.015,a.w/2-.015])box(x,a.h/2,0,.03,a.h,a.d,white,p,data);
  box(0,a.h/2,-a.d/2+.015,a.w,a.h,.03,white,p,data);
  for(const y of [.025,a.h-.025])box(0,y,0,a.w,.05,a.d,white,p,data);
  for(const y of [.28,.62,.98,1.34,1.66]){box(0,y,0,a.w-.065,.015,a.d-.08,inside,p,data);if(i)box(0,y+.08,.08,a.w-.08,.12,a.d-.26,mat('#b7c7c5',{transparent:true,opacity:.5}),p,data);}
  const partId=`${a.id}:door`,leaf=new THREE.Group();leaf.position.set(-a.w/2,0,a.d/2);leaf.rotation.y=open.has(partId)?-Math.PI*.49:0;p.add(leaf);motions.push({id:partId,object:leaf,property:'y',axis:'rotation',target:leaf.rotation.y});
  const part={action:'part',partId};box(a.w/2,a.h/2,0,a.w-.01,a.h-.02,.035,white,leaf,part,.01);box(a.w-.07,1.05,.037,.022,.34,.025,steel,leaf,part);
  box(0,.07,a.d/2+.019,a.w-.06,.08,.015,trim,p,data);
 }
 return groups;
}
