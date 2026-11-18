import {materialProperty as reference} from './material-property.mjs';
import {MeshPhysicalNodeMaterial} from 'three/webgpu';
import {Fn,abs,cameraViewMatrix,faceDirection,float,mix,normalWorldGeometry,normalViewGeometry,positionWorld,select,smoothstep,texture,uniform,vec3,vec4} from 'three/tsl';
import {noiseGradient} from './material-noise-nodes.mjs';
import {wallCavityNodes} from './wall-cavity-nodes.mjs';
import {DRY_PORCELAIN} from '../src/floor-appearance.mjs';
import {bindTraditionalMaterial} from '../src/traditional-material.mjs';

// World-space projection gives every wall the same metre-scale paint detail.
// Construct an orthonormal frame explicitly instead of normalizing derivatives
// of tiny projected triangles or relying on absent geometry UVs/tangents.
export function paintCoordinates(){
 const n=abs(normalWorldGeometry),p=positionWorld;
 return select(n.y.greaterThan(n.x).and(n.y.greaterThan(n.z)),p.xz,
  select(n.x.greaterThan(n.z),p.zy,p.xy));
}
function paintSample(map,p){
 map.updateMatrix();
 return texture(map,uniform(map.matrix).mul(vec3(p,1)).xy);
}
export function createPaintNodeMaterial(source,{mobile=false}={}){
 const material=new MeshPhysicalNodeMaterial();
 material.copy(source);
 material.userData={...source.userData,tslFinishRevision:176,paintPath:mobile?'physical-mobile-neutral':'physical'};
 // Opaque paint's shadow opacity is independent of the albedo image. Leaving
 // map set makes the shadow pass sample raw geometry UVs, bypassing projection.
 material.map=null;
 material.paintAlbedoMap=source.map;
 const ceiling=source.userData.architecturalCeiling===true;
 material.roughness=ceiling?.94:.82;
 if(mobile)material.envNode=vec3(.97,.94,.89);
 material.metalness=0;
 material.sheen=ceiling?0:.1;
 material.sheenColor.set('#ffffff');
 material.sheenRoughness=.8;
 material.specularIntensity=ceiling?.15:.35;
 const p=paintCoordinates();
 let albedo=reference('color','color');
 if(source.map)albedo=albedo.mul(paintSample(source.map,p).rgb);
 material.colorNode=albedo;
 material.roughnessNode=source.roughnessMap
  ?reference('roughness','float').mul(paintSample(source.roughnessMap,p).g.mul(.06).add(.94))
  :reference('roughness','float');
 material.normalNode=Fn(()=>{
  const n=normalWorldGeometry.mul(faceDirection).normalize();
  const a=abs(n);
  const axis=select(a.x.greaterThan(a.y).and(a.x.greaterThan(a.z)),vec3(0,0,1),vec3(1,0,0));
  const tangent=axis.sub(n.mul(n.dot(axis))).normalize();
  const bitangent=n.cross(tangent).normalize();
  const macro=noiseGradient(p.mul(18)).mul(.002);
  const micro=noiseGradient(p.mul(210)).mul(.006);
  const detail=(source.normalMap?paintSample(source.normalMap,p).xy.mul(2).sub(1):vec3(0).xy).add(macro).add(micro);
  const perturbed=n.add(tangent.mul(detail.x)).add(bitangent.mul(detail.y)).normalize();
  return cameraViewMatrix.mul(vec4(perturbed,0)).xyz.normalize();
 })();
 const rawCurvature=normalViewGeometry.dFdx().length().add(normalViewGeometry.dFdy().length());
 const curvature=smoothstep(.035,.22,rawCurvature).mul(.26);
 material.aoNode=float(1).sub(curvature);
 const cavity=source.userData.wallCavity;
 if(cavity){
  const {onSkirt,groutMask,contact}=wallCavityNodes(cavity);
  material.aoNode=contact.mul(float(1).sub(curvature.mul(.5))).mul(mix(1,.88,groutMask));
  const skirtColor=mix(albedo,uniform(new (source.color.constructor)(DRY_PORCELAIN.color)),onSkirt);
  material.colorNode=mix(skirtColor,uniform(new (source.color.constructor)('#b8b2a6')),groutMask);
  material.roughnessNode=mix(material.roughnessNode,float(.92),groutMask);
 }
 bindTraditionalMaterial(material,source);
 return material;
}
