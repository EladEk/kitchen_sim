import * as THREE from 'three';
import {GARDEN_LAYOUT} from './home-model.mjs';

export function buildGardenArchitecture({group,box,mat,settings,mode}){
 const groups=new Map(),L=GARDEN_LAYOUT,b=L.bounds,full=mode==='walk'||!settings.cutaway;
 const node=id=>{const p=new THREE.Group(),e=L.elements.find(e=>e.id===id);p.userData={buildingId:id,source:e.source,page:e.page,dimensionsInferred:true,planned:e.planned};group.add(p);groups.set(id,p);return p;};
 const data=id=>({action:'building',buildingId:id});
 const cream=mat('#e6dfcc',{roughness:.53,metalness:.22}),stone=mat('#c6c0af'),grey=mat(L.fence.color,{roughness:.57,metalness:.25});
 // Retain the same boundary segments. The quoted 37 m is not used to resize the plot.
 for(const run of L.fence.runs){
  const p=node(run.id),vertical=run.a[0]===run.b[0],cx=(run.a[0]+run.b[0])/2,cz=(run.a[1]+run.b[1])/2;
  const beam=(y,h,thickness,material,part)=>{const m=box(cx,y,cz,vertical?thickness:run.length,h,vertical?run.length:thickness,material,p,data(run.id));m.userData.part=part;return m;};
  if(run.style==='shared-wall'){
   beam((L.fence.height-.035)/2,L.fence.height-.035,.12,mat('#c9bd9e'),'existing-neighbour-wall');
   beam(L.fence.height-.0175,.035,.16,mat('#e0d9c8'),'neighbour-stone-coping');
   continue;
  }
  beam(L.fence.curb/2,L.fence.curb,.08,stone,'fence-stone-base');
  for(let i=0;i<10;i++)beam(L.fence.curb+.005+L.fence.slat/2+i*(L.fence.slat+L.fence.gap),L.fence.slat,.025,grey,'horizontal-fence-slat');
  const count=Math.ceil(run.length/L.fence.maxSpacing);
  for(let i=0;i<=count;i++){const t=i/count,x=run.a[0]+(run.b[0]-run.a[0])*t,z=run.a[1]+(run.b[1]-run.a[1])*t;box(x,L.fence.curb+L.fence.panel/2,z,L.fence.post,L.fence.panel,L.fence.post,grey,p,{...data(run.id),part:'fence-post'});}
 }
 const pergola=node('garden-pergola'),tag=data('garden-pergola'),middleX=(b.minX+b.maxX)/2,middleZ=(b.minZ+b.maxZ)/2;
 for(const post of L.posts){
  box(post.x,post.height/2,post.z,post.size,post.height,post.size,cream,pergola,{...tag,part:'pergola-post',postId:post.id});
  box(post.x,.012,post.z,.14,.024,.14,grey,pergola,{...tag,part:'pergola-base-plate'});
 }
 // 150×50 perimeter; front carrier is 120×50. Support layout is illustrative.
 for(const x of [b.minX+.025,b.maxX-.025])box(x,2.925,middleZ,.05,.15,L.width,cream,pergola,{...tag,part:'pergola-perimeter'});
 for(const z of [b.minZ+.025,b.maxZ-.025])box(middleX,2.925,z,L.depth,.15,.05,cream,pergola,{...tag,part:'pergola-perimeter'});
 box(b.minX+.12,2.79,middleZ,.05,.12,L.width-.16,cream,pergola,{...tag,part:'pergola-carrier'});
 for(const t of [.25,.5,.75])box(middleX,2.88,b.minZ+L.width*t,L.depth-.1,.08,.08,cream,pergola,{...tag,part:'pergola-divider'});
 if(settings.pergolaRoof!==false){
  const roofMat=mat('#e9e3d3',{roughness:.5,metalness:.18,...(!full?{transparent:true,opacity:.24,depthWrite:false}:{})});
  const count=Math.floor((L.depth-.1)/.15),pitch=(L.depth-.1)/count;
  for(let i=0;i<count;i++)box(b.minX+.05+pitch*(i+.5),2.985,middleZ,.11,.03,L.width-.1,roofMat,pergola,{...tag,part:'pergola-shade-profile'});
 }
 // Existing balcony edge is plan-derived. Hide its roof with the same roof control.
 const balcony=node('upper-balcony'),u=L.upper,upperTag=data('upper-balcony');
 if(settings.pergolaRoof!==false){
  if(full){
   const ux=(u.minX+u.maxX)/2,uz=(u.minZ+u.maxZ)/2,w=u.maxX-u.minX,d=u.maxZ-u.minZ;
   box(ux,2.85,uz,w,.2,d,mat('#e5e1d7'),balcony,{...upperTag,part:'upper-balcony-slab'});
   box(u.minX+.025,2.84,uz,.05,.22,d,mat('#92948d'),balcony,{...upperTag,part:'upper-balcony-fascia'});
   const glass=mat('#bad0d0',{transparent:true,opacity:.19,roughness:.17,depthWrite:false}),rail=mat('#858d88',{metalness:.5});
   box(u.minX+.045,3.43,uz,.014,.94,d-.06,glass,balcony,upperTag);
   for(const z of [u.minZ+.025,u.maxZ-.025])box(ux,3.43,z,w-.06,.94,.014,glass,balcony,upperTag);
   box(u.minX+.045,3.91,uz,.04,.025,d,rail,balcony,upperTag);
   for(const z of [u.minZ,u.maxZ])box(ux,3.91,z,w,.025,.04,rail,balcony,upperTag);
  }else box(u.minX,2.85,(u.minZ+u.maxZ)/2,.035,.045,u.maxZ-u.minZ,mat('#959c91',{transparent:true,opacity:.45}),balcony,{...upperTag,part:'upper-balcony-edge'});
 }
 return groups;
}
