// BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z. A facade wall has
// independent finishes on its two broad faces; it is not one stone block.
export function wallExteriorFaces({centre,normal,thickness,inside,positiveFace=4,negativeFace=5}){
 const sample=(sign,offset)=>inside([centre[0]+normal[0]*sign*offset,centre[1]+normal[1]*sign*offset]);
 let positive=sample(1,thickness/2+.045),negative=sample(-1,thickness/2+.045);
 // Traced wall centrelines can differ from the envelope by a few centimetres.
 if(!positive&&!negative){positive=sample(1,thickness/2+.16);negative=sample(-1,thickness/2+.16);}
 const faces=Array(6).fill(false);faces[positiveFace]=!positive;faces[negativeFace]=!negative;return faces;
}
export function wallFaceMaterials(interior,exterior,faces){
 const materials=Array.isArray(interior)?[...interior]:Array(6).fill(interior);
 for(let i=0;i<6;i++)if(faces[i])materials[i]=exterior;
 return materials;
}
