// Nominal body dimensions in the object's own axes, never swapped by camera
// orientation or inflated by an open door. Unspecified real-life sizes stay
// explicitly approximate. Bed width/length refer to the mattress.
export function furnitureMeasurements(f){
 if(!f)return [];
 const known={...f.dimensionSources};
 if(['bed-a','bed-b'].includes(f.id)){known.width='user';known.depth='user';}
 if(['bath-vanity','ensuite-vanity','outdoor-kitchen'].includes(f.id))known.width='document';
 if(f.id==='bath-tub'){known.width='document';known.depth='document';}
 const bed=f.kind==='bed',basin=f.kind==='wall-basin',rows=[
  {key:'width',he:bed?'רוחב מזרן':'רוחב',en:bed?'Mattress width':'Width',metres:f.w},
  {key:'depth',he:bed?'אורך מזרן':'עומק',en:bed?'Mattress length':'Depth',metres:f.d},
  {key:'height',he:bed?'גובה משטח':basin?'גובה התקנה':'גובה גוף',en:bed?'Bed surface':basin?'Mounting height':'Body height',metres:f.h}
 ];
 return rows.map(r=>({...r,cm:Math.round(r.metres*1000)/10,origin:known[r.key]||'assumed',approximate:!known[r.key]}));
}
export function measurementNote(f,lang='he'){
 if(f.userDimensions)return lang==='he'?'מידות שהזנת לצורך התכנון. הן מעדכנות את המודל, ואינן אימות של מידות הרהיט בפועל. מידות מיטה מתייחסות למזרן.':'Dimensions entered for planning, not verified real furniture measurements. Bed width and length refer to the mattress.';
 if(f.kind==='wall-toilet')return lang==='he'?'עומק 52 ס״מ לפי קטלוג חרש, עמ׳ 26. הרוחב, הגובה וגובה ההתקנה משוערים.':'52 cm depth follows Harash catalogue page 26. Width, height and mounting height are estimated.';
 if(f.id==='guest-basin')return lang==='he'?'רוחב 33 ועומק 29 ס״מ לפי קטלוג חרש, עמ׳ 27. גובה ההתקנה משוער; הכיור ללא ארון.':'33 cm width and 29 cm depth follow Harash catalogue page 27. Mounting height is estimated; basin has no cabinet.';
 if(f.kind==='bed')return lang==='he'?'רוחב ואורך מתייחסים למזרן. המסגרת וגב המיטה להמחשה. ≈ מציין מידה משוערת.':'Width and length refer to the mattress. Frame and headboard are illustrative. ≈ marks an assumed size.';
 if(f.kind==='outdoor-kitchen')return lang==='he'?'הרוחב לפי דף המוצר; העומק בו הוא כ־70 ס״מ. גובה 90 ס״מ נבחר להמחשה.':'Width follows the product sheet; its depth is approximately 70 cm. The 90 cm height is illustrative.';
 return lang==='he'?'מידות גוף הפריט במודל, ללא אביזרים נלווים. ≈ מציין מידה שלא נמסרה במפרט.':'Nominal body dimensions in the model, excluding accessories. ≈ marks a dimension not supplied in the schedule.';
}
