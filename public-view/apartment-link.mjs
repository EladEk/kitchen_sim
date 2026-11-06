import {DISTRICT} from './district-layout.mjs';
// Apartment numbers are looked up in exported destinations, never guessed
// from floor arithmetic (duplexes have a single lower entry).
export function apartmentLink({building,unit}){return `?${building}a${unit}`;}
export function parseApartmentLink(search=''){
 const keys=[...new URLSearchParams(search).keys()].filter(k=>/^\d{4}a\d+$/i.test(k));
 if(!keys.length)return null;if(keys.length!==1)return {error:'בקישור מופיעה יותר מדירה אחת.'};
 const [,building,number]=/^(\d{4})a(\d+)$/i.exec(keys[0]),unit=Number(number);
 if(!DISTRICT.some(b=>b.id===building)||!Number.isInteger(unit)||unit<1||unit>43)return {error:'הבניין או מספר הדירה בקישור אינם תקינים.'};
 return {building,unit};
}
export function resolveApartmentLink(nav,request){
 if(!request)return null;if(request.error)return request;
 const d=nav.destinations.find(d=>d.unit===request.unit);return d?{building:request.building,mode:'building',level:d.floor,target:d.id}:{error:'לא נמצאה דירה מתאימה לקישור.'};
}
