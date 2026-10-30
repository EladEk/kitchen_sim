import * as THREE from 'three';

// Build-time generic door metadata: only an ID and two physical poses survive
// the public export. Original inspection notes and owner settings do not.
export function markPublicDoor(root,{id,axis='rotation',property='y',closed=0,open,defaultOpen=true,level=0,kind='interior'}){
 root.userData={...root.userData,level,tourMotionId:'public:'+id,tourDoor:{id,axis,property,closed,open,defaultOpen,kind}};
 root.traverse(o=>{o.userData={...o.userData,action:'district-door',doorId:id};});return root;
}
export function wrapPublicDoor(parent,leaves,{door,level,base,opened,kind}){
 const a=door.closed.map((n,i)=>n-door.hinge[i]),b=door.opened.map((n,i)=>n-door.hinge[i]);
 const angle=Math.atan2(a[1]*b[0]-a[0]*b[1],a[0]*b[0]+a[1]*b[1]);
 const pivot=new THREE.Group();pivot.position.set(door.hinge[0],base,door.hinge[1]);pivot.rotation.y=opened?angle:0;parent.add(pivot);parent.updateWorldMatrix(true,true);
 for(const leaf of leaves.filter(Boolean))pivot.attach(leaf);
 return markPublicDoor(pivot,{id:door.id,open:angle,defaultOpen:opened,level,kind});
}
