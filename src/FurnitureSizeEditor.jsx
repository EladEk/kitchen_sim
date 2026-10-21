import {furnitureSizeLimits} from './home-model.mjs';

export function FurnitureSizeEditor({item,lang,onMove}){
 if(!item)return null;
 const he=lang==='he',limits=furnitureSizeLimits(item),dimensions=['w','d','h'],values=dimensions.map(k=>Math.round(item[k]*1000)/10);
 return <details className="hs-size-editor"><summary>{he?'עריכת מידות':'Edit dimensions'} · <bdi>{values.join(' × ')} {he?'ס״מ':'cm'}</bdi></summary><form key={`${item.id}/${values.join('/')}`} onSubmit={e=>{e.preventDefault();onMove({dimensions:Object.fromEntries(dimensions.map(k=>[k,Number(e.currentTarget.elements.namedItem(k).value)/100]))});}}><div className="hs-dimension-fields">{dimensions.map((key,i)=><label key={key}>{(he?['רוחב',item.kind==='bed'?'אורך מזרן':'עומק','גובה']:['Width',item.kind==='bed'?'Mattress length':'Depth','Height'])[i]} ({he?'ס״מ':'cm'})<input name={key} type="number" inputMode="decimal" min={limits[key][0]*100} max={limits[key][1]*100} step="1" required defaultValue={values[i]}/></label>)}</div><div className="hs-edit-form-actions"><button type="submit">{he?'החלת מידות':'Apply dimensions'}</button><button type="button" onClick={()=>onMove({resetDimensions:true})}>{he?'איפוס מידות':'Reset dimensions'}</button></div><p>{he?'המידות נשמרות כבחירת תכנון. במיטה: רוחב ואורך המזרן.':'Sizes save as your planning choice. Bed width and length refer to the mattress.'}</p></form></details>;
}
