import * as THREE from 'three';
// Low-resolution daylight reflection probe; no external or personal images.
export function daylightEnvironment(renderer){
 const width=128,height=64,data=new Float32Array(width*height*4);
 const sky=new THREE.Color('#b1c7e1'),horizon=new THREE.Color('#e5e3dc'),ground=new THREE.Color('#847c68');
 for(let y=0;y<height;y++){const t=y/(height-1),c=t<.5?sky.clone().lerp(horizon,Math.pow(t*2,2)):horizon.clone().lerp(ground,Math.min(1,(t-.5)*5));
 for(let x=0;x<width;x++){const i=(y*width+x)*4;data.set([c.r,c.g,c.b,1],i);}}
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(source);source.dispose();generator.dispose();return target;
}
