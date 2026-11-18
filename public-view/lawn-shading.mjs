// R180 lawn shading for the WebGL site material (WebGPU mirrors it in
// webgpu-finishes.mjs). A photographed lawn tiled every 2 m still reads as a
// flat painted carpet from the balcony: the eye finds the repeat and real
// turf has patchy macro variation (mowing, wear, sun/shade, drier spots).
// Two tricks, both a few ALU ops and one extra texture tap:
//  1. anti-tiling: a second, rotated, larger-scale sample of the same map is
//     blended in by low-frequency noise, so no repeat survives at distance;
//  2. macro breakup: two octaves of value noise (~3 m and ~11 m) shift
//     brightness and hue between lusher and drier green.
export const LAWN_NOISE_GLSL=`
float lawnHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float lawnNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
 return mix(mix(lawnHash(i),lawnHash(i+vec2(1,0)),f.x),mix(lawnHash(i+vec2(0,1)),lawnHash(i+vec2(1,1)),f.x),f.y);}
`;
export const LAWN_MAP_GLSL=`
#ifdef USE_MAP
 vec2 lawnUvB=mat2(.8,-.6,.6,.8)*vMapUv*.37+vec2(.31,.17);
 float lawnBlend=smoothstep(.3,.7,lawnNoise(vSiteXZ*.21));
 vec4 sampledDiffuseColor=mix(texture2D(map,vMapUv),texture2D(map,lawnUvB),lawnBlend);
 diffuseColor*=sampledDiffuseColor;
#endif
`;
export const LAWN_MACRO_GLSL=`
 float lawnPatch=lawnNoise(vSiteXZ*.33)*.65+lawnNoise(vSiteXZ*.09+7.3)*.35;
 float lawnDry=smoothstep(.62,.9,lawnNoise(vSiteXZ*.6+3.1));
 diffuseColor.rgb*=mix(.82,1.12,lawnPatch);
 diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(1.12,1.0,.78),lawnDry*.35);
`;
// Garden lawns (home-scene surface('grass')) are ordinary MeshStandardMaterials
// without the district site shader. installLawnShading chains the same
// anti-tiling + macro breakup onto any lawn material, keyed by world XZ so it
// is continuous with the public park lawns, and flags userData.lawnShading so
// the WebGPU adapter (webgpu-finishes.mjs) builds the matching TSL graph.
const installed=new WeakSet();
export function installLawnShading(material){
 if(!material||installed.has(material))return material;installed.add(material);
 material.userData.lawnShading=true;
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){
  before.call(this,shader,...args);
  shader.vertexShader='varying vec2 vSiteXZ;\n'+shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
  vec4 lawnVertex=vec4(transformed,1.0);
  #ifdef USE_INSTANCING
  lawnVertex=instanceMatrix*lawnVertex;
  #endif
  vSiteXZ=(modelMatrix*lawnVertex).xz;`);
  shader.fragmentShader='varying vec2 vSiteXZ;\n'+LAWN_NOISE_GLSL+shader.fragmentShader.replace('#include <map_fragment>',LAWN_MAP_GLSL).replace('#include <color_fragment>','#include <color_fragment>\n'+LAWN_MACRO_GLSL);
 };
 material.customProgramCacheKey=()=>key+'-lawn-r181';material.needsUpdate=true;return material;
}
