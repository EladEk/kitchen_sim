import {materialProperty as reference} from './material-property.mjs';
import './gpu-selection-nodes.mjs';
import {copyGpuClipBinding} from './gpu-selection-clip.mjs';
import {applyArchitecturalMaterials} from '../src/architectural-materials.mjs';
import {prepareSceneGeometry} from '../src/geometry-safety.mjs';
import {createPaintNodeMaterial} from './paint-finish.mjs';
import {wallCavityNodes} from './wall-cavity-nodes.mjs';
import {FACADE_COURSES} from '../src/facade-finish.mjs';
import {MeshPhysicalNodeMaterial,MeshStandardNodeMaterial,MeshSSSNodeMaterial} from 'three/webgpu';
import {Color,MeshStandardMaterial} from 'three';
import {bindTraditionalMaterial} from '../src/traditional-material.mjs';
import {photorealQuality,sharpenMaterialTextures,textureAnisotropy} from './photoreal-quality.mjs';
import {cellHash,valueNoise2} from './material-noise-nodes.mjs';
import {porcelainProfile} from '../src/architectural-materials.mjs';
import {DRY_PORCELAIN} from '../src/floor-appearance.mjs';
import {parallaxUV,stoneHeight,floorHeight,stochasticTexture,triplanarTexture} from './webgpu-relief.mjs';
import {Fn,vec2,vec3,float,uniform,positionWorld,positionView,normalView,normalWorldGeometry,normalViewGeometry,uv,texture,normalMap,bumpMap,mix,min,max,abs,fract,floor,sin,dot,smoothstep,select} from 'three/tsl';
const hash=p=>fract(sin(dot(p,vec2(127.1,311.7))).mul(43758.5453));
const footprint=p=>abs(p.dFdx()).add(abs(p.dFdy())).max(.000001);
const coverage=(d,p,h,period)=>mix(float(h).add(p.mul(.5)).sub(d).div(p).clamp().sub(float(-h).add(p.mul(.5)).sub(d).div(p).clamp()),h*2/period,smoothstep(period*.35,period,p));
const joint2=(d,p,j,t)=>float(1).sub(float(1).sub(coverage(d.x,p.x,j/2,t[0])).mul(float(1).sub(coverage(d.y,p.y,j/2,t[1]))));
// Keep the normal at unit scale before normalization. Multiplying it by a
// tiny screen-space determinant can underflow on distant mobile triangles.
const reliefNormal=(height,base)=>Fn(()=>{const dx=positionView.dFdx(),dy=positionView.dFdy(),r1=dy.cross(base),r2=base.cross(dx),det=dx.dot(r1),gradient=height.dFdx().mul(r1).add(height.dFdy().mul(r2)),perturbed=base.sub(gradient.mul(det.sign().div(det.abs().max(1e-8))));return select(det.abs().greaterThan(1e-8),perturbed,base).normalize();})();
const metricUV=()=>{const n=abs(normalWorldGeometry),p=positionWorld;return select(n.y.greaterThan(n.x).and(n.y.greaterThan(n.z)),p.xz,select(n.x.greaterThan(n.z),p.zy,p.xy));};
const sample=(map,coordinates)=>{map.updateMatrix();return texture(map,uniform(map.matrix).mul(vec3(coordinates,1)).xy);};
// Isotropic, jittered tufts avoid the directional blade lattice. Grass uses
// continuous world coordinates, never discrete parallax raymarching layers.
export function turfBladeHeight(p){
 const tuft=(q,scale)=>{
  const grid=q.mul(scale),cell=floor(grid),f=fract(grid).sub(.5);
  const jitter=vec2(cellHash(cell).sub(.5),cellHash(cell.add(19.7)).sub(.5)).mul(.45);
  const d=f.sub(jitter).length(),h=float(1).sub(smoothstep(.08,.52,d));
  return h.mul(float(.55).add(cellHash(cell.add(41.3)).mul(.45)));
 };
 const rot1=vec2(p.x.mul(.8).sub(p.y.mul(.6)),p.x.mul(.6).add(p.y.mul(.8)));
 const rot2=vec2(p.x.mul(.6).add(p.y.mul(.8)),p.y.mul(.6).sub(p.x.mul(.8)));
 const fine=max(tuft(p,55),tuft(rot1,82).mul(.85)),medium=tuft(rot2,18).mul(.65);
 return mix(medium,fine,.7).clamp();
}
function glassFinish(source){
 const material=new MeshPhysicalNodeMaterial();material.copy(source);material.userData={...source.userData,tslFinishRevision:177};
 const wave=sin(positionWorld.x.mul(2.1).add(positionWorld.z.mul(1.7))).mul(.00065);
 material.normalNode=reliefNormal(wave,normalViewGeometry);
 // UV-local borders support merged/instanced panes without CPU callbacks.
 const q=fract(uv()),uvEdge=min(min(q.x,float(1).sub(q.x)),min(q.y,float(1).sub(q.y)));
 const NdotV=normalViewGeometry.dot(positionView.normalize().negate()).abs().clamp(.02,1);
 material.aoNode=mix(.94,1,smoothstep(.005,.03,uvEdge)).mul(mix(.95,1,smoothstep(.04,.35,NdotV)));
 bindTraditionalMaterial(material,source);return material;
}
export function createFinishNodeMaterial(source,{steps=uniform(24),mobile=false}={}){
 if(source.isNodeMaterial||!source.isMeshStandardMaterial)return source;const data=source.userData;
 const grass=data.siteSurface==='grass',kind=data.surfaceKind||data.scanKind,foliage=data.foliage===true,metallic=source.metalness>.6||data.architecturalRole==='handle';
 if(!data.metricInstancedUVs&&!data.publicFinish&&!data.wallCavity&&!data.siteSurface&&!data.floorRendering&&!kind&&!foliage&&!data.architecturalGlass&&!metallic)return source;
 if(data.architecturalGlass)return glassFinish(source);
 if(kind==='plaster'||data.architecturalCeiling)return createPaintNodeMaterial(source,{mobile});
 const physical=source.isMeshPhysicalMaterial||kind==='fabric'||kind==='wood'||kind==='stone'||data.floorRendering||data.publicFinish==='floor'||foliage||metallic||data.siteSurface==='grass';
 const material=foliage?new MeshSSSNodeMaterial():physical?new MeshPhysicalNodeMaterial():new MeshStandardNodeMaterial();
 if(source.isMeshPhysicalMaterial)material.copy(source);else MeshStandardMaterial.prototype.copy.call(material,source);
 material.isMeshStandardMaterial=true;if(physical)material.isMeshPhysicalMaterial=true;material.userData={...data,tslFinishRevision:177};
 if(kind==='fabric'){material.sheen=.65;material.sheenRoughness=.4;material.sheenColor.set('#e8e3da');material.clearcoat=0;material.metalness=0;}
 if(kind==='wood'){material.clearcoat=.2;material.clearcoatRoughness=.3;material.metalness=0;}
 if(kind==='stone'&&source.roughness<.5&&data.architecturalRole!=='worktop'){material.clearcoat=.12;material.clearcoatRoughness=.3;}
 if(foliage){material.thicknessColorNode=reference('color','color');material.thicknessScaleNode=float(2);material.thicknessAttenuationNode=float(.18);material.thicknessAmbientNode=float(0);}
 const porcelain=porcelainProfile(data);let groutNode=null;
 let coordinates=grass?positionWorld.xz:data.metricInstancedUVs?metricUV():uv(),base=reference('color','color'),rough=reference('roughness','float'),height=float(0),normal=normalView;
 const stone=data.publicFinish==='stone',floorSurface=data.floorRendering||data.publicFinish==='floor';
 if(stone)coordinates=parallaxUV(metricUV(),stoneHeight,.003,steps);
 else if(floorSurface){const {tile,joint}=porcelain;coordinates=parallaxUV(data.floorRendering?coordinates:positionWorld.xz,p=>floorHeight(p,tile,joint),.00022,steps);}
 else if(!grass&&['wood','fabric','limestone','terrace'].includes(kind)&&source.bumpMap){const map=source.bumpMap;map.updateMatrix();const matrix=uniform(map.matrix);coordinates=parallaxUV(coordinates,p=>texture(map,matrix.mul(vec3(p,1)).xy).level(0).r,Math.min(.0015,source.bumpScale||.0005),steps);}
 // Projected paint UVs do not necessarily match the mesh tangent frame.
 // Use scalar relief on these surfaces so lighting follows the actual wall.
 const painted=data.wallCavity||data.architecturalCeiling||kind==='plaster';
 if(painted){if(source.bumpMap)height=sample(source.bumpMap,coordinates).r.mul(Math.min(.0004,source.bumpScale||.0002));}
 else if(!grass&&data.publicFinish!=='stone'){if(source.normalMap)normal=normalMap((kind==='wood'||kind==='fabric'?stochasticTexture(source.normalMap,coordinates):sample(source.normalMap,coordinates)),uniform(material.normalScale));else if(source.bumpMap)normal=bumpMap(sample(source.bumpMap,coordinates).r,reference('bumpScale','float'));}
 if(!grass&&source.roughnessMap&&data.publicFinish!=='stone'&&!(data.floorRendering&&source.map))rough=rough.mul((kind==='wood'||kind==='fabric'?stochasticTexture(source.roughnessMap,coordinates):sample(source.roughnessMap,coordinates)).g);
 if(data.floorRendering&&source.map){
  const {tile,joint:jointMetres}=porcelain,profile=data.floorRendering;source.map.updateMatrix();
  const continuous=uniform(source.map.matrix).mul(vec3(coordinates,1)).xy,cell=floor(continuous),local=fract(continuous),p=local.sub(.5),turn=floor(hash(cell).mul(profile.rotation==='quarter-turns'?4:2));
  const rotate=v=>profile.rotation==='quarter-turns'?select(turn.lessThan(1),v,select(turn.lessThan(2),vec2(v.y.negate(),v.x),select(turn.lessThan(3),v.negate(),vec2(v.y,v.x.negate())))):select(turn.lessThan(1),v,v.negate());
  const tileOffset=vec2(hash(cell.add(9.2)),hash(cell.add(37.1))).mul(.16),tileUV=rotate(p).mul(.84).add(.42).add(tileOffset);
  const photographed=texture(source.map,tileUV).grad(rotate(continuous.dFdx()).mul(.84),rotate(continuous.dFdy()).mul(.84)).rgb,distance=min(local,float(1).sub(local)).mul(vec2(...tile)),pixel=footprint(continuous).mul(vec2(...tile)),joint=joint2(distance,pixel,jointMetres,tile),edge=min(distance.x,distance.y);
  if(source.roughnessMap)rough=rough.mul(texture(source.roughnessMap,tileUV).grad(rotate(continuous.dFdx()).mul(.84),rotate(continuous.dFdy()).mul(.84)).g);
  base=mix(base.mul(photographed),uniform(new Color(DRY_PORCELAIN.grout)),joint.mul(.92));const satin=data.productId==='dry-floor'||!data.productId;rough=mix(satin?rough.mul(.04).add(.22).add(hash(cell.add(4)).mul(.04)):rough,.92,joint);material.aoNode=mix(1,.88,joint);material.specularIntensityNode=mix(.45,0,joint);material.clearcoatNode=mix(satin?.28:0,0,joint);normal=normal.add(vec3(hash(cell).sub(.5),hash(cell.add(13)).sub(.5),0).mul(.002)).normalize();height=height.sub(float(.00022).mul(float(1).sub(smoothstep(jointMetres/2,jointMetres/2+.0006,edge))));
  groutNode=joint;height=height.add(smoothstep(jointMetres/2,jointMetres/2+.0014,distance.x).mul(smoothstep(jointMetres/2,jointMetres/2+.0014,distance.y)).sub(1).mul(.00015));
 }else{
  if(source.map){
   const n=abs(normalWorldGeometry),p=positionWorld,displaced=select(n.y.greaterThan(n.x).and(n.y.greaterThan(n.z)),vec3(coordinates.x,p.y,coordinates.y),select(n.x.greaterThan(n.z),vec3(p.x,coordinates.y,coordinates.x),vec3(coordinates,p.z)));
   base=base.mul(stone?(mobile?stochasticTexture(source.map,coordinates):triplanarTexture(source.map,displaced,normalWorldGeometry)).rgb.clamp(.94,1.04):kind==='wood'||kind==='fabric'?stochasticTexture(source.map,coordinates).rgb:sample(source.map,coordinates).rgb);
  }
  if(data.publicFinish==='floor'){
   const {tile,joint}=porcelain,p=coordinates,cell=p.div(vec2(...tile)),distance=float(.5).sub(abs(fract(cell).sub(.5))).mul(vec2(...tile)),grout=joint2(distance,footprint(p),joint,tile),variation=hash(floor(cell));
   base=mix(base.mul(float(.988).add(variation.mul(.02))),uniform(new Color(DRY_PORCELAIN.grout)),grout.mul(.92));rough=mix(rough.mul(.04).add(.22).add(variation.mul(.04)),.92,grout);material.aoNode=mix(1,.88,grout);material.specularIntensityNode=mix(.45,0,grout);material.clearcoatNode=mix(.28,0,grout);normal=normal.add(vec3(variation.sub(.5),hash(floor(cell).add(13)).sub(.5),0).mul(.002)).normalize();height=height.sub(float(.00022).mul(float(1).sub(smoothstep(joint/2,joint/2+.0012,min(distance.x,distance.y)))));
   groutNode=grout;height=height.add(smoothstep(joint/2,joint/2+.0014,distance.x).mul(smoothstep(joint/2,joint/2+.0014,distance.y)).sub(1).mul(.00015));
  }
 }
 if(data.scanAlbedoGain)base=base.mul(vec3(...data.scanAlbedoGain));
 if(data.publicFinish==='stone'){
  const p=vec3(coordinates.x,coordinates.y,0),horizontal=coordinates.x,row=floor(p.y.div(.48)),offset=row.mod(2).mul(.47),u=horizontal.add(offset),distance=vec2(abs(fract(u.div(.94).add(.5)).sub(.5)).mul(.94),abs(fract(p.y.div(.48).add(.5)).sub(.5)).mul(.48)),pixel=vec2(footprint(horizontal),footprint(p.y)),grout=joint2(distance,pixel,.007,[.94,.48]),grain=sin(horizontal.mul(89)).mul(sin(p.y.mul(83))).mul(.0015).mul(float(1).sub(smoothstep(.002,.012,max(pixel.x,pixel.y))));
  const stoneTone=mix(fract(sin(floor(u.div(.94)).mul(127.1).add(row.mul(311.7))).mul(43758.5453)),.5,smoothstep(.12,.48,max(pixel.x,pixel.y)));
  base=mix(base.mul(float(FACADE_COURSES.toneMin).add(stoneTone.mul(FACADE_COURSES.toneRange)).add(grain)),uniform(new Color('#c8c0b2')),grout);material.aoNode=mix(1,.6,grout);rough=mix(.82,.92,grout);height=height.add(sin(horizontal.mul(12.566)).mul(sin(p.y.mul(12.566))).mul(.0003)).add(grain.mul(.02));height=height.add(stoneHeight(coordinates).mul(.0045));
 }
 if(data.wallCavity){
  const {onSkirt,groutMask,contact}=wallCavityNodes(data.wallCavity);
  material.aoNode=contact.mul(mix(1,.88,groutMask));
  base=mix(mix(base,uniform(new Color(DRY_PORCELAIN.color)),onSkirt),uniform(new Color('#b8b2a6')),groutMask);
  rough=mix(rough,.92,groutMask);height=height.add(onSkirt.mul(.0018));
 }
 if(data.siteSurface==='paving'){
  const p=positionWorld.xz,v=p.mul(vec2(2,4)),u=v.x.add(floor(v.y).mod(2).mul(.5)),local=fract(vec2(u,v.y)),distance=min(local,float(1).sub(local)).mul(vec2(.5,.25)),grout=joint2(distance,footprint(p),.006,[.5,.25]);base=base.mul(mix(1,.75,grout));height=height.sub(grout.mul(.001));
 }
 if(grass){
  const p=positionWorld.xz,px=max(footprint(p).x,footprint(p).y);
  const fineFade=float(1).sub(smoothstep(.003,.022,px)),tuftFade=float(1).sub(smoothstep(.018,.14,px));
  const rawBlade=turfBladeHeight(p),clump=valueNoise2(p.mul(14));
  const bladeH=mix(float(.58),mix(clump,rawBlade,fineFade),tuftFade),meadow=valueNoise2(p.mul(.35)).sub(.5);
  base=mix(uniform(new Color('#2b4d1e')),uniform(new Color('#3d6b29')),smoothstep(.12,.52,bladeH));
  base=mix(base,uniform(new Color('#58873a')),smoothstep(.62,.95,bladeH)).mul(float(1).add(meadow.mul(.08)));
  material.sheen=.35;material.sheenColor.set('#6d9948');material.sheenRoughness=.58;
  material.aoNode=mix(1,mix(.68,1,smoothstep(.1,.85,bladeH)),tuftFade);
  rough=mix(.86,.54,smoothstep(.45,.95,bladeH));height=height.add(bladeH.sub(.5).mul(.0016).mul(fineFade));
 }
 if(metallic){
  material.anisotropy=source.anisotropy||.55;
  const p=metricUV(),powder=['entryDoor','frame','fence'].includes(data.architecturalRole);
  const fine=valueNoise2(p.mul(powder?vec2(450):vec2(900,4))).sub(.5),fade=float(1).sub(smoothstep(.001,.008,max(footprint(p).x,footprint(p).y)));
  rough=rough.add(fine.mul(powder?.07:.025).mul(fade)).clamp(.08,1);height=height.add(fine.mul(powder?.000012:.000006).mul(fade));
 }
 if(groutNode&&porcelain.satin){
  const incidence=normal.dot(positionView.normalize().negate()).clamp(.05,1),fresnel=smoothstep(.15,.75,incidence);
  rough=mix(mix(rough.mul(.72),rough,fresnel),.92,groutNode);material.clearcoatNode=mix(.42,.28,fresnel).mul(float(1).sub(groutNode));
 }
 if(foliage)material.thicknessColorNode=base.mul(.65);
 material.colorNode=base;material.roughnessNode=rough;material.normalNode=reliefNormal(height,normal);bindTraditionalMaterial(material,source);return material;
}
export function createFinishAdapter({renderer,mobile=false}={}){
 const steps=uniform(photorealQuality({mobile}).pomSteps),converted=new Map(),bindings=new Map(),profileMaterials=new Set();let disposed=false;
 const convert=m=>{if(!m)return m;sharpenMaterialTextures(m,textureAnisotropy(renderer));if(m.isNodeMaterial)return m;if(!converted.has(m))converted.set(m,copyGpuClipBinding(m,createFinishNodeMaterial(m,{steps,mobile})));return converted.get(m);};
 return {setQuality(profile){steps.value=photorealQuality({mobile,...profile}).pomSteps;},apply(root){if(disposed)return;const originals=new Map();root.traverse(o=>{if(o.material)originals.set(o,o.material);});prepareSceneGeometry(root);for(const m of applyArchitecturalMaterials(root).values())profileMaterials.add(m);root.traverse(o=>{if(!o.material)return;const before=o.material,after=Array.isArray(before)?before.map(convert):convert(before);if(Array.isArray(before)?after.some((m,i)=>m!==before[i]):after!==before){if(!bindings.has(o))bindings.set(o,originals.get(o)||before);o.material=after;}});},dispose(){if(disposed)return;disposed=true;for(const [o,m]of bindings)o.material=m;for(const [s,m]of converted)if(m!==s)m.dispose();for(const m of profileMaterials)m.dispose();profileMaterials.clear();bindings.clear();converted.clear();}};
}
