import * as THREE from 'three';
import {HVAC_PROFILE as H} from './hvac-profile.mjs';
import {CEILING_COLOR,CEILING_MATERIAL} from './ceiling-finish.mjs';

// Shared by both simulators. The supplied box helper accepts metre dimensions.
export function createKitchenHvac({box,mat,data={}}){
 const group=new THREE.Group(),white=mat(CEILING_COLOR,CEILING_MATERIAL),metal=mat('#bec3bf',{roughness:.48,metalness:.25}),dark=mat('#343b3b');
 group.userData={part:'kitchen-hvac',dimensionsInferred:true,source:'site-photos',page:H.photoPage};
 for(const s of H.sections){const mesh=box((s.start+s.end)/2,(H.bottom+H.top)/2,(H.back+s.front)/2,s.end-s.start,H.top-H.bottom,s.front-H.back,white,group,{...data,part:'hvac-bulkhead',hvacSection:s.id});mesh.userData.hvacSection=s.id;}
 for(const g of H.grilles){
  const section=H.sections.find(s=>s.id===g.section),p=new THREE.Group();p.position.set(g.x,g.y,section.front+.008);p.userData={...data,part:'hvac-grille',hvacGrille:g.id};group.add(p);
  box(0,0,0,g.width,g.height,.016,white,p,{...data,part:'hvac-grille-frame'});
  box(0,0,.01,g.width-.035,g.height-.032,.008,dark,p,{...data,part:'hvac-grille-opening'});
  const innerH=g.height-.04,count=Math.max(8,Math.round(innerH/.009));
  for(let i=0;i<count;i++)box(0,-innerH/2+(i+.5)*innerH/count,.017,g.width-.045,.0035,.006,metal,p,{...data,part:'hvac-horizontal-louvre'});
  // Small vertical stays are visible through the narrow horizontal blades.
  for(const x of [-g.width*.27,0,g.width*.27])box(x,0,.013,.003,innerH,.004,metal,p,{...data,part:'hvac-grille-stay'});
 }
 const c=H.controller,p=new THREE.Group();p.position.set(c.x,c.y,H.sections[0].front+.012);p.userData={...data,part:'hvac-controller'};group.add(p);
 box(0,0,0,c.width,c.height,.021,white,p,{...data,part:'hvac-controller-body'});
 box(0,.022,.012,c.width*.71,c.height*.43,.003,mat('#6b7a70',{roughness:.5}),p,{...data,part:'hvac-controller-display'});
 for(let i=0;i<4;i++)box((i-1.5)*.025,-.033,.014,.017,.011,.004,metal,p,{...data,part:'hvac-controller-key'});
 return group;
}
