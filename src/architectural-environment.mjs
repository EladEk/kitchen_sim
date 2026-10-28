import * as THREE from 'three';
// Linear HDR sky, independent of private photos and external network requests.
export function architecturalEnvironment(renderer){
 const width=512,height=256,data=new Float32Array(width*height*4),sun=new THREE.Vector3(-35,65,25).normalize();
 const zenith=new THREE.Color('#89b0db'),horizon=new THREE.Color('#e1e3df'),ground=new THREE.Color('#8c8678');
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const theta=(y+.5)/height*Math.PI,phi=(x+.5)/width*Math.PI*2,up=Math.cos(theta),dir=new THREE.Vector3(-Math.sin(theta)*Math.cos(phi),up,Math.sin(theta)*Math.sin(phi));
  const c=up>=0?horizon.clone().lerp(zenith,Math.pow(up,.55)):horizon.clone().lerp(ground,Math.min(1,-up*5));
  const cloud=up>0?Math.pow(Math.max(0,Math.sin(phi*3.1+up*8)*Math.sin(phi*7.3-up*11)),5)*.12:0;
  const glow=Math.pow(Math.max(0,dir.dot(sun)),64)*1.4+Math.pow(Math.max(0,dir.dot(sun)),1800)*8;
  data.set([c.r+cloud+glow,c.g+cloud+glow*.88,c.b+cloud+glow*.7,1],(y*width+x)*4);
 }
 const source=new THREE.DataTexture(data,width,height,THREE.RGBAFormat,THREE.FloatType);source.mapping=THREE.EquirectangularReflectionMapping;source.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(source);source.dispose();generator.dispose();return target;
}
