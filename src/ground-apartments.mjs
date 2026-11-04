import {HOUSE,ROOMS,WALLS,CONSTRUCTION_WALLS,WINDOWS,DOORS,ELECTRICAL_LAYOUT,WATER_LAYOUT,LIGHTING_LAYOUT,point,openingPoint} from './home-model.mjs';
import {GROUND_BASE_SOURCE} from './ground-base-source.mjs';

// Base interior only. These records deliberately do not read owner furniture,
// kitchen drafts, finish orders, yard design, or proposed electrical changes.
// Rigid registrations are audited against building-plan.pdf page 3.
export const GROUND_REGISTRATION={
 1:{matrix:[0,-1,1,0],offset:[11.5499714,-23.4532286],reflected:false,maxResidual:.0224},
 2:{matrix:[0,1,1,0],offset:[11.8487857,-23.4538286],reflected:true,maxResidual:.0224},
 3:{matrix:[-1,0,0,1],offset:[23.4000286,-.0003714],reflected:true,maxResidual:.001},
 4:{matrix:[1,0,0,1],offset:[0,0],reflected:false,maxResidual:0}
};
export const groundTransform=unit=>GROUND_REGISTRATION[unit];
export function groundPoint(unit,p){const t=groundTransform(unit),[a,b,c,d]=t.matrix;return [a*p[0]+b*p[1]+t.offset[0],c*p[0]+d*p[1]+t.offset[1]];}
export function groundInverse(unit,p){const t=groundTransform(unit),[a,b,c,d]=t.matrix,x=p[0]-t.offset[0],z=p[1]-t.offset[1],det=a*d-b*c;return [(d*x-b*z)/det,(-c*x+a*z)/det];}
export function groundDirection(unit,p){const [a,b,c,d]=groundTransform(unit).matrix;return [a*p[0]+b*p[1],c*p[0]+d*p[1]];}

export function groundAngle(unit,angle){const v=groundDirection(unit,[Math.sin(angle),Math.cos(angle)]);return Math.atan2(v[0],v[1]);}

export function groundBaseFurniture(){return GROUND_BASE_SOURCE.originalWetFixtures.map(f=>{
 const kind=f.kind==='toilet'?'wc':['vanity','wall-basin'].includes(f.kind)?'basin':f.kind,rotation=f.id==='ensuite-toilet'?Math.PI/2:f.id==='ensuite-vanity'?Math.PI:f.id==='guest-basin'?-Math.PI/2:0,[w,d]=f.sourcePlanFootprintMetres;
 return {id:`base-${f.id}`,roomId:f.roomId,kind,position:[...f.nativeCenterWorld],w:Math.abs(Math.sin(rotation))>.5?d:w,d:Math.abs(Math.sin(rotation))>.5?w:d,h:kind==='wc'?.45:kind==='tub'?.58:kind==='shower'?2:.85,rotation,source:'house-plan',page:1,sourceFootprint:true,heightInferred:true};
});}
export const GROUND_KITCHEN={counterPdf:[[1051.02,323.50],[1226.82,323.50],[1226.82,227.14],[1260.78,227.14],[1260.78,357.52],[1051.02,357.52]],fridgePdf:[[1211.28,167.68],[1260.78,167.68],[1260.78,227.14],[1211.28,227.14]],source:'house-plan',page:1,proposed:true};
export function groundBaseProfile(){return {height:HOUSE.height,rooms:ROOMS.filter(r=>!['garden','outdoor'].includes(r.kind)).map(r=>({...r,kind:r.id==='bedroom-c'?'bedroom':r.id==='safe-room'?'safe-room':r.kind,he:r.id==='bedroom-c'?'חדר שינה 3':r.he,en:r.id==='bedroom-c'?'Bedroom 3':r.en,description:undefined})),walls:CONSTRUCTION_WALLS,windows:WINDOWS,doors:DOORS.filter(d=>!d.hostDoorId),furniture:groundBaseFurniture()};}
export function groundBaseServices(unit){
 const transfer=(p,kind)=>{const original=p.observedPosition||p.position,n=p.observedNormal||p.normal,at=groundPoint(unit,[original[0],original[2]]);return {...p,id:`ground-${unit}-${p.id}`,baseId:p.id,unit,serviceKind:kind,position:[at[0],p.observedHeight??original[1],at[1]],normal:groundDirection(unit,n),source:'building-plan',page:3,derived:true,status:'derived',simulation:kind==='lighting',relocation:undefined,evidence:[],he:`דירה ${unit} · ${p.he}`,en:`Apartment ${unit} · ${p.en}`,noteHe:'מיקום נגזר מסיבוב/שיקוף של דירת הבסיס. אינו תיעוד מצולם של דירה זו; יש להחליף בתיעוד הדירה כשיתקבל.',noteEn:'Derived from the rotated/reflected base apartment. This is not photographic evidence for this unit; replace with unit-specific documentation when available.'};};
 return [...ELECTRICAL_LAYOUT.points.map(p=>transfer(p,'electrical')),...WATER_LAYOUT.points.filter(p=>p.fixtureId!=='outdoor-kitchen').map(p=>transfer(p,'water')),...LIGHTING_LAYOUT.points.filter(p=>!p.commonEntry).map(p=>transfer(p,'lighting'))];
}
export function groundFeature(id){const match=String(id||'').match(/^ground-([123])-/);if(!match)return null;const p=groundBaseServices(Number(match[1])).find(p=>p.id===id);return p&&{...p,electrical:false,water:false,lighting:false,groundService:true,dimensions:[],dimensionsInferred:true,originLabel:['נגזר מדירת הבסיס · לא נמדד בדירה זו','Derived from base unit · unmeasured here']};}
export function groundFurnitureBoxes(unit){const bounds=(poly,id)=>({minX:Math.min(...poly.map(p=>p[0])),maxX:Math.max(...poly.map(p=>p[0])),minZ:Math.min(...poly.map(p=>p[1])),maxZ:Math.max(...poly.map(p=>p[1])),baseFurnitureId:id,unit});return [...groundBaseFurniture().filter(f=>f.kind!=='shower').map(f=>{const c=Math.cos(f.rotation),s=Math.sin(f.rotation),poly=[[-f.w/2,-f.d/2],[f.w/2,-f.d/2],[f.w/2,f.d/2],[-f.w/2,f.d/2]].map(([x,z])=>groundPoint(unit,[f.position[0]+x*c+z*s,f.position[1]-x*s+z*c]));return bounds(poly,f.id);}),...[[1051.02,323.5,1260.78,357.52],[1226.82,227.14,1260.78,323.5],[1211.28,167.68,1260.78,227.14]].map(([x,z,X,Z],i)=>bounds([[x,z],[X,z],[X,Z],[x,Z]].map(p=>groundPoint(unit,point(...p))),`base-kitchen-${i}`))];}
export function baseOpeningPosition(o){return openingPoint(o);}
