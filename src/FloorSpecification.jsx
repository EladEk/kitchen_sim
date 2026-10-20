import {FileText,ArrowUpRight} from 'lucide-react';
import {productById,productSource} from './home-products.mjs';
import {OWNER_PRODUCT_REFERENCES,FLOOR_PHOTO} from './owner-product-references.mjs';
import './floor-specification.css';
import {CatalogueMatch} from './CatalogueMatch.jsx';
import {floorOrderForRoom,floorOrderEvidence} from './home-finish-schedule.mjs';
import {floorRowSource} from './FloorSchedule.jsx';
import {FloorPhotoComparison} from './FloorPhotoComparison.jsx';

export function FloorSpecification({productId,roomId,evidenceId,lang,onSource}){
 const p=productById(productId);if(!p)return null;
 const he=lang==='he',label=he?'השורה בהזמנת חרש':'Harash order line',row=evidenceId?floorOrderEvidence(evidenceId):floorOrderForRoom(roomId),scheduled=row?.productId===productId,source=scheduled?floorRowSource(row):p;
 return <div className="ordered-floor-spec" data-floor-sku={p.sku} data-room-id={roomId} data-order-page={source.page}>
  <small>{he?'הריצוף מההזמנה שלך':'Your ordered floor'}</small>
  <strong>{he?p.he:p.en}</strong>
  {scheduled&&<p>{he?row.he:row.en}{row.basis==='continuity'?(he?' · שיוך להמשך הריצוף; אין שורת מסדרון נפרדת':' · floor continuity; no separate hall order line'):''}</p>}
  <div><code>{p.sku}</code><span dir="ltr">{p.size}</span></div>
  {productId==='dry-floor'?<><a className="ordered-floor-photo" href={FLOOR_PHOTO.image} target="_blank" rel="noreferrer" aria-label={he?'פתיחת צילום האריח המקורי':'Open the original tile photograph'}><span><img src={FLOOR_PHOTO.image} alt={he?'דוגמת MI402439 מהצילום שצירפת':'MI402439 pattern from your attached photo'} style={{width:`${FLOOR_PHOTO.width/FLOOR_PHOTO.sample[2]*100}%`,left:`${-FLOOR_PHOTO.sample[0]/FLOOR_PHOTO.sample[2]*100}%`,top:`${-FLOOR_PHOTO.sample[1]/FLOOR_PHOTO.sample[3]*100}%`}}/></span><strong>{he?'הטקסטורה מהצילום שלך':'Texture from your photograph'}<ArrowUpRight size={12}/></strong></a><p>{he?'הדוגמה נדגמת מצילום האריח עצמו. גודל האריח 100×100 ס״מ; הגוון מושפע מתאורת הצילום וההדמיה.':'Pattern samples the actual photographed tile. Tiles are 100×100 cm; shade depends on photo and scene lighting.'}</p><a className="ordered-floor-source" href={OWNER_PRODUCT_REFERENCES.floorLabel.image} target="_blank" rel="noreferrer">{he?'צילום מדבקת המק״ט':'Photographed product label'}<ArrowUpRight size={12}/></a></>:<CatalogueMatch productId={productId} lang={lang} onSource={onSource} compact/>}
  {onSource?<button type="button" className="ordered-floor-source" onClick={()=>onSource(source)}><FileText size={13}/>{label} · {source.page}<ArrowUpRight size={12}/></button>:<a className="ordered-floor-source" href={productSource(source)} target="_blank" rel="noreferrer"><FileText size={13}/>{label} · {source.page}<ArrowUpRight size={12}/></a>}
  {productId==='dry-floor'&&<FloorPhotoComparison lang={lang}/>}
  {roomId==='ensuite'&&<section className="ordered-shower-spec"><FloorSpecification productId="shower-floor" evidenceId="ensuite-shower-floor" lang={lang} onSource={onSource}/></section>}
 </div>;
}
