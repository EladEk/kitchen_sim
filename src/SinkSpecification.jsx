import {ExternalLink} from 'lucide-react';
import {KITCHEN_SINK as S} from './kitchen-sink.mjs';
import './floor-specification.css';
import {CatalogueMatch} from './CatalogueMatch.jsx';

export function SinkSpecification({lang}){
 const he=lang==='he';
 return <article className="ordered-floor-spec sink-product-spec" data-sink-model={S.id}>
  <small>{he?'הכיור שבחרת':'Your selected sink'}</small><strong>SCHOCK / Aquatop · Vegas 70</strong>
  <div><span>{he?'קזבלנקה':'Casablanca'} · 98</span><span dir="ltr">69 × 52 × 22 cm</span></div>
  <a className="sink-product-photo" href={S.referenceImage} target="_blank" rel="noreferrer" aria-label={he?'צילום הכיור המקורי שצירפת':'Your original attached sink screenshot'}><img src={S.referenceImage} alt="SCHOCK Vegas 70 Casablanca"/></a>
  <p>{he?'קריסטדור בגוון קזבלנקה, התקנה שטוחה בארון 70 ס״מ. מידות המעטפת נומינליות לפי הצילום, עומק 22 ס״מ לפי גומא. הפינות, שיפועי הקערה ופתח המשטח במודל הם התאמה חזותית; אין כאן תבנית לחיתוך שיש.':'Casablanca CRISTADUR, flush mounted in the 70 cm cabinet. Nominal envelope follows your screenshot; Goma confirms 22 cm depth. Corner radii, bowl slopes and model opening are visual approximations, not a worktop cutting template.'}</p>
  <a className="ordered-floor-source" href={S.importerUrl} target="_blank" rel="noreferrer">{he?'מפרט Vegas 70 באתר גומא':'Vegas 70 — Goma importer'}<ExternalLink size={12}/></a>
  <a className="ordered-floor-source" href={S.colorSourceUrl} target="_blank" rel="noreferrer">{he?'קזבלנקה 98 — מקור הגוון':'Casablanca 98 — colour reference'}<ExternalLink size={12}/></a>
  <CatalogueMatch productId="kitchen-tap" lang={lang} compact/>
 </article>;
}
