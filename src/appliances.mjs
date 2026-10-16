import {ROOM,getModule} from './model.mjs';

// Dimensions in mm. Supplied manufacturer sheets are retained in /plans.
export const HOB={
 id:'siemens-ex875lyv1e',cabinetId:'hob',brand:'Siemens',model:'EX875LYV1E',family:'iQ700 · FlexInduction Plus',
 width:812,depth:520,height:51,glassHeight:6,centerZ:310,
 cutout:{widthMin:750,widthMax:780,depthMin:490,depthMax:500,previewWidth:780,previewDepth:500},
 power:7400,zones:4,flexZones:2,source:'appliance-hob',
 url:'https://www.siemens-home.bsh-group.com/uk/en/mkt-product/EX875LYV1E'
};
export const HOOD={
 id:'elica-boxin-lx-90',cabinetId:'upper-3',brand:'Elica',model:'BOXIN LX · 90 cm',
 variants:['BOXINLX/IX/A/90','BOXINLX/BLMAT/A/90'],
 width:894,depth:310,mountingWidth:862,bodyHeight:60,panHeight:35,trimHeight:25,
 motorWidth:305,motorDepth:269.8,motorHeight:278.8,motorRearOffset:16.2,
 height:338.8,collarHeight:22.5,totalHeight:361.3,
 ductDiameter:150,ductRearOffset:102.7,shelfHoleDiameter:160,
 frontBandDepth:77.6,frameEdge:16.8,frontLip:10.7,
 depthMin:310,depthMax:340,minimumInductionGap:500,source:'appliance-hood',
 drawingSource:'appliance-hood-drawing',drawingUrl:'https://www.elica.com/WW-en/view-pdf/4625',
 referenceUrl:'https://www.elica.com/storage/Variant/Boxin_IX_90_FRONT_web.png',
 url:'https://www.elica.com/WW-en/hoods/integrated/boxin'
};
export const APPLIANCE_SOURCES=[
 {id:HOB.source,name:'Siemens · cooktop sheet',he:'Siemens · מפרט הכיריים'},
 {id:HOOD.source,name:'Elica · hood sheet',he:'Elica · מפרט הקולט'},
 {id:HOOD.drawingSource,name:'Elica · dimensions',he:'Elica · שרטוט מידות'},
 {id:'appliance-hood-views',name:'Elica · orthographic views',he:'Elica · מבטים ממודדים'},
 {id:'appliance-hood-reference',name:'Elica · actual 90 cm model',he:'Elica · דגם 90 ס״מ המקורי',extension:'png'}
];
export function appliancePlacement(){
 const base=getModule(HOB.cabinetId),upper=getModule(HOOD.cabinetId);
 const hobX=base.x+base.w/2,hoodX=upper.x+upper.w/2;
 return {hobX,hoodX,centerOffset:hoodX-hobX,hobTop:ROOM.worktop+HOB.glassHeight,
  hoodBottom:ROOM.upperBottom-HOOD.trimHeight,
  verticalGap:ROOM.upperBottom-HOOD.trimHeight-ROOM.worktop-HOB.glassHeight,
  motorSideAllowance:(upper.w-36-HOOD.motorWidth)/2,
  mountingSideAllowance:(upper.w-36-HOOD.mountingWidth)/2,
  hoodRear:ROOM.upperDepth-HOOD.depth,
  ductZ:ROOM.upperDepth-HOOD.depth+HOOD.ductRearOffset};
}
