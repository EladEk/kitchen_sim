import {useEffect,useRef,useState} from 'react';
import {FLOOR_PHOTO} from './owner-product-references.mjs';
import {orderedFloorPhotoData} from './ordered-floor-photo.mjs';

export function FloorPhotoComparison({lang}){
 const he=lang==='he',canvas=useRef(),[open,setOpen]=useState(false),[status,setStatus]=useState('loading');
 useEffect(()=>{
  if(!open)return;
  let active=true;setStatus('loading');
  const task=orderedFloorPhotoData('dry-floor');
  if(!task){setStatus('failed');return;}
  task.then(data=>{
   if(!active)return;
   const c=canvas.current,context=c?.getContext('2d');if(!context){setStatus('failed');return;}
   c.width=c.height=data.size;const image=context.createImageData(data.size,data.size);image.data.set(data.color);context.putImageData(image,0,0);setStatus('ready');
  },()=>{if(active)setStatus('failed');});
  return ()=>{active=false;};
 },[open]);
 const crop={width:`${FLOOR_PHOTO.width/FLOOR_PHOTO.sample[2]*100}%`,left:`${-FLOOR_PHOTO.sample[0]/FLOOR_PHOTO.sample[2]*100}%`,top:`${-FLOOR_PHOTO.sample[1]/FLOOR_PHOTO.sample[3]*100}%`};
 return <details className="floor-photo-comparison" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary>{he?'השוואת הטקסטורה לצילום':'Compare texture with photo'}</summary>
  <div className="floor-photo-pair">
   <figure><a className="floor-photo-crop" href={FLOOR_PHOTO.image} target="_blank" rel="noreferrer"><img src={FLOOR_PHOTO.image} style={crop} alt={he?'אזור הדגימה בצילום המקורי':'Sampled area in the original photograph'}/></a><figcaption>{he?'צילום המקור':'Original photograph'}</figcaption></figure>
   <figure><div className="floor-photo-crop" data-material-status={status}><canvas ref={canvas} role="img" aria-label={he?'אותה טקסטורה המשמשת בהדמיה לפני תאורת החדר':'The same texture used by the simulator, before room lighting'} hidden={status!=='ready'}/>{status!=='ready'&&<span role="status">{status==='failed'?(he?'התצוגה לא נטענה; ניתן לפתוח את המקור':'Preview unavailable; open the original'):(he?'טוען טקסטורה…':'Loading texture…')}</span>}</div><figcaption>{he?'החומר בהדמיה, לפני תאורה':'Simulator texture, before lighting'}</figcaption></figure>
  </div>
  <p>{he?'אותה דוגמה מהצילום, לאחר הסרת התאורה הבהירה במרכז וההכהיה בקצוות. אין מסגרת כהה באריח. גודל האריח 100×100 ס״מ. רוחב הפוגה והחזר האור משוערים; הגוון תלוי גם בתאורה ובמסך.':'The same photographed pattern after removing the bright centre and dark perimeter lighting. The tile has no dark border. Tile size: 100×100 cm. Joint width and reflectance are estimates; light and screen affect shade.'}</p>
 </details>;
}
