import * as THREE from 'three';

const wallParts=new Set(['building-facade-wall','building-interior-wall','ground-base-wall','architectural-wall','building-balcony-grey-returns']);
const furnitureParts=new Map([['apartment-desk-body','desk'],['apartment-dining-body','dining'],['apartment-chair-body','chair'],['apartment-wardrobe-body','wardrobe'],['apartment-bed-frame','bed'],['apartment-sofa-base','sofa'],['apartment-coffee-top','coffee'],['apartment-media-cabinet','media'],['apartment-kitchen-base','kitchen'],['apartment-wc-body','wc'],['apartment-basin-cabinet','basin'],['apartment-shower-tray','shower'],['apartment-fridge-body','fridge'],['apartment-laundry-body','laundry'],['apartment-bathtub-bottom','bathtub'],['apartment-bathtub-end','bathtub'],['apartment-bathtub-side','bathtub']]);
const round=n=>Math.round(n*1000)/1000;
export function convexHull(points){
 const sorted=[...new Map(points.map(p=>[p.map(round).join(','),p.map(round)])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
 if(sorted.length<3)return sorted;
 const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]),half=values=>{const out=[];for(const p of values){while(out.length>1&&cross(out.at(-2),out.at(-1),p)<=0)out.pop();out.push(p);}return out;};
 const lower=half(sorted),upper=half([...sorted].reverse());return [...lower.slice(0,-1),...upper.slice(0,-1)];
}

// Project only selected architectural primitives. Runs once during export (or
// once for a supplied variant), never in the animation or position-update loop.
export function meshFootprints(mesh,{cut=null,elevation=0}={}){
 if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;if(!box||box.isEmpty())return [];
 const local=new THREE.Matrix4(),matrix=new THREE.Matrix4(),p=new THREE.Vector3(),out=[];
 for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
  matrix.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(i,local);matrix.multiply(local);}
  const points=[];let low=Infinity,high=-Infinity;
  for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){p.set(x,y,z).applyMatrix4(matrix);low=Math.min(low,p.y);high=Math.max(high,p.y);points.push([p.x,p.z]);}
  if(cut!==null?(low>cut+.001||high<cut-.001):(low<elevation-.15||low>elevation+1.6||high<elevation+.02))continue;
  const polygon=convexHull(points);if(polygon.length>=3)out.push(polygon);
 }
 return out;
}

export function extractFloorMap(root,{elevation=0,wall=o=>wallParts.has(o.userData.part),furniture=o=>furnitureParts.get(o.userData.part),motions=null}={}){
 root.updateWorldMatrix(true,true);const walls=[],items=[],doors=[],cut=elevation+1.05;
 root.traverse(o=>{if(!o.isMesh)return;if(wall(o))walls.push(...meshFootprints(o,{cut}));const kind=furniture(o);if(kind)for(const polygon of meshFootprints(o,{elevation}))items.push({kind,polygon});});
 const moving=motions||[];if(!motions)root.traverse(object=>{const d=object.userData.tourDoor;if(d)moving.push({object,...d});});
 for(const m of moving){const {object,axis,property}=m,previous=object[axis][property];
  function pose(value){object[axis][property]=value;object.updateWorldMatrix(true,true);const polygons=[];object.traverse(o=>{if(o.isMesh)polygons.push(...meshFootprints(o,{cut}));});return convexHull(polygons.flat());}
  try{const closed=pose(m.closed),open=pose(m.open);if(closed.length>=3&&open.length>=3)doors.push({id:m.id,kind:m.kind||'interior',closed,open,defaultOpen:!!m.defaultOpen});}
  finally{object[axis][property]=previous;object.updateWorldMatrix(true,true);}
 }
 return {walls,furniture:items,doors};
}
