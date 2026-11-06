export const FURNITURE_PALETTE={wood:'#aa9278',paint:'#e6decc',metal:'#435048',fabric:'#bba991',linen:'#e0d3bc',screen:'#192825',glass:'#8da5a0',countertop:'#d5c9b3'};
export const furniturePartColor=(item,part)=>item.color&&['wood','paint','fabric','linen'].includes(part.material)?item.color:FURNITURE_PALETTE[part.material];

export const furnitureMaterialProperties=kind=>({roughness:kind==='glass'?.12:kind==='metal'?.45:.82,metalness:kind==='glass'?.08:kind==='metal'?.35:0,...(kind==='glass'?{transparent:true,opacity:.34,depthWrite:false}:{})});
