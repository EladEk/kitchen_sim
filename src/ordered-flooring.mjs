import {productById} from './home-products.mjs';
import {FLOOR_PHOTO} from './owner-product-references.mjs';
import {cataloguePhoto} from './harash-catalog.mjs';
import {orderedFinishForRoom} from './home-finish-schedule.mjs';

// The owner's Harash order is authoritative. These material definitions are
// isolated from the generated interior atlas: a generic bitmap must never
// replace the selected product. MI402439 now uses the owner's photographed
// sample. Matched wet/exterior finishes use native catalogue product images.
const definitions={
 'dry-floor':{kind:'porcelain',pattern:'owner-photo',color:'#a39b93',roughness:.72,bumpScale:0,photo:FLOOR_PHOTO},
 'wet-floor':{kind:'cement',pattern:'catalogue',color:'#b6afa8',roughness:.9,bumpScale:0,photo:cataloguePhoto('wet-floor')},
 'shower-floor':{kind:'cement',pattern:'catalogue',color:'#b6afa8',roughness:.97,bumpScale:0,photo:cataloguePhoto('shower-floor')},
 'terrace-floor':{kind:'terrace',pattern:'catalogue',color:'#aa8769',roughness:.86,bumpScale:0,photo:cataloguePhoto('terrace-floor')},
 'wet-wall':{kind:'cement',pattern:'catalogue',color:'#b2ada9',roughness:.82,bumpScale:0,tile:[.75,.25],photo:cataloguePhoto('wet-wall')}
};
export const ORDERED_SURFACES=Object.fromEntries(Object.entries(definitions).map(([id,definition])=>{
 const p=productById(id);
 return [id,Object.freeze({...definition,productId:id,sku:p.sku,tile:definition.tile||p.dimensions,source:p.source,page:p.page,textureBasis:definition.photo?.textureBasis||'order-description',manufacturerScan:false})];
}));
export const ORDERED_FLOORS=Object.fromEntries(Object.entries(ORDERED_SURFACES).filter(([id])=>id!=='wet-wall'));
export const orderedSurface=id=>ORDERED_SURFACES[id]||null;
export const orderedFloor=id=>ORDERED_FLOORS[id]||null;
export const orderedFloorForRoom=orderedFinishForRoom;
export function applyOrderedFloors(settings){
 return {...settings,rooms:Object.fromEntries(Object.entries(settings.rooms).map(([id,room])=>[id,{...room,floor:orderedFloorForRoom(id)}]))};
}
