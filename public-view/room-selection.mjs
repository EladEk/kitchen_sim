import clipping from 'polygon-clipping';
// The placement domain describes free floor space. A visual room also needs
// its real bounding walls, including their thickness and small finish layers.
function dilate(polygons,distance){
 const shapes=polygons.map(p=>[p]);
 for(const p of polygons)for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]);if(!length)continue;
  const x=-(b[1]-a[1])/length*distance,z=(b[0]-a[0])/length*distance;
  shapes.push([[[a[0]+x,a[1]+z],[b[0]+x,b[1]+z],[b[0]-x,b[1]-z],[a[0]-x,a[1]-z]]]);
  shapes.push([[[a[0]-distance,a[1]-distance],[a[0]+distance,a[1]-distance],[a[0]+distance,a[1]+distance],[a[0]-distance,a[1]+distance]]]);
 }
 return clipping.union(...shapes);
}
export function createRoomFocus(context){
 if(!context?.selectedRoom)return null;
 const near=dilate(context.polygons,.65),bounds=near.flat(2),xs=bounds.map(p=>p[0]),zs=bounds.map(p=>p[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),walls=(context.displayWalls||context.walls).filter(p=>Math.min(...p.map(v=>v[0]))<=maxX&&Math.max(...p.map(v=>v[0]))>=minX&&Math.min(...p.map(v=>v[1]))<=maxZ&&Math.max(...p.map(v=>v[1]))>=minZ);
 const wallDomain=walls.length?clipping.intersection(near,clipping.union(...walls.map(p=>[p]))):[],displayDomain=wallDomain.length?clipping.union(context.domain,dilate(wallDomain.map(r=>r[0]),.025)):context.domain;
 return {...context.selectedRoom,polygons:context.polygons,displayDomain,building:context.scope.building,floor:context.scope.floor,unit:context.scope.unit};
}
