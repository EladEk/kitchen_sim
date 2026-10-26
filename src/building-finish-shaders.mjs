// Public-safe architectural finishes; no apartment or owner data.
export function installStoneCourses(limestone){
  limestone.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvec4 bw=vec4(transformed,1.0);\n#ifdef USE_INSTANCING\nbw=instanceMatrix*bw;\n#endif\nvBuildingWorld=(modelMatrix*bw).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vBuildingWorld;').replace('#include <color_fragment>',`#include <color_fragment>
    float course=floor(vBuildingWorld.y/.48);
    vec3 n=normalize(cross(dFdx(vBuildingWorld),dFdy(vBuildingWorld)));
    float horizontal=abs(n.x)>abs(n.z)?vBuildingWorld.z:vBuildingWorld.x;
    float row=abs(fract(vBuildingWorld.y/.48+.5)-.5)*.48;
    float col=abs(fract((horizontal+mod(course,2.0)*.46)/.94+.5)-.5)*.94;
    float aa=max(fwidth(horizontal),fwidth(vBuildingWorld.y));
    float joint=max(1.0-smoothstep(.0015,.0025+aa,row),1.0-smoothstep(.001,.002+aa,col));
    vec2 stoneId=vec2(floor((horizontal+mod(course,2.0)*.46)/.94),course);
    float variation=fract(sin(dot(stoneId,vec2(127.1,311.7)))*43758.5453);
    float grain=sin(horizontal*41.0+sin(vBuildingWorld.y*27.0))*sin(vBuildingWorld.y*57.0)*.004;
    diffuseColor.rgb*=mix(.945+variation*.085+grain,.79,joint*.65);
   `);
  };limestone.customProgramCacheKey=()=> 'building-stone-courses-r75';

}
export function installFloorCourses(interiorFloor){
  interiorFloor.onBeforeCompile=shader=>{
   shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;').replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvInteriorWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
   shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vInteriorWorld;').replace('#include <color_fragment>',`#include <color_fragment>
    vec2 tileEdge=(.5-abs(fract(vInteriorWorld.xz/.8)-.5))*.8;
    float aa=max(fwidth(vInteriorWorld.x),fwidth(vInteriorWorld.z));
    float grout=1.0-smoothstep(.0008,.0015+aa,min(tileEdge.x,tileEdge.y));
    float speckle=sin(vInteriorWorld.x*63.0+sin(vInteriorWorld.z*31.0))*sin(vInteriorWorld.z*57.0)*.004;
    diffuseColor.rgb*=mix(vec3(1.0+speckle),vec3(.77),grout*.6);
   `);
  };interiorFloor.customProgramCacheKey=()=> 'building-neutral-floor-r48';

}
