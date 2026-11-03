import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {CAR_MODELS,createCarTemplates} from './car-geometry.mjs';

const TAU=Math.PI*2;
const random=(n,seed=0)=>{const x=Math.sin(n*127.1+seed*311.7)*43758.5453;return x-Math.floor(x);};
const TREE_COLORS=['#496d3e','#587546','#3e6540','#637b49','#4d7043'];
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

/** Shared near/middle/far assets. All positions, hues and dimensions remain
 * identical across the detail tiers; only the geometry budget changes. */
export function createRealisticProps({trees=[],cars=[],mobile=false}={}){
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

 function family(type,placements,templates,model=null){
  if(!placements.length)return;
  const levels=new Uint8Array(placements.length).fill(255),tiers=templates.map((parts,tier)=>parts.map(part=>{
   const mesh=new THREE.InstancedMesh(part.geometry,part.material,placements.length);mesh.name=`${type}${model?'-'+model:''}-${['near','middle','far'][tier]}-${part.name}`;
   mesh.count=0;mesh.visible=false;mesh.castShadow=part.shadow!==false;mesh.receiveShadow=true;mesh.userData={propType:type,detailTier:tier,propPart:part.name,...(model?{propModel:model}:{})};group.add(mesh);return {...part,mesh};
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
  let leafAlbedo=0,leafWeight=0;
  for(let i=0;i<leafMap.image.data.length;i+=4){const a=leafMap.image.data[i+3]/255;if(a<.47)continue;const value=leafMap.image.data[i]/255;leafAlbedo+=THREE.ColorManagement.colorSpaceToWorking(new THREE.Color(value,value,value),THREE.SRGBColorSpace).r*a;leafWeight+=a;}
  leafAlbedo/=leafWeight||1;
  const bark=material(new THREE.MeshStandardMaterial({color:'#76624e',roughness:.97})),leaves=material(new THREE.MeshStandardMaterial({color:'#ffffff',map:leafMap,alphaTest:.47,alphaToCoverage:true,side:THREE.DoubleSide,roughness:.9})),canopy=material(new THREE.MeshStandardMaterial({color:new THREE.Color(leafAlbedo,leafAlbedo,leafAlbedo),roughness:.95}));
  const treeTemplates=[];
  for(let tier=0;tier<3;tier++){
   const trunk=[cylinder([0,0,0],[.075,1.8,.02],.17,.115,tier===2?6:10),cylinder([.075,1.8,.02],[-.02,3.3,.04],.115,.035,tier===2?6:8)],leafParts=[],shrubs=[];
   const branches=tier===0?12:tier===1?7:4;
   for(let j=0;j<branches;j++){
    const a=j*2.39996,r=1.22+random(j,5)*.7,y=2.6+random(j,8)*1.5,end=[Math.cos(a)*r,y,Math.sin(a)*r];
    trunk.push(cylinder([.03,1.75+j/branches*.7,0],end,.045,.012,tier===2?5:7));
    if(tier===0)trunk.push(cylinder(end,[end[0]*1.15,end[1]+.38,end[2]*1.1],.015,.004,5));
   }
   if(tier===0){
    const cards=mobile?92:152;
    for(let j=0;j<cards;j++){
     const a=j*2.39996,r=Math.sqrt(random(j,12))*1.75,yy=2.65+random(j,18)*2.05;
     const g=new THREE.PlaneGeometry(.83,.78);g.rotateY(random(j,33)*TAU);g.rotateX((random(j,31)-.5)*1.2);g.translate(Math.cos(a)*r,yy,Math.sin(a)*r);leafParts.push(g);
    }
   }else{
    const clusters=tier===1?14:7;
    for(let j=0;j<clusters;j++){
     const a=j*2.39996,r=(j?1.15:0),y=3.25+random(j,16)*.85,g=new THREE.IcosahedronGeometry(1,tier===1?1:0);
     g.scale(.95+random(j,20)*.28,.88+random(j,21)*.37,.95+random(j,22)*.23);g.translate(Math.cos(a)*r,y,Math.sin(a)*r);leafParts.push(g);
    }
   }
   // Shrubs stay within the original tree footprint and never introduce a
   // separate obstacle beside a driveway or parking bay.
   for(let j=0;j<(tier===2?2:4);j++){
    const a=j*2.4,g=new THREE.IcosahedronGeometry(1,tier===0?1:0);g.scale(.48,.42,.45);g.translate(Math.cos(a)*.65,.35,Math.sin(a)*.65);shrubs.push(g);
   }
   treeTemplates.push([{name:'branches',geometry:combine(trunk),material:bark},{name:'foliage',geometry:combine(leafParts),material:tier===0?leaves:canopy,colorize:true},{name:'shrubs',geometry:combine(shrubs),material:canopy,colorize:true}]);
  }
  const placements=trees.map(([x,z],i)=>{const form=i%3,width=form===0?.86+random(i,41)*.14:form===1?1.01+random(i,41)*.11:.91+random(i,41)*.18,height=form===0?1.12+random(i,40)*.10:form===1?.80+random(i,40)*.12:.94+random(i,40)*.13;return {id:i,x,z,y:-.09,angle:random(i,42)*TAU,scale:[width,height,width],color:new THREE.Color(TREE_COLORS[i%TREE_COLORS.length])};});
  family('tree',placements,treeTemplates);contactShadows('tree',placements,p=>3.6*p.scale[0],p=>3.6*p.scale[2],-.079);
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

 const matrix=new THREE.Matrix4(),quaternion=new THREE.Quaternion(),position=new THREE.Vector3(),scale=new THREE.Vector3();
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
