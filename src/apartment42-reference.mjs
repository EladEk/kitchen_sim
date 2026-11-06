import {BUILDING_TRACE} from './building-trace.mjs';

// Registered on the original vector floor-8 sheet (page 10), independently
// confirmed by the owner's dimensioned photo 331891.jpg. The photo has
// perspective distortion: it identifies the layout, not a new scale/frame.
// Cabinet/appliance heights and exact product models remain illustrative.
const registration=BUILDING_TRACE.registration;
const scale=registration.pdfMetresPerPoint;
export const APARTMENT42_REFERENCE={unit:42,floor:8,page:10,photo:'331891.jpg',
 sourceSha256:registration.buildingPdfSha256,
 kitchenRunMetres:4.00,
 kitchenOutlinePdf:[[632.64,342.54],[649.62,342.54],[649.62,291.48],[748.86,291.48]],
 sinkPdf:[688.56,282.96],hobPdf:[729.57,282.81],
 bathroomSymbolsPdf:{
  mainWc:[603.38,538.14,613.68,557.94],mainBasin:[621.30,545.22,643.98,557.94],
  bath:[604.26,489.96,652.44,509.76],
  guestWc:[900.08,461.10,911.82,476.22],guestBasin:[884.04,484.26,894.30,504.12],
  masterWc:[604.82,712.44,615.12,732.30],masterBasin:[628.38,719.52,651.06,732.30],
  masterShower:[663.78,689.76,686.46,732.30]
 }};

export function apartment42Point(pdf){return pdf.map((v,i)=>registration.liftWorld[i]+(v-registration.sheetLiftPixels[10][i]*1332/1250)*scale);}
function fixture(id,kind,pdf,w,d,angle=0,extra={}){
 const [x,z]=apartment42Point(pdf),W=Math.abs(Math.cos(angle))*w+Math.abs(Math.sin(angle))*d,D=Math.abs(Math.sin(angle))*w+Math.abs(Math.cos(angle))*d;
 return {id:`f8-unit-42-${id}`,floor:8,unit:42,kind,x,z,w,d,angle,
  box:{minX:x-W/2,maxX:x+W/2,minZ:z-D/2,maxZ:z+D/2},
  approach:[x+Math.sin(angle)*(d/2+.35),z+Math.cos(angle)*(d/2+.35)],
  sourcePage:10,sourceRegistered:true,sourcePdf:pdf,layoutRevision:135,dimensionsInferred:true,flushWorktop:true,...extra};
}

// A 4m north run with the sink and hob in their source positions, a plain
// west return, then the fridge. The old 2.4m west run is replaced, not overlaid.
const main=fixture('kitchen','kitchen',[690.75,283.70],4,.60,0,
 {sinkOffset:(688.56-690.75)*scale,hobOffset:(729.57-690.75)*scale});
const returnDepth=(342.54-283.70)*scale-.30;
const returnCentreZ=main.box.maxZ+returnDepth/2;
const returnPdfZ=(returnCentreZ-registration.liftWorld[1])/scale+registration.sheetLiftPixels[10][1]*1332/1250;
export const APARTMENT42_FIXED_FURNITURE=[main,
 fixture('kitchen-return','kitchen-return',[632.64+(.045+.30)/scale,returnPdfZ],returnDepth,.60,Math.PI/2),
 fixture('fridge','fridge',[632.64+(.045+.36)/scale,357.60],.78,.72,Math.PI/2),
 fixture('washer','washer',[563.19,498.45],.54,.54,0,{roomHe:'חדר שירות',mapRoom:true}),
 fixture('dryer','dryer',[580.17,498.45],.54,.54)
];

const wet=(id,kind,pdf,w,d,angle,roomId,roomHe)=>fixture(id,kind,pdf,w,d,angle,{roomId,roomHe,seed:apartment42Point(pdf),illustrative:true});
export const APARTMENT42_BATHROOMS=[
 wet('main-wc','wc',[608.53,548.04],.36,.60,Math.PI,'wet-0','חדר רחצה'),
 wet('main-basin','basin',[632.64,550.45],.74,.40,Math.PI,'wet-0','חדר רחצה'),
 wet('bathtub','bathtub',[628.35,499.86],1.60,.60,0,'wet-0','חדר רחצה'),
 wet('guest-wc','wc',[901.77,468.69],.36,.54,-Math.PI/2,'wet-1','שירותי אורחים'),
 wet('guest-basin','basin',[889.17,494.86],.36,.40,Math.PI,'wet-1','שירותי אורחים'),
 wet('master-wc','wc',[609.97,722.37],.36,.60,Math.PI,'wet-2','חדר רחצה הורים'),
 wet('master-basin','basin',[639.72,724.78],.74,.40,Math.PI,'wet-2','חדר רחצה הורים'),
 wet('master-shower','shower',[675.12,711.03],1.38,.70,-Math.PI/2,'wet-2','חדר רחצה הורים')
];

export function refineApartment42Furniture(rows){
 return [...rows.filter(r=>!(r.floor===8&&r.unit===42&&r.kind==='kitchen')).map(r=>r.id==='f8-beds-3'?{...r,roomHe:'ממ״ד'}:r),...APARTMENT42_FIXED_FURNITURE];
}
export function refineApartment42Bathrooms(rows){return [...rows.filter(r=>!(r.floor===8&&r.unit===42)),...APARTMENT42_BATHROOMS];}
