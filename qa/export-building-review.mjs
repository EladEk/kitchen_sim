// Export the actual scene geometry for a native depth-buffer review when the
// managed browser has WebGL disabled. No substitute building is reconstructed.
import * as THREE from 'three';
import {writeFileSync} from 'node:fs';
import {buildBuildingContext} from '../src/building-scene.js';
import {normalizeHomeSettings} from '../src/home-model.mjs';
const prefix=process.argv[2];if(!prefix)throw Error('Pass an output prefix outside the checkout');
const root=new THREE.Group(),resources=[];buildBuildingContext({group:root,resources,settings:normalizeHomeSettings({buildingLevel:9,cutaway:false,furniture:false}),mode:'building'});root.updateMatrixWorld(true);
const chunks=[],matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3(),p=new THREE.Vector3(),n=new THREE.Vector3();let vertices=0;
root.traverse(o=>{if(!o.isMesh||!o.visible||!o.geometry.attributes.normal)return;const g=o.geometry,pos=g.attributes.position,norm=g.attributes.normal,index=g.index,count=index?index.count:pos.count,instances=o.isInstancedMesh?o.count:1,material=Array.isArray(o.material)?o.material[0]:o.material;if(!material?.color)return;
 for(let instance=0;instance<instances;instance++){if(o.isInstancedMesh){o.getMatrixAt(instance,matrix);matrix.premultiply(o.matrixWorld);}else matrix.copy(o.matrixWorld);normalMatrix.getNormalMatrix(matrix);const data=new Float32Array(count*9);for(let j=0;j<count;j++){const i=index?index.getX(j):j;p.fromBufferAttribute(pos,i).applyMatrix4(matrix);n.fromBufferAttribute(norm,i).applyNormalMatrix(normalMatrix);data.set([...p,...n,material.color.r,material.color.g,material.color.b],j*9);}chunks.push(Buffer.from(data.buffer));vertices+=count;}
});
writeFileSync(prefix+'.bin',Buffer.concat(chunks));
const target=new THREE.Vector3(11.7,13,-4),cameras={};for(const [name,d] of Object.entries({east:[1,.16,.26],south:[.16,.20,1],north:[-.18,.20,-1],west:[-1,.18,-.25]})){const c=new THREE.PerspectiveCamera(42,1,.1,200);c.position.copy(target).add(new THREE.Vector3(...d).normalize().multiplyScalar(76));c.lookAt(target);c.updateMatrixWorld(true);cameras[name]=new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse).elements;}
if(process.argv.includes('--balcony-closeups'))for(const [name,at,eye]of [['south-balcony-2',[4.3,7.3,13],[12,11,22]],['south-balcony-6',[2.4,19.8,13],[11,24,24]],['north-terrace-6',[-1.5,19.8,-21.5],[-13,24,-32]],['south-service',[11.7,12,8.5],[21,16,27]],['east-upper-terrace',[19,22.8,-5],[30,29,3]]]){const c=new THREE.PerspectiveCamera(43,1,.1,150);c.position.set(...eye);c.lookAt(...at);c.updateMatrixWorld(true);cameras[name]=new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse).elements;}
if(process.argv.includes('--upper-ensuite-closeups'))for(const [name,at,eye]of [['west-upper-terrace',[5,24.2,-6],[-18,34,12]],['west-upper-door',[6.5,25.7,-4.6],[-2,29.2,-1]]]){const c=new THREE.PerspectiveCamera(43,1,.1,150);c.position.set(...eye);c.lookAt(...at);c.updateMatrixWorld(true);cameras[name]=new THREE.Matrix4().multiplyMatrices(c.projectionMatrix,c.matrixWorldInverse).elements;}
writeFileSync(prefix+'.json',JSON.stringify({vertices,cameras,note:'Actual scene geometry; native review uses flat material colours and simple lighting, without the browser material effects.'}));resources.forEach(r=>r.dispose?.());console.log(JSON.stringify({vertices}));
