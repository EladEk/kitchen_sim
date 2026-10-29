// Public-safe metric UV geometry; no product, document or apartment data.
export function metricSurfaceUVs(geometry,origin=[0,0,0]){
 const position=geometry.attributes.position,normal=geometry.attributes.normal,uv=geometry.attributes.uv;
 if(!uv||!normal)return geometry;
 for(let i=0;i<uv.count;i++){
  const x=position.getX(i)+origin[0],y=position.getY(i)+origin[1],z=position.getZ(i)+origin[2],nx=Math.abs(normal.getX(i)),ny=Math.abs(normal.getY(i)),nz=Math.abs(normal.getZ(i));
  if(ny>nx&&ny>nz)uv.setXY(i,x,z);else if(nx>nz)uv.setXY(i,z,y);else uv.setXY(i,x,y);
 }
 uv.needsUpdate=true;geometry.userData.metricUVs=true;return geometry;
}
