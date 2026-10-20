import * as THREE from 'three';

// VR001221 is explicitly labelled in Harash catalogue page 39. Its silhouette
// and brushed finish follow that image; dimensions are not provided there.
export const VERED_TAP={productId:'kitchen-tap',sku:'VR001221',cataloguePage:39,height:.39,reach:.205,dimensionsInferred:true};
export function createVeredKitchenTap(resources){
 const group=new THREE.Group();group.userData={...VERED_TAP,shapeBasis:'catalog-product-image'};
 const steel=new THREE.MeshStandardMaterial({color:'#b5bdb7',metalness:.8,roughness:.38}),dark=new THREE.MeshStandardMaterial({color:'#4d5852',roughness:.65});resources.push(steel,dark);
 const add=(g,part,material=steel)=>{resources.push(g);const mesh=new THREE.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData={id:'sink',...VERED_TAP,part};group.add(mesh);return mesh;};
 const cylinder=(r1,r2,h,x,y,z,part,material=steel)=>{const g=new THREE.CylinderGeometry(r1,r2,h,32);g.translate(x,y,z);return add(g,part,material);};
 cylinder(.027,.027,.009,0,.0045,0,'tap-base');cylinder(.016,.024,.135,0,.076,0,'tap-body');
 const points=[[0,.14,0],[0,.285,0],[0,.365,.026],[0,.385,.095],[0,.35,.171],[0,.278,.205]],curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(curve,48,.011,12,false),'tap-gooseneck');
 const head=cylinder(.0145,.0155,.063,0,0,0,'tap-pullout-head');head.rotation.x=-.36;head.position.set(0,.251,.214);
 const aerator=cylinder(.011,.011,.003,0,0,0,'tap-aerator',dark);aerator.rotation.copy(head.rotation);aerator.position.copy(head.position).add(new THREE.Vector3(0,-.031,.012));
 const control=cylinder(.017,.017,.047,0,0,0,'tap-side-control');control.rotation.z=Math.PI/2;control.position.set(.032,.05,0);
 cylinder(.005,.005,.09,.055,.112,0,'tap-side-lever');
 return group;
}
