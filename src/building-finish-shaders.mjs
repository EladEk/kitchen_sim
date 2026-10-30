// Public-safe architectural finishes; no apartment or owner data.
export const FINISH_GRID_GLSL=`
float finishGridCoverage(float distanceMetres,float footprint,float halfJoint,float period) {
 float w=max(footprint,.000001);
 float c=clamp((halfJoint+w*.5-distanceMetres)/w,0.,1.)-clamp((-halfJoint+w*.5-distanceMetres)/w,0.,1.);
 return mix(c,halfJoint*2./period,smoothstep(period*.35,period,w));
}
`;
export function installStoneCourses(limestone){
  limestone.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 bw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nbw=instanceMatrix*bw;\n#endif\nvBuildingWorld=(modelMatrix*bw).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;\n'+FINISH_GRID_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
    float course=floor(vBuildingWorld.y/.48);
    vec3 n=normalize(cross(dFdx(vBuildingWorld),dFdy(vBuildingWorld)));
    float horizontal=abs(n.x)>abs(n.z)?vBuildingWorld.z:vBuildingWorld.x;
    float row=abs(fract(vBuildingWorld.y/.48+.5)-.5)*.48;
    float col=abs(fract((horizontal+mod(course,2.0)*.46)/.94+.5)-.5)*.94;
    float aa=max(fwidth(horizontal),fwidth(vBuildingWorld.y));
    float rowCoverage=finishGridCoverage(row,fwidth(vBuildingWorld.y),.0015,.48);
    float colCoverage=finishGridCoverage(col,fwidth(horizontal),.001,.94);
    float joint=1.0-(1.0-rowCoverage)*(1.0-colCoverage);
    vec2 stoneId=vec2(floor((horizontal+mod(course,2.0)*.46)/.94),course);
    float variation=fract(sin(dot(stoneId,vec2(127.1,311.7)))*43758.5453);
    float grain=sin(horizontal*41.0+sin(vBuildingWorld.y*27.0))*sin(vBuildingWorld.y*57.0)*.004;
    float base=mix(.9875,.945+variation*.085,1.0-smoothstep(.12,.8,aa));
    diffuseColor.rgb*=mix(base+grain*(1.0-smoothstep(.003,.03,aa)),.79,joint*.65);
   `);
  };limestone.customProgramCacheKey=()=> 'building-stone-courses-r96';

}
export function installFloorCourses(interiorFloor){
  interiorFloor.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 interiorVertex=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\ninteriorVertex=instanceMatrix*interiorVertex;\n#endif\nvInteriorWorld=(modelMatrix*interiorVertex).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;\n'+FINISH_GRID_GLSL).replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tileEdge=(.5-abs(fract(vInteriorWorld.xz/.8)-.5))*.8;
    float aa=max(fwidth(vInteriorWorld.x),fwidth(vInteriorWorld.z));
    float gx=finishGridCoverage(tileEdge.x,fwidth(vInteriorWorld.x),.001,.8);
    float gz=finishGridCoverage(tileEdge.y,fwidth(vInteriorWorld.z),.001,.8);
    float grout=1.0-(1.0-gx)*(1.0-gz);
    float speckle=sin(vInteriorWorld.x*63.0+sin(vInteriorWorld.z*31.0))*sin(vInteriorWorld.z*57.0)*.004;
    diffuseColor.rgb*=mix(vec3(1.0+speckle*(1.0-smoothstep(.003,.03,aa))),vec3(.77),grout*.6);
   `);
  };interiorFloor.customProgramCacheKey=()=> 'building-neutral-floor-r96';

}
