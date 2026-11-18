import {Color} from 'three';
import {porcelainProfile} from './architectural-materials.mjs';
import {DRY_PORCELAIN} from './floor-appearance.mjs';
import {FACADE_COURSES} from './facade-finish.mjs';
// Public-safe architectural finishes; no apartment or owner data.
export const FINISH_GRID_GLSL=`
float finishGridCoverage(float distanceMetres,float footprint,float halfJoint,float period) {
 float w=max(footprint,.000001);
 float c=clamp((halfJoint+w*.5-distanceMetres)/w,0.,1.)-clamp((-halfJoint+w*.5-distanceMetres)/w,0.,1.);
 return mix(c,halfJoint*2./period,smoothstep(period*.35,period,w));
}
`;
export function installStoneCourses(limestone){
  limestone.userData.publicFinish='stone';
  limestone.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;\nvarying vec3 vBuildingSurfaceNormal;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 bw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nbw=instanceMatrix*bw;\n#endif\nvBuildingWorld=(modelMatrix*bw).xyz;\nvBuildingSurfaceNormal=inverseTransformDirection(transformedNormal,viewMatrix);');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;\nvarying vec3 vBuildingSurfaceNormal;\n'+FINISH_GRID_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
    float course=floor(vBuildingWorld.y/.48);
    vec3 n=normalize(vBuildingSurfaceNormal);
    float horizontal=abs(n.x)>abs(n.z)?vBuildingWorld.z:vBuildingWorld.x;
    float row=abs(fract(vBuildingWorld.y/.48+.5)-.5)*.48;
    float col=abs(fract((horizontal+mod(course,2.0)*.47)/.94+.5)-.5)*.94;
    float aa=max(fwidth(horizontal),fwidth(vBuildingWorld.y));
    // The photographed facade has crisp, recessed-looking grout. The old
    // 2 mm / 4% treatment almost disappeared at normal viewing distances.
    float rowCoverage=finishGridCoverage(row,fwidth(vBuildingWorld.y),.0035,.48);
    float colCoverage=finishGridCoverage(col,fwidth(horizontal),.0035,.94);
    float joint=1.0-(1.0-rowCoverage)*(1.0-colCoverage);
    // Slight per-stone variation matches the natural limestone blocks while
    // keeping the selected ivory facade colour stable across private/public.
    vec2 stoneId=vec2(floor(horizontal/.94+mod(course,2.0)*.5),course);
    float stoneTone=mix(fract(sin(dot(stoneId,vec2(127.1,311.7)))*43758.5453),.5,smoothstep(.12,.48,aa));
    float grain=sin(horizontal*89.0)*sin(vBuildingWorld.y*83.0)*.003*(1.0-smoothstep(.002,.012,aa));
    vec3 mineralGrain=clamp(diffuseColor.rgb/max(diffuse,vec3(.0001)),vec3(.94),vec3(1.04));
    diffuseColor.rgb=diffuse*mineralGrain*(${FACADE_COURSES.toneMin}+stoneTone*${FACADE_COURSES.toneRange}+grain)*mix(1.0,${FACADE_COURSES.groutShade},joint);
   `);
  };limestone.customProgramCacheKey=()=> 'building-stone-courses-r164';

}
export function installFloorCourses(interiorFloor,{tile=[1,1],joint}={}){
  ({tile,joint}=porcelainProfile({...interiorFloor.userData,floorCourses:{tile,...(joint===undefined?{}:{joint})}}));
  interiorFloor.userData.publicFinish='floor';interiorFloor.userData.floorCourses={tile:[...tile],joint};
  interiorFloor.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 interiorVertex=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ninteriorVertex=instanceMatrix*interiorVertex;\n#endif\nvInteriorWorld=(modelMatrix*interiorVertex).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;\n'+FINISH_GRID_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tilePeriod=vec2(${tile[0].toFixed(4)},${tile[1].toFixed(4)});
    vec2 tileEdge=(.5-abs(fract(vInteriorWorld.xz/tilePeriod)-.5))*tilePeriod;
    float aa=max(fwidth(vInteriorWorld.x),fwidth(vInteriorWorld.z));
    float gx=finishGridCoverage(tileEdge.x,fwidth(vInteriorWorld.x),${(joint/2).toFixed(5)},tilePeriod.x);
    float gz=finishGridCoverage(tileEdge.y,fwidth(vInteriorWorld.z),${(joint/2).toFixed(5)},tilePeriod.y);
    float grout=1.0-(1.0-gx)*(1.0-gz);
    vec2 tileId=floor(vInteriorWorld.xz/tilePeriod);
    float tileVariation=fract(sin(dot(tileId,vec2(127.1,311.7)))*43758.5453);
    float tileEdgeDistance=min(tileEdge.x,tileEdge.y);
    float tileRelief=-.00022*(1.-smoothstep(${(joint/2).toFixed(5)},${(joint/2+.0012).toFixed(5)},tileEdgeDistance));
    tileRelief+=.00015*(smoothstep(${(joint/2).toFixed(5)},${(joint/2+.0014).toFixed(5)},tileEdge.x)*smoothstep(${(joint/2).toFixed(5)},${(joint/2+.0014).toFixed(5)},tileEdge.y)-1.);
    float speckle=sin(vInteriorWorld.x*63.0+sin(vInteriorWorld.z*31.0))*sin(vInteriorWorld.z*57.0)*.014;
    diffuseColor.rgb=mix(diffuseColor.rgb*(.988+tileVariation*.02+speckle*(1.0-smoothstep(.003,.03,aa))),vec3(${new Color(DRY_PORCELAIN.grout).toArray().map(v=>v.toFixed(6)).join(',')}),grout*.92);
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    // r185 expands roughness before normal_fragment_begin.
    vec3 tileViewNormal=normalize(cross(dFdx(-vViewPosition),dFdy(-vViewPosition)));
    float tileNdotV=clamp(abs(dot(tileViewNormal,normalize(vViewPosition))),.05,1.);
    float tileFaceRoughness=mix(.22,.28,tileVariation);
    tileFaceRoughness=mix(tileFaceRoughness*.72,tileFaceRoughness,smoothstep(.15,.75,tileNdotV));
    roughnessFactor=mix(tileFaceRoughness,.92,grout);
   `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 tileSigmaX=dFdx(-vViewPosition),tileSigmaY=dFdy(-vViewPosition);
    vec3 tileR1=cross(tileSigmaY,normal),tileR2=cross(normal,tileSigmaX);
    float tileDet=dot(tileSigmaX,tileR1);
    if(abs(tileDet)>1.e-12)normal=normalize(abs(tileDet)*normal-sign(tileDet)*(dFdx(tileRelief)*tileR1+dFdy(tileRelief)*tileR2));
   `);
  };interiorFloor.customProgramCacheKey=()=> `building-porcelain-floor-r176:${tile}:${joint}`;
  interiorFloor.userData.architecturalInterior=true;

}

// Analytic floor/ceiling contact on wall faces. No screen-space pass or extra
// geometry; it works in stereo. This is shaded relief, not a new silhouette.
export function installWallCavity(material,{storey=0,height=2.75,skirting=.075}={}){
 if(material.userData.wallCavity)return material;
 skirting=skirting||.075;
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){
  before.call(this,shader,...args);
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vCavityWorld;').replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
   vec4 cavityVertex=vec4(transformed,1.);
   #ifdef USE_INSTANCING
    cavityVertex=instanceMatrix*cavityVertex;
   #endif
   vCavityWorld=(modelMatrix*cavityVertex).xyz;
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vCavityWorld;').replace('#include <color_fragment>',`#include <color_fragment>
   float cavityHeight=${storey>0?`mod(vCavityWorld.y+.015,${storey.toFixed(4)})-.015`:'vCavityWorld.y'};
   vec3 cavityFace=normalize(cross(dFdx(vCavityWorld),dFdy(vCavityWorld)));
   float cavityWall=1.-smoothstep(.15,.5,abs(cavityFace.y));
   float cavityPixel=max(fwidth(vCavityWorld.y),.0005);
   float cavityBase=1.-smoothstep(.001,.018,max(0.,cavityHeight));
   float cavityTop=1.-smoothstep(.002,.035,abs(${height.toFixed(4)}-cavityHeight));
   float cavityContact=clamp(1.-cavityWall*(.10*cavityBase+.12*cavityTop),.82,1.);
   float cavitySkirt=(1.-smoothstep(${(skirting-.0008).toFixed(4)},${(skirting+.0008).toFixed(4)},cavityHeight))*step(0.,cavityHeight)*cavityWall;
   float cavityBottomGrout=(1.-smoothstep(.0022,.0028+cavityPixel,abs(cavityHeight)))*cavityWall;
   float cavityTopSeam=(1.-smoothstep(.0010,.0016+cavityPixel,abs(cavityHeight-${skirting.toFixed(4)})))*cavityWall;
   float cavityHorizontal=abs(cavityFace.x)>abs(cavityFace.z)?vCavityWorld.z:vCavityWorld.x;
   float cavityVerticalDistance=.5-abs(fract(cavityHorizontal)-.5);
   float cavityVerticalGrout=(1.-smoothstep(.0010,.0016+fwidth(cavityHorizontal),cavityVerticalDistance))*cavitySkirt;
   float cavityGrout=clamp(max(max(cavityBottomGrout,cavityTopSeam),cavityVerticalGrout),0.,1.);
   float cavityAO=cavityContact*mix(1.,.88,cavityGrout);
   vec3 cavitySkirtColor=mix(diffuseColor.rgb,vec3(${new Color(DRY_PORCELAIN.color).toArray().map(v=>v.toFixed(6)).join(',')}),cavitySkirt);
   diffuseColor.rgb=mix(cavitySkirtColor,vec3(${new Color('#b8b2a6').toArray().map(v=>v.toFixed(6)).join(',')}),cavityGrout);
   float cavityRelief=.0018*cavitySkirt;
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 cavityDx=dFdx(-vViewPosition),cavityDy=dFdy(-vViewPosition);
   vec3 cavityR1=cross(cavityDy,normal),cavityR2=cross(normal,cavityDx);
   float cavityDet=dot(cavityDx,cavityR1);
   if(abs(cavityDet)>1.e-12)normal=normalize(abs(cavityDet)*normal-sign(cavityDet)*(dFdx(cavityRelief)*cavityR1+dFdy(cavityRelief)*cavityR2));
  `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.92,cavityGrout);').replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=cavityAO;');
 };
 material.customProgramCacheKey=()=>key+`-wall-cavity-r176:${storey}:${height}:${skirting}`;
 material.userData={...material.userData,architecturalInterior:true,wallCavity:{revision:176,storey,height,skirting,analytic:true}};return material;
}
