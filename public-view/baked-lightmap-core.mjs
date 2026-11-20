import * as THREE from 'three';
// R188: shared helpers for the Blender-baked lightmap pilot (scripts/lightmaps).
export const insidePolygon=([x,z],poly)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,zi]=poly[i],[xj,zj]=poly[j];if(zi>z!==zj>z&&x<(xj-xi)*(z-zi)/(zj-zi)+xi)c=!c;}return c;};
// Model-space bbox (cm) + vertex count: stable across baseline rebuilds.
export const meshKey=(box,count)=>[...box.min.toArray(),...box.max.toArray()].map(v=>Math.round(v*100)).join(',')+':'+count;
// Receivers: the apartment's own floors, ceilings and plaster walls (pilot; tile
// and section-cap overlays stay unbaked) whose
// centre lies inside (or on the edge of) the unit polygon on that storey.
export function isLightmapReceiver(object,box,polygon,elevation){
 const md=object.material?.userData||{},ud=object.userData||{};if(ud.exterior&&md.architecturalRole==='facade')return false;
 const kind=md.surfaceKind,role=md.architecturalRole;if(ud.tourNonPhysical)return false;if(!(role==='floor'||role==='ceiling'||kind==='plaster'))return false;
 const cx=(box.min.x+box.max.x)/2,cz=(box.min.z+box.max.z)/2,cy=(box.min.y+box.max.y)/2;if(cy<elevation-.3||cy>elevation+3.2)return false;
 const probe=[[0,0],[.08,0],[-.08,0],[0,.08],[0,-.08]];return probe.some(([dx,dz])=>insidePolygon([cx+dx,cz+dz],polygon));
}
export const BAKED_FILL_SCALE=Object.freeze({bounce:.5,walls:.5,grazing:.45});
export function bakedCoverage(location,bakes){return !!location&&bakes.some(b=>b.floor===location.floor&&b.unit===location.unit);}
export function applyBakedUVs(root,receivers,{level=0}={}){
 root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),matched=[];const box=new THREE.Box3(),m=new THREE.Matrix4();
 root.traverse(o=>{if(!o.isMesh||o.isInstancedMesh||o.userData.bakedLightmap)return;let l=null;for(let p=o;p&&l===null;p=p.parent)if(p.userData?.level!==undefined)l=p.userData.level;if(l!==level)return;
  const g=o.geometry;if(!g?.attributes?.position)return;if(!g.boundingBox)g.computeBoundingBox();m.multiplyMatrices(inverse,o.matrixWorld);box.copy(g.boundingBox).applyMatrix4(m);
  const uv=receivers[meshKey(box,g.attributes.position.count)];if(!uv)return;const flat=g.index?g.toNonIndexed():g.clone();if(flat.attributes.position.count*2!==uv.length){flat.dispose();return;}
  flat.setAttribute('uv1',new THREE.Float32BufferAttribute(uv,2));o.geometry=flat;o.userData.bakedLightmap=188;matched.push(o);});
 return matched;
}
