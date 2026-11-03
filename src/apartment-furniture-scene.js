import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
import {createSoftGeometry} from './soft-furnishings.mjs';
export function groundProposedBeds(){return GROUND_APARTMENT_FURNITURE.filter(r=>r.kind==='bed');}
export function neighbourFurniture(level){return level===0?GROUND_APARTMENT_FURNITURE:APARTMENT_FURNITURE.filter(r=>r.floor===level);}
export function apartmentFurnitureBoxes(level){return neighbourFurniture(level).map(r=>({...r.box,apartmentFurniture:r.id,unit:r.unit}));}
export function buildApartmentFurniture({parent,resources,level,base,settings,surfaces=null}){
 if(settings.furniture===false)return;
 const items=neighbourFurniture(level);if(!items.length)return;
 const cube=new THREE.BoxGeometry(1,1,1),soft=new RoundedBoxGeometry(1,1,1,2,.07),cushion=createSoftGeometry(),duvet=createSoftGeometry(1,1,1,{kind:'duvet',radius:.12});resources.push(cube,soft,cushion,duvet);
 const surface=surfaces||createSurfacePalette(resources),mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75,...extra});resources.push(m);return m;},fabric=color=>surface('fabric',color),palette={wood:surface('wood','#a28d76'),mattress:fabric('#f1eee5'),linen:fabric('#a9b8b3'),pillow:fabric('#faf8ef'),sofa:fabric('#b9b4a7'),rug:fabric('#d1c9b7'),cabinet:surface('paint','#e5dfd2'),stone:surface('stone','#c7c2b4'),dark:mat('#303a3c',{roughness:.32}),screen:mat('#172126',{roughness:.18,metalness:.12}),steel:mat('#9ea8a5',{metalness:.75,roughness:.28})},batches=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 for(const m of Object.values(palette))installBuildingSurfaceUVs(m);
 function box(r,part,m,x,y,z,w,h,d){const c=Math.cos(r.angle),s=Math.sin(r.angle),key=part;let b=batches.get(key);if(!b)batches.set(key,b={part,m,items:[]});b.items.push([r.x+x*c+z*s,base+y,r.z-x*s+z*c,w,h,d,r.angle,r.id,r.unit]);}
 for(const r of items){
  if(r.kind==='bed'){
   box(r,'apartment-bed-frame',palette.wood,0,.22,0,r.w,.30,r.d);
   box(r,'apartment-mattress',palette.mattress,0,.44,0,r.w-.04,.22,r.d-.05);
   box(r,'apartment-duvet',palette.linen,0,.565,.25,r.w-.07,.075,r.d-.64);
   box(r,'apartment-headboard',palette.wood,0,.54,-r.d/2+.025,r.w,.86,.05);
   const count=r.w>1.25?2:1;for(let i=0;i<count;i++)box(r,'apartment-pillow',palette.pillow,(i-(count-1)/2)*r.w*.45,.585,-r.d/2+.28,r.w/count-.12,.10,.38);
  }else if(r.kind==='sofa'){
   box(r,'apartment-sofa-base',palette.sofa,0,.27,0,r.w,.25,r.d-.035);
   for(const x of [-r.w/2+.11,r.w/2-.11])for(const z of [-r.d/2+.12,r.d/2-.12])box(r,'apartment-sofa-leg',palette.wood,x,.085,z,.055,.17,.055);
   for(const x of [-r.w/2+.07,r.w/2-.07])box(r,'apartment-sofa-arm',palette.sofa,x,.49,0,.14,.48,r.d-.04);
   box(r,'apartment-sofa-back',palette.sofa,0,.69,-r.d/2+.085,r.w-.12,.60,.17);
   const n=r.w>2.1?3:2,span=r.w-.32;for(let i=0;i<n;i++){const x=-span/2+(i+.5)*span/n;box(r,'apartment-sofa-seat',palette.sofa,x,.47,.07,span/n-.025,.17,.65);box(r,'apartment-sofa-cushion',palette.sofa,x,.74,-.25,span/n-.03,.43,.18);}
   for(const x of [-r.w*.32,r.w*.32])box(r,'apartment-sofa-pillow',palette.linen,x,.69,-.075,.32,.32,.16);
  }else if(r.kind==='coffee'){
   box(r,'apartment-coffee-top',palette.wood,0,.405,0,r.w,.055,r.d);
   for(const x of [-r.w*.37,r.w*.37])for(const z of [-r.d*.32,r.d*.32])box(r,'apartment-coffee-leg',palette.dark,x,.20,z,.035,.39,.035);
   if(r.rug)box(r,'apartment-living-rug',palette.rug,0,.013,0,r.rug.w,.009,r.rug.d);
  }else if(r.kind==='media'){
   box(r,'apartment-media-cabinet',palette.wood,0,.31,0,r.w,.38,r.d);
   for(const x of [-r.w*.4,r.w*.4])box(r,'apartment-media-leg',palette.dark,x,.065,0,.035,.13,.035);
   for(const x of [-r.w/4,r.w/4])box(r,'apartment-media-front',palette.cabinet,x,.31,r.d/2+.006,r.w/2-.012,.32,.012);
   box(r,'apartment-tv-stand',palette.dark,0,.525,0,.42,.035,.20);box(r,'apartment-tv-stem',palette.dark,0,.62,-.015,.065,.18,.06);
   const width=Math.min(1.28,r.w-.08);box(r,'apartment-tv-frame',palette.dark,0,1.02,-.015,width,.74,.055);box(r,'apartment-tv-screen',palette.screen,0,1.025,.016,width-.04,.695,.008);
  }else if(r.kind==='kitchen'){
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
 for(const b of batches.values()){const rounded=/mattress|sofa-(?:base|arm|back)|coffee-top/.test(b.part),geometry=/duvet/.test(b.part)?duvet:/pillow|sofa-(?:seat|cushion)/.test(b.part)?cushion:rounded?soft:cube,mesh=new THREE.InstancedMesh(geometry,b.m,b.items.length);b.items.forEach(([x,y,z,w,h,d,angle],i)=>{q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);});mesh.name=b.part;mesh.userData={part:b.part,buildingFloor:level,proposed:true,dimensionsInferred:true,placements:b.items.map(r=>({id:r[7],unit:r[8]}))};mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);}
}
