// Instanced walls and furniture share unit cubes. Use their physical scale
// for texture coordinates so cloth/wood detail does not stretch with a panel.
export function installBuildingSurfaceUVs(material){
 if(material.userData.metricInstancedUVs)return material;
 if(!material.map&&!material.bumpMap&&!material.normalMap&&!material.roughnessMap)return material;
 const before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.onBeforeCompile=function(shader,...args){before.call(this,shader,...args);shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>
  vec3 metricPosition=position;
  #ifdef USE_INSTANCING
   metricPosition*=vec3(length(instanceMatrix[0].xyz),length(instanceMatrix[1].xyz),length(instanceMatrix[2].xyz));
  #else
   metricPosition*=vec3(length(modelMatrix[0].xyz),length(modelMatrix[1].xyz),length(modelMatrix[2].xyz));
  #endif
  vec3 metricNormal=abs(normal);
  vec2 metricUv=metricNormal.y>metricNormal.x&&metricNormal.y>metricNormal.z?metricPosition.xz:metricNormal.x>metricNormal.z?metricPosition.zy:metricPosition.xy;
  #ifdef USE_MAP
   vMapUv=(mapTransform*vec3(metricUv,1.0)).xy;
  #endif
  #ifdef USE_BUMPMAP
   vBumpMapUv=(bumpMapTransform*vec3(metricUv,1.0)).xy;
  #endif
  #ifdef USE_ROUGHNESSMAP
   vRoughnessMapUv=(roughnessMapTransform*vec3(metricUv,1.0)).xy;
  #endif
  #ifdef USE_NORMALMAP
   vNormalMapUv=(normalMapTransform*vec3(metricUv,1.0)).xy;
  #endif
 `);};
 material.customProgramCacheKey=()=>key+'-building-metric-surfaces-r104';material.userData={...material.userData,metricInstancedUVs:true};return material;
}
