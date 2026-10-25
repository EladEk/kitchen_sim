import {BUILDING_INTERIORS} from './building-interiors.mjs';

// The same apartment number and private L stair appear on source sheets 7–8.
// Floors 7–8 contain separate apartments 40–43, with their own hall entries.
export const BUILDING_DUPLEXES=Object.freeze([
 Object.freeze({unit:32,entryFloor:5,upperFloor:6,sourcePages:Object.freeze([7,8])})
]);
export function duplexForUnit(unit,floor){return BUILDING_DUPLEXES.find(d=>d.unit===unit&&(floor===d.entryFloor||floor===d.upperFloor))||null;}
export function duplexOnFloor(floor){return BUILDING_DUPLEXES.find(d=>floor===d.entryFloor||floor===d.upperFloor)||null;}
export function duplexStair(duplex){return duplex?BUILDING_INTERIORS.floors[duplex.entryFloor].duplexStair:null;}
export function duplexStairOpening(stair){
 const [a,b]=stair.longFlightRect,[c,e]=stair.shortFlightRect;
 return [[c[0],c[1]],[b[0],c[1]],[b[0],b[1]],[a[0],b[1]],[a[0],e[1]],[c[0],e[1]]];
}
