export const GRAPHICS_PREFERENCE_KEY='homestudio-graphics-engine';
export const graphicsMode=value=>['auto','webgpu','webgl2'].includes(value)?value:'auto';
export function readGraphicsPreference(storage){try{return graphicsMode(storage?.getItem(GRAPHICS_PREFERENCE_KEY));}catch{return 'auto';}}
export function saveGraphicsPreference(storage,value){try{storage?.setItem(GRAPHICS_PREFERENCE_KEY,graphicsMode(value));}catch{}}
export function graphicsFailureMessage(mode,error){
 if(mode==='webgpu')return error?.code==='WEBGPU_UNAVAILABLE'?'WebGPU כפוי אינו נתמך בדפדפן או במכשיר הזה. בחרו אוטומטי או WebGL2 כדי להמשיך.':'WebGPU כפוי נעצר או לא הצליח להכין את התצוגה. אפשר לנסות שוב או לבחור אוטומטי / WebGL2.';
 return 'לא ניתן להפעיל את התצוגה במכשיר זה. נסו טעינה מחדש או בחרו מנוע אחר.';
}
