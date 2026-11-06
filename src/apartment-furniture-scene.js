import {createFurnitureAnchor} from './complete-furniture.mjs';
import * as THREE from 'three';
import {createArchitecturalGlass} from './architectural-glass.mjs';
import {createCeramicBowl} from './sanitary-fixtures.js';
import {createContactShadows} from './contact-shadows.mjs';
import {APARTMENT_BATHROOMS} from './apartment-bathroom-layout.mjs';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {APARTMENT_FURNITURE,GROUND_APARTMENT_FURNITURE} from './apartment-furniture-layout.mjs';
import {createSurfacePalette} from './surface-materials.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';
import {createSoftGeometry} from './soft-furnishings.mjs';
export function groundProposedBeds(){return GROUND_APARTMENT_FURNITURE.filter(r=>r.kind==='bed');}
export function neighbourFurniture(level){return level===0?GROUND_APARTMENT_FURNITURE:[...APARTMENT_FURNITURE,...APARTMENT_BATHROOMS].filter(r=>r.floor===level);}
export function apartmentFurnitureBoxes(level){return neighbourFurniture(level).map(r=>({...r.box,apartmentFurniture:r.id,unit:r.unit}));}
export function buildApartmentFurniture({parent,resources,level,base,settings,surfaces=null}){
 if(settings.furniture===false)return;
 const items=neighbourFurniture(level);if(!items.length)return;
 const cube=new THREE.BoxGeometry(1,1,1),soft=new RoundedBoxGeometry(1,1,1,2,.07),cushion=createSoftGeometry(),duvet=createSoftGeometry(1,1,1,{kind:'duvet',radius:.12});resources.push(cube,soft,cushion,duvet);
 const surface=surfaces||createSurfacePalette(resources),mat=(color,extra={})=>{const m=new THREE.MeshStandardMaterial({color,roughness:.75,...extra});resources.push(m);return m;},fabric=color=>surface('fabric',color),palette={wood:surface('wood','#a28d76'),mattress:fabric('#f1eee5'),linen:fabric('#a9b8b3'),pillow:fabric('#faf8ef'),sofa:fabric('#b9b4a7'),rug:fabric('#d1c9b7'),cabinet:surface('paint','#e7e2d7',{interior:true}),stone:surface('stone','#d4cbb9',{interior:true}),dark:mat('#303a3c',{roughness:.32}),screen:mat('#172126',{roughness:.18,metalness:.12}),steel:mat('#9ea8a5',{metalness:.75,roughness:.28}),ceramic:new THREE.MeshPhysicalMaterial({color:'#f5f4ef',roughness:.09,clearcoat:1,clearcoatRoughness:.08}),mirror:mat('#dedfdd',{metalness:1,roughness:.06}),glow:mat('#efece2',{emissive:'#fff2d9',emissiveIntensity:settings.lampsOn?.4:0}),glass:createArchitecturalGlass(resources)},batches=new Map(),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 resources.push(palette.ceramic);palette.ceramic.userData={surfaceKind:'ceramic',architecturalInterior:true};for(const m of Object.values(palette))installBuildingSurfaceUVs(m);
 function box(r,part,m,x,y,z,w,h,d){const c=Math.cos(r.angle),s=Math.sin(r.angle),key=part;let b=batches.get(key);if(!b)batches.set(key,b={part,m,items:[]});b.items.push([r.x+x*c+z*s,base+y,r.z-x*s+z*c,w,h,d,r.angle,r.id,r.unit]);}
 const bowl=createCeramicBowl(resources,{productId:null,w:1,d:1,top:0,depth:1,innerW:.8,innerD:.7,innerZ:.035,radius:.06,innerRadius:.1,lowerScale:.86,drainZ:.035});
 for(const r of items){
  if(['bed','sofa','coffee','media'].includes(r.kind)){const kind=r.kind==='bed'?(r.w>1.25?'bed-double':'bed-single'):r.kind,h={bed:.98,sofa:.95,coffee:.435,media:1.40}[r.kind],part={bed:'apartment-bed-frame',sofa:'apartment-sofa-base',coffee:'apartment-coffee-top',media:'apartment-media-cabinet'}[r.kind];box(r,part,palette.wood,0,0,0,r.w,h,r.d);const batch=batches.get(part);batch.geometry=createFurnitureAnchor(kind).geometry;batch.asset=kind;if(r.rug)box(r,'apartment-living-rug',palette.rug,0,.013,0,r.rug.w,.009,r.rug.d);continue;}
  if(r.kind==='wc'){
   box(r,'apartment-wc-body',palette.ceramic,0,.30,0,r.w,.30,r.d-.04);
   box(r,'apartment-wc-seat',palette.ceramic,0,.465,.015,r.w+.005,.038,r.d-.025);
   box(r,'apartment-wc-flush',palette.steel,0,1,-r.d/2-.018,.19,.13,.012);
  }else if(r.kind==='basin'){
   box(r,'apartment-basin-cabinet',palette.cabinet,0,.59,0,r.w,.38,r.d);
   for(const child of bowl.children){const part='apartment-basin-'+child.userData.part;box(r,part,/drain|waste/.test(part)?palette.steel:palette.ceramic,0,.835,0,r.w,.14,r.d);batches.get(part).geometry=child.geometry;}
   box(r,'apartment-basin-tap',palette.steel,0,.835,-r.d*.25,.07,.22,.16);batches.get('apartment-basin-tap').geometry=createFurnitureAnchor('faucet').geometry;batches.get('apartment-basin-tap').asset='faucet';
   box(r,'apartment-bath-mirror',palette.mirror,0,1.38,-r.d/2-.025,r.w,.62,.016);
   for(const x of [-r.w/2,r.w/2])box(r,'apartment-mirror-edge',palette.glow,x,1.38,-r.d/2-.014,.012,.62,.008);
  }else if(r.kind==='shower'){
   box(r,'apartment-shower-tray',palette.ceramic,0,.045,0,r.w,.04,r.d);
   box(r,'apartment-shower-glass',palette.glass,-r.w/2+.01,1.05,0,.008,2,r.d);
   box(r,'apartment-shower-riser',palette.steel,0,1.45,-r.d/2+.035,.025,1,.025);
   box(r,'apartment-shower-head',palette.steel,0,2,-r.d/2+.17,.18,.025,.22);
  }else if(r.kind==='bathtub'){
   box(r,'apartment-bathtub-bottom',palette.ceramic,0,.18,0,r.w-.10,.10,r.d-.10);
   for(const x of [-r.w/2+.04,r.w/2-.04])box(r,'apartment-bathtub-end',palette.ceramic,x,.34,0,.08,.43,r.d);
   for(const z of [-r.d/2+.04,r.d/2-.04])box(r,'apartment-bathtub-side',palette.ceramic,0,.34,z,r.w-.12,.43,.08);
   box(r,'apartment-bathtub-drain',palette.steel,r.w*.32,.235,0,.055,.008,.055);
   box(r,'apartment-bathtub-tap',palette.steel,r.w*.32,.68,-r.d/2+.025,.11,.16,.16);
  }else if(r.kind==='fridge'){
   box(r,'apartment-fridge-body',palette.cabinet,0,.98,0,r.w,1.94,r.d);
   box(r,'apartment-fridge-freezer',palette.steel,0,.42,r.d/2+.012,r.w-.025,.78,.025);
   box(r,'apartment-fridge-door',palette.steel,0,1.37,r.d/2+.012,r.w-.025,1.07,.025);
   for(const y of [.70,1.08])box(r,'apartment-fridge-handle',palette.dark,r.w*.30,y,r.d/2+.04,.025,.30,.03);
  }else if(r.kind==='washer'||r.kind==='dryer'){
   box(r,'apartment-laundry-body',palette.cabinet,0,.43,0,r.w,.84,r.d);
   box(r,'apartment-laundry-controls',palette.dark,0,.74,r.d/2+.006,r.w*.80,.09,.014);
   box(r,'apartment-laundry-drum',palette.dark,0,.41,r.d/2+.012,r.w*.66,r.w*.66,.022);
   const drum=batches.get('apartment-laundry-drum');if(!drum.geometry){drum.geometry=new THREE.CylinderGeometry(.5,.5,1,24);drum.geometry.rotateX(Math.PI/2);resources.push(drum.geometry);}
  }else if(r.kind==='kitchen'||r.kind==='kitchen-return'){
   box(r,'apartment-kitchen-base',palette.cabinet,0,.45,0,r.w,.82,r.d);
   box(r,'apartment-kitchen-plinth',palette.dark,0,.065,0,r.w-.04,.11,r.d-.06);
   box(r,'apartment-kitchen-worktop',palette.stone,0,.885,0,r.w+(r.flushWorktop?0:.015),.05,r.d+(r.flushWorktop?0:.02));
   const n=Math.round(r.w/.6);for(let i=0;i<n;i++){const x=-r.w/2+(i+.5)*r.w/n;box(r,'apartment-kitchen-front',palette.cabinet,x,.48,r.d/2+.006,r.w/n-.006,.71,.022);box(r,'apartment-kitchen-handle',palette.dark,x,.74,r.d/2+.023,.18,.014,.022);}
   if(r.kind==='kitchen'){
    const sink=r.sinkOffset??-r.w*.27,hob=r.hobOffset??r.w*.25;
    box(r,'apartment-kitchen-sink',palette.dark,sink,.914,0,.47,.008,.40);
    for(const x of [sink-.24,sink+.24])box(r,'apartment-kitchen-sink-rim',palette.steel,x,.924,0,.018,.015,.42);
    for(const z of [-.205,.205])box(r,'apartment-kitchen-sink-rim',palette.steel,sink,.924,z,.49,.015,.018);
    box(r,'apartment-kitchen-tap',palette.steel,sink,.918,-.12,.08,.30,.22);batches.get('apartment-kitchen-tap').geometry=createFurnitureAnchor('faucet').geometry;batches.get('apartment-kitchen-tap').asset='faucet';
    box(r,'apartment-kitchen-hob',palette.dark,hob,.92,0,.57,.014,.46);
    for(const x of [hob-.15,hob+.15])box(r,'apartment-kitchen-hob-zone',palette.steel,x,.929,0,.17,.002,.22);
   }
  }
 }
 const shadows=createContactShadows(resources),contacts=items.filter(r=>!['shower','basin','wc'].includes(r.kind)),contact=new THREE.InstancedMesh(shadows.geometry,shadows.material,contacts.length);for(const [i,r]of contacts.entries()){q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,r.angle);matrix.compose(new THREE.Vector3(r.x,base+.015,r.z),q,new THREE.Vector3(r.w*1.18,1,r.d*1.18));contact.setMatrixAt(i,matrix);}contact.userData={part:'furniture-contact-shadow',visualOnly:true,tourNonPhysical:true,placements:contacts.map(r=>({id:r.id,unit:r.unit}))};contact.computeBoundingSphere();resources.push(contact);parent.add(contact);
 for(const b of batches.values()){const rounded=/wc-(?:body|seat)|basin-rim|mattress|sofa-(?:base|arm|back)|coffee-top/.test(b.part),geometry=b.geometry||(/duvet/.test(b.part)?duvet:/pillow|sofa-(?:seat|cushion)/.test(b.part)?cushion:rounded?soft:cube),mesh=new THREE.InstancedMesh(geometry,b.m,b.items.length);b.items.forEach(([x,y,z,w,h,d,angle],i)=>{q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,angle);position.set(x,y,z);scale.set(w,h,d);matrix.compose(position,q,scale);mesh.setMatrixAt(i,matrix);});mesh.name=b.part;mesh.userData={part:b.part,...(b.asset?{furnitureAsset:b.asset}:{}),...(b.part==='apartment-bath-mirror'?{mirrorSurface:true}:{}),...(/^apartment-(?:mirror-edge|bath-mirror|wc-flush|basin-(?:ceramic|drain|waste|tap|spout)|shower-(?:riser|head))/.test(b.part)?{tourNonPhysical:true}:{}),buildingFloor:level,proposed:true,dimensionsInferred:true,placements:b.items.map(r=>({id:r[7],unit:r[8]}))};mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();resources.push(mesh);parent.add(mesh);}
}
