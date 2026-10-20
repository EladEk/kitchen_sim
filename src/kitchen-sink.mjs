import {OWNER_PRODUCT_REFERENCES} from './owner-product-references.mjs';

export const KITCHEN_SINK={
 id:'schock-vegas-70-casablanca',productId:'kitchen-sink',brand:'SCHOCK / Aquatop',model:'Vegas 70',
 finish:'Casablanca',finishHe:'קזבלנקה',finishCode:'98',material:'CRISTADUR',color:'#e8dfca',
 // Nominal envelope from the owner's product screenshot. Goma confirms the
 // 700 mm cabinet, 220 mm depth, flush mounting and 3.5 inch waste.
 width:690,depth:520,height:220,cabinetWidth:700,centerZ:315,tapZ:100,drainZ:235,
 bowl:{width:630,depth:405,offsetZ:27,radius:30,dimensionsInferred:true},
 cutout:{width:680,depth:510,radius:10,previewOnly:true},
 source:'ordered-product-photos',page:3,referenceImage:OWNER_PRODUCT_REFERENCES.sink.image,
 importerUrl:'https://www.gome1981.co.il/catalog-id.aspx?StoreProductId=204&storeSubCategoryId=13',
 drawingUrl:'https://www.gome1981.co.il/images/vegas1.jpg',
 colorSourceUrl:'https://avivi-e.com/vgas'
};

export function roundedRect(path,width,depth,radius,cx=0,cz=0){
 const x=cx-width/2,z=cz-depth/2,r=radius;
 path.moveTo(x+r,z);path.lineTo(x+width-r,z);path.quadraticCurveTo(x+width,z,x+width,z+r);
 path.lineTo(x+width,z+depth-r);path.quadraticCurveTo(x+width,z+depth,x+width-r,z+depth);
 path.lineTo(x+r,z+depth);path.quadraticCurveTo(x,z+depth,x,z+depth-r);
 path.lineTo(x,z+r);path.quadraticCurveTo(x,z,x+r,z);path.closePath();return path;
}
