export const GRAPHICS_PREFERENCE_KEY='homestudio-graphics-engine';
export const GRAPHICS_DEFAULT_VERSION_KEY='homestudio-graphics-default';
export const graphicsMode=value=>['auto','webgpu','webgl2'].includes(value)?value:'auto';
// R129 wrote WebGL2 even without a user choice. Activate the requested native
// upgrade once; subsequent explicit compatibility selections remain respected.
export function readGraphicsPreference(storage){try{if(storage?.getItem(GRAPHICS_DEFAULT_VERSION_KEY)!=='163'){const next=storage?.getItem(GRAPHICS_PREFERENCE_KEY)==='webgpu'?'webgpu':'auto';saveGraphicsPreference(storage,next);return next;}return graphicsMode(storage?.getItem(GRAPHICS_PREFERENCE_KEY));}catch{return 'auto';}}
export function saveGraphicsPreference(storage,value){try{storage?.setItem(GRAPHICS_PREFERENCE_KEY,graphicsMode(value));storage?.setItem(GRAPHICS_DEFAULT_VERSION_KEY,'163');}catch{}}
export function graphicsFailureMessage(mode,error){
 if(mode==='webgpu')return error?.code==='WEBGPU_UNAVAILABLE'?'WebGPU כפוי אינו נתמך בדפדפן או במכשיר הזה. בחרו אוטומטי או WebGL2 כדי להמשיך.':'WebGPU כפוי נעצר או לא הצליח להכין את התצוגה. אפשר לנסות שוב או לבחור אוטומטי / WebGL2.';
 return 'לא ניתן להפעיל את התצוגה במכשיר זה. נסו טעינה מחדש או בחרו מנוע אחר.';
}
