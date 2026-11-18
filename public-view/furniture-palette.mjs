import {FURNITURE_COLOURS} from '../src/furniture-colours.mjs';
export const FURNITURE_PALETTE={wood:'#aa9278',paint:'#e6decc',metal:'#435048',fabric:FURNITURE_COLOURS.upholstery,linen:FURNITURE_COLOURS.bedding,screen:'#192825',glass:'#8da5a0',countertop:'#d5c9b3'};
export const furniturePartColor=(item,part)=>item.color&&['wood','paint','fabric','linen'].includes(part.material)?item.color:FURNITURE_PALETTE[part.material];

export const furnitureMaterialProperties=kind=>kind==='glass'?{roughness:.08,metalness:0,transmission:.95,ior:1.5,thickness:.012,transparent:false,opacity:1}:kind==='metal'?{roughness:.28,metalness:.92,anisotropy:.45,anisotropyRotation:.25}:{roughness:.65,metalness:0};
