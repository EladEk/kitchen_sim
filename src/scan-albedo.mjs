// Preserve the selected finish's mean linear colour while retaining the scan's
// measured local grain. The same correction applies to JPEG and GPU-compressed
// maps, without decoding a compressed texture into a canvas.
export function installScanAlbedo(material,mean){
 if(!mean?.every(v=>Number.isFinite(v)&&v>0))return;
 const gain=mean.map(v=>1/v),before=material.onBeforeCompile,key=material.customProgramCacheKey();
 material.userData.scanAlbedoGain=gain;
 material.onBeforeCompile=function(shader,...args){before.call(this,shader,...args);shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>\n diffuseColor.rgb*=vec3(${gain.map(v=>v.toFixed(8)).join(',')});`);};
 material.customProgramCacheKey=()=>key+':scan-albedo-r127:'+gain.join(',');
}
