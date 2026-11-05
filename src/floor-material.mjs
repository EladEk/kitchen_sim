import {Color,Vector2} from 'three';

// Optical values are rendering estimates, not manufacturer PBR data or
// measured grout specifications. Tile dimensions always come from the order.
export const FLOOR_RENDERING=Object.freeze({
 'dry-floor':Object.freeze({joint:.002,recess:.0004,bevel:.0006,grout:'#918a81',ior:1.48,specularIntensity:.42}),
 'wet-floor':Object.freeze({joint:.002,recess:.0004,bevel:.0005,grout:'#96918a',ior:1.48,specularIntensity:.55}),
 'shower-floor':Object.freeze({joint:.002,recess:.0004,bevel:.0005,grout:'#96918a',ior:1.48,specularIntensity:.45}),
 'terrace-floor':Object.freeze({joint:.003,recess:.0006,bevel:.0007,grout:'#88705b',ior:1.48,specularIntensity:.5})
});

export const FLOOR_SHADER_COMMON=/* glsl */`
uniform vec2 floorTileMetres;
uniform float floorQuarterTurns;
uniform float floorJointMetres;
uniform float floorRecessMetres;
uniform float floorBevelMetres;
uniform vec3 floorGroutColor;

mat2 floorTileRotation(vec2 cell) {
 float seed=fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);
 float turn=floor(seed*floorQuarterTurns);
 if(floorQuarterTurns<3.0) return turn<1.0?mat2(1.,0.,0.,1.):mat2(-1.,0.,0.,-1.);
 if(turn<1.0) return mat2(1.,0.,0.,1.);
 if(turn<2.0) return mat2(0.,1.,-1.,0.);
 if(turn<3.0) return mat2(-1.,0.,0.,-1.);
 return mat2(0.,-1.,1.,0.);
}

vec2 floorLineCoverage(vec2 distanceMetres,vec2 footprintMetres) {
 vec2 w=max(footprintMetres,vec2(.000001));
 float h=floorJointMetres*.5;
 // Integrate both edges across the pixel. A distant 2 mm joint covers only
 // its fraction of a pixel, rather than becoming a full one-pixel line.
 return clamp((h+w*.5-distanceMetres)/w,0.,1.)
       -clamp((-h+w*.5-distanceMetres)/w,0.,1.);
}
`;

export const FLOOR_MAP_FRAGMENT=/* glsl */`
#ifdef USE_MAP
 vec2 floorUV=vMapUv;
 vec2 floorLocal=fract(floorUV);
 mat2 floorTurn=floorTileRotation(floor(floorUV));
 vec2 floorSourceUV=vec2(.5)+floorTurn*(floorLocal-vec2(.5));
 // Differentiate the continuous metre grid, not the discontinuous fract UVs.
 vec2 floorDx=floorTurn*dFdx(floorUV),floorDy=floorTurn*dFdy(floorUV);
 vec4 sampledDiffuseColor=textureGrad(map,floorSourceUV,floorDx,floorDy);
 vec2 floorDistance=min(floorLocal,1.-floorLocal)*floorTileMetres;
 vec2 floorFootprint=fwidth(floorUV)*floorTileMetres;
 vec2 floorCoverage=floorLineCoverage(floorDistance,floorFootprint);
 float floorJoint=1.-(1.-floorCoverage.x)*(1.-floorCoverage.y);
 sampledDiffuseColor.rgb=mix(sampledDiffuseColor.rgb,floorGroutColor,floorJoint);
 diffuseColor*=sampledDiffuseColor;
 float floorEdge=min(floorDistance.x,floorDistance.y);
 float floorRelief=-floorRecessMetres*(1.-smoothstep(floorJointMetres*.5,
   floorJointMetres*.5+floorBevelMetres,floorEdge));
#endif
`;

export const FLOOR_NORMAL_FRAGMENT=/* glsl */`
#include <normal_fragment_maps>
#ifdef USE_MAP
 // Only joints have shallow relief. Printed light flecks are never turned
 // into holes or raised stone from an uncalibrated photograph.
 vec3 floorSigmaX=dFdx(-vViewPosition),floorSigmaY=dFdy(-vViewPosition);
 vec3 floorR1=cross(floorSigmaY,normal),floorR2=cross(normal,floorSigmaX);
 float floorDet=dot(floorSigmaX,floorR1);
 if(abs(floorDet)>1.e-12) {
  vec3 floorGradient=dFdx(floorRelief)*floorR1+dFdy(floorRelief)*floorR2;
  normal=normalize(abs(floorDet)*normal-sign(floorDet)*floorGradient);
 }
#endif
`;

export function installFloorMaterial(material,product){
 const profile=FLOOR_RENDERING[product.productId];if(!profile)return material;
 const uniforms={floorTileMetres:{value:new Vector2(...product.tile)},floorQuarterTurns:{value:Math.abs(product.tile[0]-product.tile[1])<.0001?4:2},floorJointMetres:{value:profile.joint},floorRecessMetres:{value:profile.recess},floorBevelMetres:{value:profile.bevel},floorGroutColor:{value:new Color(profile.grout)}};
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+FLOOR_SHADER_COMMON)
   .replace('#include <map_fragment>',FLOOR_MAP_FRAGMENT)
   .replace('#include <roughnessmap_fragment>',`float roughnessFactor=roughness;
#ifdef USE_ROUGHNESSMAP
 #ifdef USE_MAP
  roughnessFactor*=textureGrad(roughnessMap,floorSourceUV,floorDx,floorDy).g;
 #else
  roughnessFactor*=texture2D(roughnessMap,vRoughnessMapUv).g;
 #endif
#endif
#ifdef USE_MAP
roughnessFactor=mix(roughnessFactor,.98,floorJoint);
#endif`)
   .replace('#include <normal_fragment_maps>',FLOOR_NORMAL_FRAGMENT);
 };
 material.customProgramCacheKey=()=>`photographed-floor-r127:${product.productId}`;
 material.userData.floorRendering={revision:27,jointMetres:profile.joint,recessMetres:profile.recess,rotation:uniforms.floorQuarterTurns.value===4?'quarter-turns':'half-turns',mirrored:false,parametersInferred:true};
 return material;
}
