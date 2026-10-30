import {BufferAttribute} from 'three';

// Positions and indices stay exact. Only shading attributes are quantized;
// tiled/world UVs outside [0,1] retain their original floating-point range.
export function compactRenderAttributes(geometry){
 for(const [name,Type,scale] of [['normal',Int16Array,32767],['uv',Uint16Array,65535]]){
  const attribute=geometry.getAttribute(name);
  if(!attribute||attribute.isInterleavedBufferAttribute||attribute.normalized||!(attribute.array instanceof Float32Array))continue;
  if(!attribute.array.every(v=>Number.isFinite(v)&&v>=(name==='normal'?-1:0)&&v<=1))continue;
  const packed=new Type(attribute.array.length);
  for(let i=0;i<packed.length;i++)packed[i]=Math.round(attribute.array[i]*scale);
  geometry.setAttribute(name,new BufferAttribute(packed,attribute.itemSize,true));
 }
 return geometry;
}
