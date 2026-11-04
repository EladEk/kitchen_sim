import {MeshPhysicalNodeMaterial,MeshStandardNodeMaterial} from 'three/webgpu';
import {Color} from 'three';
import {bindTraditionalMaterial} from '../src/traditional-material.mjs';
import {Fn,vec2,vec3,float,uniform,reference,positionWorld,positionView,normalWorldGeometry,normalViewGeometry,uv,texture,normalMap,bumpMap,mix,min,max,abs,fract,floor,sin,dot,smoothstep,step,select} from 'three/tsl';
const hash=p=>fract(sin(dot(p,vec2(127.1,311.7))).mul(43758.5453));
const footprint=p=>abs(p.dFdx()).add(abs(p.dFdy())).max(.000001);
const coverage=(d,p,h,period)=>mix(float(h).add(p.mul(.5)).sub(d).div(p).clamp().sub(float(-h).add(p.mul(.5)).sub(d).div(p).clamp()),h*2/period,smoothstep(period*.35,period,p));
const joint2=(d,p,j,t)=>float(1).sub(float(1).sub(coverage(d.x,p.x,j/2,t[0])).mul(float(1).sub(coverage(d.y,p.y,j/2,t[1]))));
const reliefNormal=(height,base)=>Fn(()=>{const dx=positionView.dFdx(),dy=positionView.dFdy(),r1=dy.cross(base),r2=base.cross(dx),det=dx.dot(r1);return select(det.abs().greaterThan(1e-12),det.abs().mul(base).sub(det.sign().mul(height.dFdx().mul(r1).add(height.dFdy().mul(r2)))).normalize(),base);})();
const metricUV=()=>{const n=abs(normalWorldGeometry),p=positionWorld;return select(n.y.greaterThan(n.x).and(n.y.greaterThan(n.z)),p.xz,select(n.x.greaterThan(n.z),p.zy,p.xy));};
const sample=(map,coordinates)=>{map.updateMatrix();return texture(map,uniform(map.matrix).mul(vec3(coordinates,1)).xy);};
export function createFinishNodeMaterial(source){
 if(source.isNodeMaterial||!source.isMeshStandardMaterial)return source;const data=source.userData;
 if(!data.metricInstancedUVs&&!data.publicFinish&&!data.wallCavity&&!data.siteSurface&&!data.floorRendering)return source;
 const material=(source.isMeshPhysicalMaterial?new MeshPhysicalNodeMaterial():new MeshStandardNodeMaterial()).copy(source);
 material.isMeshStandardMaterial=true;if(source.isMeshPhysicalMaterial)material.isMeshPhysicalMaterial=true;material.userData={...data,tslFinishRevision:115};
 let coordinates=data.metricInstancedUVs?metricUV():uv(),base=reference('color','color',material),rough=reference('roughness','float',material),height=float(0),normal=normalViewGeometry;
 if(source.normalMap)normal=normalMap(sample(source.normalMap,coordinates),uniform(material.normalScale));else if(source.bumpMap)normal=bumpMap(sample(source.bumpMap,coordinates).r,reference('bumpScale','float',material));
 if(source.roughnessMap)rough=rough.mul(sample(source.roughnessMap,coordinates).g);
 if(data.floorRendering&&source.map){
  const tile=data.tile||[.8,.8],profile=data.floorRendering;source.map.updateMatrix();
  const continuous=uniform(source.map.matrix).mul(vec3(uv(),1)).xy,cell=floor(continuous),local=fract(continuous),p=local.sub(.5),turn=floor(hash(cell).mul(profile.rotation==='quarter-turns'?4:2));
  const rotate=v=>profile.rotation==='quarter-turns'?select(turn.lessThan(1),v,select(turn.lessThan(2),vec2(v.y.negate(),v.x),select(turn.lessThan(3),v.negate(),vec2(v.y,v.x.negate())))):select(turn.lessThan(1),v,v.negate());
  const photographed=texture(source.map,rotate(p).add(.5)).grad(rotate(continuous.dFdx()),rotate(continuous.dFdy())).rgb,distance=min(local,float(1).sub(local)).mul(vec2(...tile)),pixel=footprint(continuous).mul(vec2(...tile)),joint=joint2(distance,pixel,profile.jointMetres,tile),edge=min(distance.x,distance.y);
  base=base.mul(mix(photographed,uniform(new Color(data.productId==='terrace-floor'?'#88705b':'#96918a')),joint));rough=mix(rough,.98,joint);height=height.sub(float(profile.recessMetres).mul(float(1).sub(smoothstep(profile.jointMetres/2,profile.jointMetres/2+.0006,edge))));
 }else{
  if(source.map)base=base.mul(sample(source.map,coordinates).rgb);
  if(data.publicFinish==='floor'){
   const {tile=[.8,.8],joint=.004}=data.floorCourses||{},p=positionWorld.xz,cell=p.div(vec2(...tile)),distance=float(.5).sub(abs(fract(cell).sub(.5))).mul(vec2(...tile)),grout=joint2(distance,footprint(p),joint,tile),variation=hash(floor(cell));
   base=base.mul(mix(float(.985).add(variation.mul(.025)),.62,grout.mul(.9)));rough=mix(mix(.50,.62,variation),.92,grout);height=height.sub(float(.00065).mul(float(1).sub(smoothstep(joint/2,joint/2+.0012,min(distance.x,distance.y)))));
  }
 }
 if(data.publicFinish==='stone'){
  const p=positionWorld,n=abs(normalWorldGeometry),horizontal=select(n.x.greaterThan(n.z),p.z,p.x),row=floor(p.y.div(.48)),offset=row.mod(2).mul(.46),u=horizontal.add(offset),distance=vec2(abs(fract(u.div(.94).add(.5)).sub(.5)).mul(.94),abs(fract(p.y.div(.48).add(.5)).sub(.5)).mul(.48)),grout=joint2(distance,vec2(footprint(horizontal),footprint(p.y)),.004,[.94,.48]),variation=hash(vec2(floor(u.div(.94)),row));
  base=base.mul(mix(float(.945).add(variation.mul(.085)),.63,grout.mul(.9)));rough=mix(rough,.96,grout);height=height.sub(grout.mul(.0025));
 }
 if(data.wallCavity){
  const {storey=0,height:h=2.75,skirting=.075}=data.wallCavity,p=positionWorld.y,y=storey>0?p.add(.015).mod(storey).sub(.015):p,wall=float(1).sub(smoothstep(.15,.5,abs(normalWorldGeometry.y))),bottom=float(1).sub(smoothstep(.015,.16,max(0,y))),top=float(1).sub(smoothstep(.015,.12,abs(float(h).sub(y)))),skirt=float(1).sub(smoothstep(skirting,skirting+.0015,y)).mul(step(-.005,y)).mul(wall);
  material.aoNode=float(1).sub(wall.mul(bottom.mul(.18).add(top.mul(.10))));base=base.mul(mix(1,1.035,skirt));height=height.add(skirt.mul(.0018));
 }
 if(data.siteSurface==='paving'){
  const p=positionWorld.xz,v=p.mul(vec2(2,4)),u=v.x.add(floor(v.y).mod(2).mul(.5)),local=fract(vec2(u,v.y)),distance=min(local,float(1).sub(local)).mul(vec2(.5,.25)),grout=joint2(distance,footprint(p),.006,[.5,.25]);base=base.mul(mix(1,.75,grout));height=height.sub(grout.mul(.001));
 }
 if(data.siteSurface==='grass'){const p=positionWorld.xz,meadow=sin(p.x.mul(.43).add(sin(p.y.mul(.21)))).mul(sin(p.y.mul(.37).sub(p.x.mul(.13))));base=base.mul(vec3(1).add(meadow.mul(vec3(.045,.035,.025))));}
 material.colorNode=base;material.roughnessNode=rough;material.normalNode=reliefNormal(height,normal);bindTraditionalMaterial(material,source);return material;
}
export function createFinishAdapter(){
 const converted=new Map(),bindings=new Map();let disposed=false;const convert=m=>{if(!m||m.isNodeMaterial)return m;if(!converted.has(m))converted.set(m,createFinishNodeMaterial(m));return converted.get(m);};
 return {apply(root){if(disposed)return;root.traverse(o=>{if(!o.material)return;const before=o.material,after=Array.isArray(before)?before.map(convert):convert(before);if(Array.isArray(before)?after.some((m,i)=>m!==before[i]):after!==before){if(!bindings.has(o))bindings.set(o,before);o.material=after;}});},dispose(){if(disposed)return;disposed=true;for(const [o,m]of bindings)o.material=m;for(const [s,m]of converted)if(m!==s)m.dispose();bindings.clear();converted.clear();}};
}
