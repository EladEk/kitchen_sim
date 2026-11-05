// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z. A facade wall has
// independent finishes on its two broad faces; it is not one stone block.
export function wallExteriorFaces({centre,normal,thickness,inside,positiveFace=4,negativeFace=5,length=0,splitReturns=false,margin=.045}){
 const sample=(sign,offset)=>inside([centre[0]+normal[0]*sign*offset,centre[1]+normal[1]*sign*offset]);
 let positive=sample(1,thickness/2+margin),negative=sample(-1,thickness/2+margin);
 // Traced wall centrelines can differ from the envelope by a few centimetres.
 if(!positive&&!negative){positive=sample(1,thickness/2+Math.max(.16,margin));negative=sample(-1,thickness/2+Math.max(.16,margin));}
 const faces=Array(6).fill(false);faces[positiveFace]=!positive;faces[negativeFace]=!negative;
 // Exposed convex returns need the same stone. Opening reveals retain paint
 // whenever either side of the end leads into an occupied room.
 if(length>0&&(!positive||!negative)){
  const vertical=positiveFace===0,tangent=vertical?[-normal[1],normal[0]]:[normal[1],-normal[0]];
  for(const sign of [-1,1]){
   const end=centre.map((v,i)=>v+tangent[i]*sign*(length/2+Math.max(.035,margin)));
   const occupied=[-1,1].some(side=>inside(end.map((v,i)=>v+normal[i]*side*(thickness/2+.08))));
   if(!occupied)faces[vertical?(sign>0?4:5):(sign>0?0:1)]=true;
  }
 }
 if(splitReturns&&length>0){
  faces.positiveFace=positiveFace;faces.negativeFace=negativeFace;
  const tangent=positiveFace===0?[-normal[1],normal[0]]:[normal[1],-normal[0]];
  for(const [endIndex,endSign]of [[0,1],[1,-1]])for(const [sideIndex,side]of [[0,-1],[1,1]]){
   const offsets=[.055,Math.max(.055,margin*.5),Math.max(.055,margin)],widths=[.125,.25,.375];
   faces[6+endIndex*2+sideIndex]=offsets.some(offset=>widths.some(width=>!inside(centre.map((v,i)=>v+tangent[i]*endSign*(length/2+offset)+normal[i]*side*thickness*width))));
  }
 }
 return faces;
}
export function wallFaceMaterials(interior,exterior,faces){
 const materials=Array.isArray(interior)?[...interior]:Array(6).fill(interior),base=[...materials];
 for(let i=0;i<faces.length;i++){if(i>=materials.length)materials[i]=base[i%2?(faces.positiveFace??4):(faces.negativeFace??5)];if(faces[i])materials[i]=exterior;}
 return materials;
}
