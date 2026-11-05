import {GROUND_KITCHEN} from './ground-apartments.mjs';
// Generic plan-registered kitchen, without owner choices, brands or drafts.
export function buildBaseKitchenDetail({parent,box,polygon,cylinder,surface,mat,point}){
 const fronts=surface('paint','#e7e2d7',{interior:true}),carcass=surface('paint','#ded9ce',{interior:true}),top=surface('stone','#d4cbb9',{interior:true}),dark=mat('#343938',{roughness:.66}),metal=mat('#bbc0bf',{metalness:.35,roughness:.38});metal.userData.architecturalInterior=true;
 const counter=GROUND_KITCHEN.counterPdf.map(p=>point(...p)),mainA=counter[0],corner=counter[1],returnA=counter[2],end=counter[4];
 polygon(counter,.87,carcass,parent,.75);polygon(counter,.91,top,parent,.035);
 const mainWidth=corner[0]-mainA[0],returnLength=mainA[1]-returnA[1],mainDepth=end[1]-mainA[1],returnDepth=counter[3][0]-returnA[0];
 box((mainA[0]+end[0])/2,.065,mainA[1]+mainDepth/2+.025,end[0]-mainA[0]-.05,.11,mainDepth-.07,dark,parent);
 box(returnA[0]+returnDepth/2+.025,.065,(mainA[1]+returnA[1])/2,returnDepth-.07,.11,returnLength-.03,dark,parent);
 const n=Math.max(1,Math.round(mainWidth/.58));
 for(let i=0;i<n;i++){
  const w=mainWidth/n,x=mainA[0]+(i+.5)*w;
  for(const [y,h]of [[.745,.20],[.395,.49]])box(x,y,mainA[1]-.013,w-.006,h,.024,fronts,parent,{part:'base-kitchen-panel'});
  for(const y of [.79,.59])box(x,y,mainA[1]-.03,.16,.012,.018,dark,parent,{part:'base-kitchen-handle'});
 }
 const count=Math.max(1,Math.round(returnLength/.6));for(let i=0;i<count;i++){const d=returnLength/count,z=returnA[1]+(i+.5)*d;box(returnA[0]-.013,.49,z,.024,.72,d-.006,fronts,parent,{part:'base-kitchen-panel'});box(returnA[0]-.03,.76,z,.018,.012,.16,dark,parent,{part:'base-kitchen-handle'});}
 // Upper fronts sit beneath the observed bulkhead, leaving the short-wall window open.
 const upperWidth=Math.max(.6,mainWidth-.15),columns=Math.max(1,Math.round(upperWidth/.6));
 for(let i=0;i<columns;i++){const w=upperWidth/columns,x=mainA[0]+(i+.5)*w;box(x,1.94,end[1]-.165,w-.006,.63,.31,fronts,parent,{part:'base-kitchen-upper'});}
 box(mainA[0]+upperWidth/2,1.615,end[1]-.17,upperWidth,.012,.3,dark,parent,{part:'base-kitchen-under-cabinet-recess'});
 const hob=point(1103.16,340.60),sink=point(1185.30,341.20);box(hob[0],.932,hob[1],.54,.015,.49,dark,parent);for(const x of [-.14,.14])for(const z of [-.12,.12])cylinder(hob[0]+x,.942,hob[1]+z,.075,.003,metal,parent);
 box(sink[0],.934,sink[1],.40,.012,.35,dark,parent);for(const dx of [-.21,.21])box(sink[0]+dx,.94,sink[1],.016,.014,.37,metal,parent);for(const dz of [-.18,.18])box(sink[0],.94,sink[1]+dz,.43,.014,.016,metal,parent);cylinder(sink[0],1.07,sink[1]+.2,.012,.27,metal,parent);box(sink[0],1.2,sink[1]+.145,.025,.025,.12,metal,parent);
 const fridge=GROUND_KITCHEN.fridgePdf.map(p=>point(...p)),xs=fridge.map(p=>p[0]),zs=fridge.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),depth=maxZ-minZ;
 box((minX+maxX)/2,.96,(minZ+maxZ)/2,maxX-minX,1.9,depth,metal,parent,{part:'base-kitchen-fridge'});
 for(const sign of [-1,1]){const z=(minZ+maxZ)/2+sign*depth/4;box(minX-.013,1.24,z,.024,1.29,depth/2-.006,metal,parent,{part:'base-kitchen-fridge-door'});box(minX-.031,1.23,(minZ+maxZ)/2+sign*.035,.02,.42,.019,dark,parent);}
 box(minX-.013,.30,(minZ+maxZ)/2,.024,.55,depth-.006,metal,parent,{part:'base-kitchen-freezer-drawer'});box(minX-.03,.48,(minZ+maxZ)/2,.02,.018,.32,dark,parent);
}
