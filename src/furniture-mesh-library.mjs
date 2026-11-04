// An optional high-detail component library. The deterministic low tier is
// available immediately and remains the fallback if a model cannot load.
let meshes=null;
export function bindFurnitureMeshLibrary(value){meshes=value;return()=>{if(meshes===value)meshes=null;};}
export function detailedFurnitureGeometry(kind,w,h,d){const source=meshes?.get(kind);return source?source.clone().scale(w,h,d):null;}
