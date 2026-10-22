import {ProtectedImage} from './DocumentAccess.jsx';
import {DocumentGate} from './DocumentAccess.jsx';
import {FileText,ArrowUpRight} from 'lucide-react';
import {catalogueMatch,catalogueSource,HARASH_CATALOG_SOURCE} from './harash-catalog.mjs';
import './harash-catalog.css';

const labels={sku:['התאמת מק״ט','Exact SKU'],model:['התאמת דגם','Named model match'],family:['משפחת מוצר בלבד','Product family only'],partial:['התאמה חלקית','Partial match'],ambiguous:['בחירה לא מאומתת','Unresolved selection'],unmatched:['לא זוהה בקטלוג','Not identified in catalogue'],outside:['מקור נפרד','Separate source']};
export function CatalogueMatch({productId,lang,onSource,compact=false}){
 const match=catalogueMatch(productId);if(!match)return null;const he=lang==='he',label=labels[match.status][he?0:1];
 return <section className={`catalog-match ${compact?'catalog-match-compact':''}`} data-catalogue-product={productId} data-match-status={match.status}>
  <span className={`catalog-match-status catalog-status-${match.status}`}>{label}</span>
  {match.refs?.map((r,i)=><div className="catalog-reference" key={i}>
   <a href={r.image} target="_blank" rel="noreferrer" className="catalog-product-photo" aria-label={he?'פתיחת תמונת המוצר מהקטלוג':'Open catalogue product image'}><ProtectedImage src={r.image} width={r.width} height={r.height} loading="lazy" alt={he?r.captionHe:r.captionEn}/></a>
   <div><strong>{he?r.captionHe:r.captionEn}</strong>{onSource?<button type="button" className="catalog-source-link" onClick={()=>onSource(catalogueSource(productId,i))}><FileText size={13}/>{he?'השוואה לקטלוג · עמוד':'Compare catalogue · page'} {r.page}<ArrowUpRight size={12}/></button>:<a className="catalog-source-link" href={`${HARASH_CATALOG_SOURCE.pdf}#page=${r.page}`} target="_blank" rel="noreferrer"><FileText size={13}/>{he?'קטלוג · עמוד':'Catalogue · page'} {r.page}<ArrowUpRight size={12}/></a>}</div>
  </div>)}
  <p>{he?match.noteHe:match.noteEn}</p>
  {match.refs?.length>0&&<small>{he?'תמונות מקור מתוך הקטלוג. גוון המסך ופרטי צורה ללא שרטוט ממודד הם להמחשה.':'Original catalogue images. Screen shade and undimensioned shape details remain illustrative.'}</small>}
 </section>;
}

function DocumentSourcePageContent({image,page,lang,rect,caption,highlightId,documentName}){
 const he=lang==='he';
 return <div className="catalog-page-scroll">{caption&&<p className="catalog-page-label">{caption} · {he?'מסומן במסגרת · עמוד':'Highlighted · page'} {page}</p>}<figure className="catalog-page-frame"><ProtectedImage src={image} alt={`${documentName} — ${he?'עמוד':'page'} ${page}`}/>{rect&&<span className="catalog-page-highlight" data-catalogue-highlight={highlightId} style={{left:`${rect[0]*100}%`,top:`${rect[1]*100}%`,width:`${rect[2]*100}%`,height:`${rect[3]*100}%`}}/>}</figure></div>;
}
export function CataloguePage({productId,reference=0,page,image,lang}){
 const refs=catalogueMatch(productId)?.refs||[],r=refs[reference]?.page===page?refs[reference]:refs.find(r=>r.page===page),he=lang==='he';
 return <DocumentSourcePage image={image} page={page} lang={lang} rect={r?.rect} caption={r&&(he?r.captionHe:r.captionEn)} highlightId={productId} documentName={he?'קטלוג חרש':'Harash catalogue'}/>;
}

export function DocumentSourcePage(props){return <DocumentGate lang={props.lang||props.settings?.lang}><DocumentSourcePageContent {...props}/></DocumentGate>;}
