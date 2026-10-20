import {FileText,ArrowUpRight} from 'lucide-react';
import {FLOOR_ORDER_ROWS} from './home-finish-schedule.mjs';
import {productById,productSource} from './home-products.mjs';
import './floor-specification.css';

export const floorRowSource=row=>({...productById(row.productId),source:'harash',page:row.page,orderEvidenceId:row.id});
export function FloorSchedule({lang,onSource}){
 const he=lang==='he';
 return <section className="floor-order-schedule"><h3>{he?'הריצוף לפי חדרים — הזמנת חרש':'Flooring by room — Harash order'}</h3><div className="floor-order-table"><table><thead><tr><th>{he?'חלל':'Space'}</th><th>{he?'דגם ומידה בס״מ':'Model & size in cm'}</th><th>{he?'שורת המקור':'Order line'}</th></tr></thead><tbody>{FLOOR_ORDER_ROWS.map(row=>{const p=productById(row.productId);return <tr key={row.id} data-floor-order-row={row.id}><td>{he?row.he:row.en}</td><td><span>{he?p.he:p.en}</span><code>{p.sku}</code><bdi>{p.size}</bdi></td><td>{onSource?<button className="ordered-floor-source" onClick={()=>onSource(floorRowSource(row))}><FileText size={13}/>{he?'עמוד':'Page'} {row.page}<ArrowUpRight size={12}/></button>:<a className="ordered-floor-source" href={productSource(floorRowSource(row))} target="_blank" rel="noreferrer">{he?'עמוד':'Page'} {row.page}<ArrowUpRight size={12}/></a>}</td></tr>;})}</tbody></table></div><p>{he?'בחדרי השינה אותו מק״ט כמו בסלון; ההבדלים המתועדים הם בחדרים הרטובים, במקלחת ובמרפסת. המסדרון ממשיך את ריצוף החלל הציבורי ואין עבורו שורה נפרדת בהזמנה. כמויות פחת ובדק לא משמשות כמידות חדר.':'Bedrooms have the same SKU as the living room. Documented differences concern wet rooms, the shower and the terrace. The hall continues the public floor; no separate hall line is listed. Waste and spare quantities are not room dimensions.'}</p></section>;
}
