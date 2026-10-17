// Apartment specification, RG/RG1 table only (PDF pages 16–17).
// Widths are approximate construction openings; the traced plan still owns x/z.
const row=(width,height,material,operation='hinged',page=16)=>({width,height,material,operation,source:'apartment-spec',page});
export const OPENING_SCHEDULE={
 entry:row(1,2.1,'steel'),patio:row(2.8,2.3,'glazed-aluminium','sliding'),
 'bed-a':row(.8,2.1,'wood'),'bed-b':row(.8,2.1,'wood'),master:row(.8,2.1,'wood'),'bed-c':row(.8,2.1,'wood'),
 safe:row(.7,2,'steel','outward'),'safe-inner':row(.7,2,'wood','inward'),powder:row(.7,2.1,'wood'),ensuite:row(.7,2.1,'wood'),bath:row(.8,2.1,'wood'),
 utility:row(.8,2.1,'wood','hinged',17),'service-exit':row(.95,2.3,'steel','hinged',17),
 'bed-a-window':row(1.2,1.25,'glazed-aluminium','sliding'),'bed-b-window':row(1.2,1.25,'glazed-aluminium','sliding'),
 'master-window':row(1.2,1.25,'glazed-aluminium','sliding'),'bed-c-window':row(1.2,1.25,'glazed-aluminium','sliding'),
 'kitchen-window':row(.9,1.25,'glazed-aluminium','sliding'),'ensuite-window':row(.5,.9,'glazed-aluminium','tilt'),
 'safe-window':row(1,1,'glazed-aluminium','protected'),'utility-window':row(.55,1.25,'glazed-aluminium','tilt',17)
};
// Leaf hinge endpoints and swings read from the apartment plan, page 1.
// The additional inner safe-room leaf is specified on p16; its hinge side and
// frame separation are illustrative (the plan draws only the outer steel leaf).
export const DOOR_HANDINGS={
 entry:{hinge:'start',swing:-1},'bed-a':{hinge:'end',swing:1},'bed-b':{hinge:'start',swing:-1},
 master:{hinge:'start',swing:-1},'bed-c':{hinge:'start',swing:-1},safe:{hinge:'end',swing:-1,faceOffset:-.13},
 'safe-inner':{hinge:'end',swing:1,faceOffset:.13,illustrativeHinge:true},
 powder:{hinge:'start',swing:1},bath:{hinge:'end',swing:-1},ensuite:{hinge:'start',swing:-1},
 utility:{hinge:'start',swing:1},'service-exit':{hinge:'start',swing:-1}
};
export const SHUTTER_IDS=['patio','kitchen-window','master-window','bed-a-window','bed-b-window','bed-c-window'];
export const SHUTTER_SPEC={source:'apartment-spec',page:16,material:'aluminium',operation:'electric-roller',livingManualBackup:true};
export const DOUBLE_GLAZED_IDS=['patio','kitchen-window','master-window','bed-a-window','bed-b-window','bed-c-window']; // p26, note c
export const BUILDING_SPEC={
 source:'apartment-spec',minimumHeight:2.5,minimumServiceHeight:2.05,heightPage:11,
 cladding:{bathroom:{height:2.1,page:11},ensuite:{height:2.1,page:12},powder:{height:1.2,page:12}},
 // Specification numbering differs from the simulator's existing bedroom names.
 bedroomNumbers:{master:1,'bedroom-a':2,'bedroom-b':3,'bedroom-c':4,'safe-room':5},
 building:{source:'building-plan',page:3,number:4102,plot:1410,apartment:4,floor:'ground'},
 services:{
  electricity:{phases:3,amperes:40,page:33},
  airConditioning:{included:true,kind:'mini-central',except:['bathroom','ensuite','powder','laundry'],page:33},
  safeAirFilter:{included:true,page:34},waterTank:{minimumLitres:150,page:30},
  mechanicalVentilation:{rooms:['bathroom','powder'],page:16},
  garden:{landscapingIncluded:false,irrigationIncluded:false,page:34}
 }
};
export const claddingHeight=roomId=>BUILDING_SPEC.cladding[roomId]?.height??2.1;
