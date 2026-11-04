// Live source references stay outside serializable scene metadata.
const sources=new WeakMap();
export const bindTraditionalMaterial=(node,source)=>sources.set(node,source);
export const traditionalMaterial=material=>sources.get(material)||material;
