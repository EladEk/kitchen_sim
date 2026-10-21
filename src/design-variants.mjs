export const VARIANT_STORAGE='elad-studio-variants-v1';
export const VARIANT_LIMIT=12;
const clone=x=>JSON.parse(JSON.stringify(x));
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function validVariant(x){return record(x)&&typeof x.id==='string'&&typeof x.name==='string'&&x.name.trim().length>0&&record(x.home)&&record(x.home.rooms)&&record(x.kitchen);}
export function readVariants(storage){try{const raw=JSON.parse(storage.getItem(VARIANT_STORAGE)||'[]');return Array.isArray(raw)?raw.filter(validVariant).slice(0,VARIANT_LIMIT):[];}catch{return [];}}
export function writeVariants(storage,items){storage.setItem(VARIANT_STORAGE,JSON.stringify(items.filter(validVariant).slice(0,VARIANT_LIMIT)));}
export const variantBackup=items=>({schema:1,type:'home-studio-alternatives',items:items.filter(validVariant)});
export function mergeVariantBackup(existing,backup){
 if(backup?.schema!==1||backup.type!=='home-studio-alternatives'||!Array.isArray(backup.items)||!backup.items.every(validVariant))throw Error('Invalid alternatives backup');
 const ids=new Set(existing.map(p=>p.id)),incoming=backup.items.filter(p=>!ids.has(p.id));
 if(existing.length+incoming.length>VARIANT_LIMIT)throw Error('Alternative limit exceeded');
 return [...existing,...incoming];
}
export function saveVariant(items,{id,name,home,kitchen},now=Date.now()){
 const clean=String(name||'').trim().slice(0,80);if(!clean)return {items,error:'name'};
 const existing=id&&items.find(p=>p.id===id);if(!existing&&items.length>=VARIANT_LIMIT)return {items,error:'limit'};
 const item={id:existing?.id||`design-${now}-${Math.random().toString(36).slice(2,8)}`,name:clean,home:clone(home),kitchen:clone(kitchen),createdAt:existing?.createdAt||now,updatedAt:now};
 if(!validVariant(item))return {items,error:'invalid'};
 return {items:existing?items.map(p=>p.id===id?item:p):[...items,item],item};
}
export function variantDifferences(a,b){
 const fields=[['furniture','ריהוט','Furniture',x=>x.home.furnitureLayout||{}],['yard','חצר','Yard',x=>x.home.yardDesign||{}],['finishes','גימורי חדרים','Room finishes',x=>x.home.rooms],['lighting','מנורות','Lights',x=>[x.home.lightControls||{},x.kitchen.lightControls||{}]],['kitchen','מטבח','Kitchen',x=>Object.fromEntries(['base','upper','stone','hardware','floor','light','led','intensity'].map(k=>[k,x.kitchen[k]]))]];
 return fields.map(([id,he,en,get])=>({id,he,en,changed:JSON.stringify(get(a))!==JSON.stringify(get(b))}));
}
