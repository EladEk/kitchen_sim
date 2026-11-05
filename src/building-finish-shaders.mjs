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
    float col=abs(fract((horizontal+mod(course,2.0)*.46)/.94+.5)-.5)*.94;
    float aa=max(fwidth(horizontal),fwidth(vBuildingWorld.y));
    float rowCoverage=finishGridCoverage(row,fwidth(vBuildingWorld.y),.002,.48);
    float colCoverage=finishGridCoverage(col,fwidth(horizontal),.002,.94);
    float joint=1.0-(1.0-rowCoverage)*(1.0-colCoverage);
    vec2 stoneId=vec2(floor((horizontal+mod(course,2.0)*.46)/.94),course);
    vec3 stoneHash=fract(vec3(stoneId.xyx)*.1031);
    stoneHash+=dot(stoneHash,stoneHash.yzx+33.33);
    float variation=fract((stoneHash.x+stoneHash.y)*stoneHash.z);
    float grain=sin(horizontal*41.0+sin(vBuildingWorld.y*27.0))*sin(vBuildingWorld.y*57.0)*.004;
    float base=mix(1.,.9875+variation*.025,1.0-smoothstep(.12,.8,aa));
    diffuseColor.rgb*=mix(base+grain*(1.0-smoothstep(.003,.03,aa)),.82,joint*.90);
    float stoneRelief=-.00045*joint*(1.0-smoothstep(.003,.04,aa));
   `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 stoneDx=dFdx(-vViewPosition),stoneDy=dFdy(-vViewPosition);
    vec3 stoneR1=cross(stoneDy,normal),stoneR2=cross(normal,stoneDx);
    float stoneDet=dot(stoneDx,stoneR1);
    if(abs(stoneDet)>1.e-12)normal=normalize(abs(stoneDet)*normal-sign(stoneDet)*(dFdx(stoneRelief)*stoneR1+dFdy(stoneRelief)*stoneR2));
   `);
  };limestone.customProgramCacheKey=()=> 'building-stone-courses-r132';

}
export function installFloorCourses(interiorFloor,{tile=[.8,.8],joint=.004}={}){
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
    float tileRelief=-.00065*(1.-smoothstep(${(joint/2).toFixed(5)},${(joint/2+.0012).toFixed(5)},tileEdgeDistance));
    float speckle=sin(vInteriorWorld.x*63.0+sin(vInteriorWorld.z*31.0))*sin(vInteriorWorld.z*57.0)*.014;
    diffuseColor.rgb*=mix(vec3(.985+tileVariation*.025+speckle*(1.0-smoothstep(.003,.03,aa))),vec3(.62),grout*.9);
   `).replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    roughnessFactor=mix(mix(.50,.62,tileVariation),.92,grout);
   `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec3 tileSigmaX=dFdx(-vViewPosition),tileSigmaY=dFdy(-vViewPosition);
    vec3 tileR1=cross(tileSigmaY,normal),tileR2=cross(normal,tileSigmaX);
    float tileDet=dot(tileSigmaX,tileR1);
    if(abs(tileDet)>1.e-12)normal=normalize(abs(tileDet)*normal-sign(tileDet)*(dFdx(tileRelief)*tileR1+dFdy(tileRelief)*tileR2));
   `);
  };interiorFloor.customProgramCacheKey=()=> `building-neutral-floor-r113:${tile}:${joint}`;
  interiorFloor.userData.architecturalInterior=true;

}

// Analytic floor/ceiling contact on wall faces. No screen-space pass or extra
// geometry; it works in stereo. This is shaded relief, not a new silhouette.
export function installWallCavity(material,{storey=0,height=2.75,skirting=.075}={}){
 if(material.userData.wallCavity)return material;
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
   float cavityBase=1.-smoothstep(.015,.16,max(0.,cavityHeight));
   float cavityTop=1.-smoothstep(.015,.12,abs(${height.toFixed(4)}-cavityHeight));
   float cavityAO=1.-cavityWall*(.18*cavityBase+.10*cavityTop);
   float cavitySkirt=(1.-smoothstep(${skirting.toFixed(4)},${(skirting+.0015).toFixed(4)},cavityHeight))*step(-.005,cavityHeight)*cavityWall;
   diffuseColor.rgb*=mix(1.,1.035,cavitySkirt);
   float cavityRelief=.0018*cavitySkirt;
  `).replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 cavityDx=dFdx(-vViewPosition),cavityDy=dFdy(-vViewPosition);
   vec3 cavityR1=cross(cavityDy,normal),cavityR2=cross(normal,cavityDx);
   float cavityDet=dot(cavityDx,cavityR1);
   if(abs(cavityDet)>1.e-12)normal=normalize(abs(cavityDet)*normal-sign(cavityDet)*(dFdx(cavityRelief)*cavityR1+dFdy(cavityRelief)*cavityR2));
  `).replace('#include <aomap_fragment>','#include <aomap_fragment>\nreflectedLight.indirectDiffuse*=cavityAO;');
 };
 material.customProgramCacheKey=()=>key+`-wall-cavity-r112:${storey}:${height}:${skirting}`;
 material.userData={...material.userData,architecturalInterior:true,wallCavity:{revision:112,storey,height,skirting,analytic:true}};return material;
}
