// Kitchen-local metres, x from the narrow window toward the hall. The entry
// projection follows the plan's return (303.64) and hall jamb (889.47).
// Grille sizes, depths and all vertical dimensions remain photo estimates.
const scale=50*25.4/72/1000;
export const HVAC_PROFILE=Object.freeze({
 bottom:2.42,top:2.75,back:-.05,
 sections:[
  {id:'work-run',start:0,end:5.36,front:.5},
  {id:'hall-entry',start:5.36,end:(1260.78-889.47)*scale,front:(357.52-303.64)*scale}
 ],
 grilles:[
  {id:'work-supply',section:'work-run',x:2.65,y:2.585,width:.5,height:.17},
  {id:'hall-large',section:'hall-entry',x:6.02,y:2.585,width:1.0,height:.23}
 ],
 controller:{x:5.18,y:2.575,width:.14,height:.125},
 photoPage:11,sourceFile:'277903.jpg',dimensionsInferred:true
});
