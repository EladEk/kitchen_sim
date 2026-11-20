import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CAR_MODELS,createCarTemplates} from './car-geometry.mjs';

const TAU=Math.PI*2;
const random=(n,seed=0)=>{const x=Math.sin(n*127.1+seed*311.7)*43758.5453;return x-Math.floor(x);};
const TREE_COLORS=['#496d3e','#587546','#3e6540','#637b49','#4d7043'];
const HEDGE_COLORS=['#ffffff','#eef2e6','#f4f1e4'];
const CAR_COLORS=['#d4d9dc','#f0f0eb','#30383d','#7b858c','#3a5266','#763c38','#b7b6ae'];

function alphaTexture(kind,size=128){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=(x+.5)/size,v=(y+.5)/size;let alpha=0,shade=255;
  if(kind==='contact'){
   const r=Math.hypot((u-.5)*2,(v-.5)*2);alpha=Math.pow(Math.max(0,1-r),1.6)*255;
  }else{
   // Individual pointed leaves and their midribs, not an opaque foliage disk.
   for(let j=0;j<13;j++){
    const cx=.13+random(j,3)*.74,cy=.1+random(j,6)*.8,a=random(j,9)*TAU,dx=u-cx,dy=v-cy;
    const xx=(dx*Math.cos(a)+dy*Math.sin(a))/.105,yy=(-dx*Math.sin(a)+dy*Math.cos(a))/.20;
    const edge=1-yy*yy-Math.abs(xx)*Math.abs(xx)*1.35;
    if(edge>0){alpha=Math.max(alpha,Math.min(1,edge*16)*255);shade=215+random(j,4)*37-Math.max(0,1-Math.abs(xx)*40)*12;}
   }
  }
  const i=(y*size+x)*4;data[i]=data[i+1]=data[i+2]=shade;data[i+3]=Math.round(alpha);
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=4;texture.needsUpdate=true;return texture;
}


// Impostor atlas tiles (image convention, v up): side 0deg top-left, side 60deg
// top-right, side 120deg bottom-left, top view bottom-right. Each card is
// emitted with both windings (front-side material) so the back keeps the
// outward, rounded crown normals instead of flipped ones.
const TILE_ORIGINS=[[0,.5],[.5,.5],[0,0],[.5,0]],INSET=1.5/1024;
export function impostorCards({R,H},{sides=[0,1,2],tops=[]}={}){
 const pos=[],nor=[],uv=[],idx=[];
 const crown=(x,y,z,up=0)=>{const n=new THREE.Vector3(x/R,Math.max(-.3,(y-H*.55)/(H*.5)),z/R);if(n.lengthSq()<1e-6)n.set(0,1,0);n.normalize().lerp(new THREE.Vector3(0,1,0),.35+up).normalize();return n;};
 const quad=(corners,uvs,up)=>{const base=pos.length/3;corners.forEach(([x,y,z],i)=>{pos.push(x,y,z);const n=crown(x,y,z,up);nor.push(n.x,n.y,n.z);uv.push(...uvs[i]);});idx.push(base,base+1,base+2,base,base+2,base+3,base,base+2,base+1,base,base+3,base+2);};
 const tile=(t,u,v)=>[TILE_ORIGINS[t][0]+INSET+u*(.5-2*INSET),TILE_ORIGINS[t][1]+INSET+v*(.5-2*INSET)];
 for(const t of sides){const a=t*Math.PI/3,rx=Math.cos(a),rz=-Math.sin(a);quad([[-R*rx,0,-R*rz],[R*rx,0,R*rz],[R*rx,H,R*rz],[-R*rx,H,-R*rz]],[tile(t,0,0),tile(t,1,0),tile(t,1,1),tile(t,0,1)],0);}
 for(const f of tops){const y=H*f;quad([[-R,y,R],[R,y,R],[R,y,-R],[-R,y,-R]],[tile(3,0,0),tile(3,1,0),tile(3,1,1),tile(3,0,1)],.4);}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeBoundingBox();g.computeBoundingSphere();return g;
}

/** Shared near/middle/far assets. All positions, hues and dimensions remain
 * identical across the detail tiers; only the geometry budget changes. */
export function createRealisticProps({trees=[],cars=[],hedges=[],backdrop=[],mobile=false}={}){
 const group=new THREE.Group();group.name='public-realistic-props';
 const geometries=new Set(),materials=new Set(),textures=new Set(),families=[];
 let disposed=false,lastUpdate=-Infinity;
 const geometry=g=>{geometries.add(g);return g;},material=m=>{materials.add(m);return m;},texture=t=>{textures.add(t);return t;};
 const combine=parts=>{
  const list=parts.map(g=>g.index?g.toNonIndexed():g),merged=mergeGeometries(list,false);
  for(let i=0;i<parts.length;i++){if(list[i]!==parts[i])list[i].dispose();parts[i].dispose();}
  if(!merged)throw Error('Incompatible prop geometry');return geometry(merged);
 };
 const cylinder=(a,b,r0,r1,segments=8)=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...b),direction=to.clone().sub(from);
  return new THREE.CylinderGeometry(r1,r0,direction.length(),segments,1).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize())).translate(...from.add(to).multiplyScalar(.5).toArray());
 };
 const thresholds=mobile?[36,92]:[48,125],hysteresis=.09;
 const leafMap=trees.length?texture(alphaTexture('leaf')):null;
 const contactMap=trees.length||cars.length?texture(alphaTexture('contact',64)):null;
 const shadowMaterial=contactMap?material(new THREE.MeshBasicMaterial({map:contactMap,color:'#000000',transparent:true,opacity:.22,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2,toneMapped:false})):null;

 const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
 function family(type,placements,templates,model=null){
  if(!placements.length)return;
  const levels=new Uint8Array(placements.length).fill(255),tiers=templates.map((parts,tier)=>parts.map(part=>{
   const mesh=new THREE.InstancedMesh(part.geometry,part.material,placements.length);mesh.name=`${type}${model?'-'+model:''}-${['near','middle','far'][tier]}-${part.name}`;
   // Allocate colour bindings and valid transforms before a detail tier is
   // first shown. Warmup can compile inactive tiers without fake objects.
   placements.forEach((p,i)=>{quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle);position.set(p.x,p.y,p.z);scale.set(...p.scale);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);if(part.colorize)mesh.setColorAt(i,p.color);});
   mesh.computeBoundingSphere();mesh.computeBoundingBox();mesh.count=0;mesh.visible=false;mesh.castShadow=part.shadow!==false;mesh.receiveShadow=true;mesh.userData={propType:type,detailTier:tier,propPart:part.name,...(model?{propModel:model}:{})};group.add(mesh);return {...part,mesh};
  }));
  families.push({type,placements,levels,tiers,initialized:false});
 }
 function contactShadows(type,placements,width,length,y){
  if(!placements.length)return;
  const g=geometry(new THREE.PlaneGeometry(1,1).rotateX(-Math.PI/2)),mesh=new THREE.InstancedMesh(g,shadowMaterial,placements.length),m=new THREE.Matrix4(),q=new THREE.Quaternion();
  placements.forEach((p,i)=>{q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle);m.compose(new THREE.Vector3(p.x,y,p.z),q,new THREE.Vector3(typeof width==='function'?width(p):width,1,typeof length==='function'?length(p):length));mesh.setMatrixAt(i,m);});
  mesh.name=type+'-contact-shadows';mesh.userData={propType:type,propPart:'contact-shadow'};mesh.computeBoundingSphere();mesh.renderOrder=1;group.add(mesh);
 }

 if(trees.length){
  // R185: CC0 Poly Haven jacaranda / searsia impostors (assets/vegetation-r185).
  // The scan controller swaps the procedural leaf texture for the rendered
  // atlas before warmup; the card UVs address the 2x2 atlas tiles.
  const bark=material(new THREE.MeshStandardMaterial({color:'#5d4a3a',roughness:.97}));
  const leaves=material(new THREE.MeshStandardMaterial({color:'#ffffff',map:leafMap,alphaTest:.47,alphaToCoverage:true,roughness:.9}));
  const shrubLeaves=material(new THREE.MeshStandardMaterial({color:'#ffffff',map:leafMap,alphaTest:.47,alphaToCoverage:true,roughness:.92}));
  leaves.userData={foliage:true,scanKind:'treeImpostor',impostorRevision:185};shrubLeaves.userData={foliage:true,scanKind:'shrubImpostor',impostorRevision:185};
  const TREE={R:2.7,H:6.1},SHRUB={R:.44,H:.95};
  const treeTemplates=[];
  for(let tier=0;tier<3;tier++){
   const trunk=[cylinder([0,0,0],[.02,1.7,.01],.16,.11,tier===2?5:8)];
   const crown=impostorCards(TREE,{sides:tier===2?[0,1]:[0,1,2],tops:tier===0?[.6,.8]:[.7]});
   const bushes=[];const count=tier===0?3:tier===1?2:1;
   for(let j=0;j<count;j++){const a=j*2.39996+.6,g=impostorCards(SHRUB,{sides:tier===2?[0]:[0,2],tops:tier===2?[]:[.75]});g.rotateY(a*1.7);g.translate(Math.cos(a)*.95,0,Math.sin(a)*.95);bushes.push(g);}
   treeTemplates.push([{name:'branches',geometry:combine(trunk),material:bark},{name:'foliage',geometry:geometry(crown),material:leaves,colorize:true},{name:'shrubs',geometry:combine(bushes),material:shrubLeaves,colorize:true}]);
  }
  const placements=trees.map(([x,z],i)=>{const form=i%3,width=form===0?.86+random(i,41)*.14:form===1?1.01+random(i,41)*.11:.91+random(i,41)*.18,height=form===0?1.12+random(i,40)*.10:form===1?.80+random(i,40)*.12:.94+random(i,40)*.13;return {id:i,x,z,y:-.09,angle:random(i,42)*TAU,scale:[width,height,width],color:new THREE.Color(TREE_COLORS[i%TREE_COLORS.length])};});
  family('tree',placements,treeTemplates);contactShadows('tree',placements,p=>3.6*p.scale[0],p=>3.6*p.scale[2],-.079);
  // Hedges behind garden fences and a distant tree belt: static batches, one draw each.
  const statics=(name,list,g,m,shadow)=>{if(!list.length)return;const mesh=new THREE.InstancedMesh(geometry(g),m,list.length);list.forEach((p,i)=>{quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle);position.set(p.x,p.y||0,p.z);scale.set(...p.scale);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);mesh.setColorAt(i,p.color);});mesh.name=name;mesh.castShadow=shadow;mesh.receiveShadow=true;mesh.computeBoundingSphere();mesh.computeBoundingBox();mesh.userData={propType:name,propPart:'foliage',visualOnly:true,static:true};group.add(mesh);};
  statics('hedge',hedges.map((h,i)=>({...h,scale:[1.35,h.height/SHRUB.H*(.92+random(i,71)*.16),.8],color:new THREE.Color(HEDGE_COLORS[i%HEDGE_COLORS.length])})),impostorCards(SHRUB,{sides:[0,1,2],tops:[.8]}),shrubLeaves,!mobile);
  statics('backdrop',backdrop.map((p,i)=>({...p,color:new THREE.Color(TREE_COLORS[i%TREE_COLORS.length]).lerp(new THREE.Color('#9fb0a0'),.18)})),impostorCards(TREE,{sides:[0,1],tops:[]}),leaves,false);
 }

 if(cars.length){
  const carMaterials={
   body:material(new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.31,metalness:.28,ior:1.5,clearcoat:.88,clearcoatRoughness:.13})),
   glass:material(new THREE.MeshPhysicalMaterial({color:'#243138',roughness:.095,metalness:0,ior:1.52,clearcoat:.8,clearcoatRoughness:.08,envMapIntensity:1.1})),
   rubber:material(new THREE.MeshStandardMaterial({color:'#171b1d',roughness:.97})),
   chrome:material(new THREE.MeshStandardMaterial({color:'#b7bec3',metalness:.9,roughness:.25})),
   trim:material(new THREE.MeshStandardMaterial({color:'#252c31',roughness:.72})),
   headlight:material(new THREE.MeshStandardMaterial({color:'#ffffff',vertexColors:true,roughness:.18,metalness:.18})),
   tail:material(new THREE.MeshStandardMaterial({color:'#912721',roughness:.23,metalness:.12}))
  };
  const placements=cars.map((car,i)=>{
   if(!Number.isFinite(car.length)||car.length<=0)throw Error('Car length must be positive');
   const model=CAR_MODELS.includes(car.model)?car.model:car.length<3.65?'hatchback':CAR_MODELS[i%CAR_MODELS.length],width=car.width?Math.min(1,car.width/1.9):1;
   return {id:i,model,x:car.x,z:car.z,y:-.039,angle:car.angle||0,scale:[width,.97+random(i,58)*.04,car.length/4],length:car.length,color:new THREE.Color(car.color||CAR_COLORS[i%CAR_COLORS.length])};
  });
  for(const model of CAR_MODELS){const members=placements.filter(p=>p.model===model);if(members.length)family('car',members,createCarTemplates({model,combine,materials:carMaterials}),model);}
  contactShadows('car',placements,1.82,p=>p.length*.95,-.028);
 }


 function chooseTier(previous,distance){
  if(previous===255)return distance<thresholds[0]?0:distance<thresholds[1]?1:2;
  if(previous===0)return distance>thresholds[1]*(1+hysteresis)?2:distance>thresholds[0]*(1+hysteresis)?1:0;
  if(previous===1)return distance<thresholds[0]*(1-hysteresis)?0:distance>thresholds[1]*(1+hysteresis)?2:1;
  return distance<thresholds[0]*(1-hysteresis)?0:distance<thresholds[1]*(1-hysteresis)?1:2;
 }
 function update(cameraPosition,now=globalThis.performance?.now?.()??Date.now(),{detailScale=1}={}){
  if(disposed||now>=lastUpdate&&now-lastUpdate<220)return false;lastUpdate=now;let any=false;
  for(const family of families){let changed=false;
   for(let i=0;i<family.placements.length;i++){const p=family.placements[i],distance=Math.hypot(cameraPosition.x-p.x,cameraPosition.y-(p.y+(family.type==='tree'?2.5:.7)),cameraPosition.z-p.z)/Math.max(.4,detailScale),level=chooseTier(family.initialized?family.levels[i]:255,distance);if(level!==family.levels[i]){family.levels[i]=level;changed=true;}}
   family.initialized=true;
   if(!changed)continue;any=true;
   for(let level=0;level<3;level++){
    const members=family.placements.filter((_,i)=>family.levels[i]===level);
    for(const part of family.tiers[level]){
     const mesh=part.mesh;mesh.count=members.length;mesh.visible=!!members.length;
     members.forEach((p,i)=>{quaternion.setFromAxisAngle(THREE.Object3D.DEFAULT_UP,p.angle);position.set(p.x,p.y,p.z);scale.set(...p.scale);matrix.compose(position,quaternion,scale);mesh.setMatrixAt(i,matrix);if(part.colorize)mesh.setColorAt(i,p.color);});
     mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;if(mesh.count)mesh.computeBoundingSphere();
    }
   }
  }
  return any;
 }
 // Far templates make the first frame and non-interactive captures complete.
 update(new THREE.Vector3(0,10000,0),0);
 lastUpdate=-Infinity;
 families.forEach(f=>f.initialized=false);
 return {group,update,thresholds:thresholds.slice(),
  getState(){return families.flatMap(f=>f.placements.map((p,i)=>({type:f.type,id:p.id,tier:f.levels[i],position:[p.x,p.y,p.z],angle:p.angle,scale:p.scale.slice(),color:p.color.toArray(),...(p.length?{length:p.length,model:p.model}:{})})));},
  get resources(){return {geometries:[...geometries],materials:[...materials],textures:[...textures]};},
  get stats(){return {drawCalls:group.children.filter(m=>m.visible&&m.count>0).length,maxDrawCalls:group.children.length,activeInstances:group.children.reduce((n,m)=>n+(m.visible?m.count:0),0),templateTriangles:[...geometries].reduce((n,g)=>n+(g.index?.count??g.attributes.position.count)/3,0)};},
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();for(const mesh of group.children)mesh.dispose?.();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());group.clear();geometries.clear();materials.clear();textures.clear();families.length=0;}
 };
}
