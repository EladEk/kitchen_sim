import {DesignEvidence} from './DesignEvidence.jsx';
import {Ruler} from 'lucide-react';
import {furnitureMeasurements,measurementNote} from './home-measurements.mjs';

export function ItemDimensions({item,lang}){
 const he=lang==='he',rows=furnitureMeasurements(item);
 return <section className="hs-item-dimensions" aria-label={he?'מידות הפריט בסנטימטרים':'Item dimensions in centimetres'}><DesignEvidence item={item} lang={lang}/><div className="hs-dimensions-heading"><Ruler size={14}/><strong>{he?'מידות הפריט':'Item dimensions'}</strong><span>{he?'ס״מ':'cm'}</span></div><dl>{rows.map(r=><div key={r.key}><dt>{he?r.he:r.en}</dt><dd><bdi>{r.approximate?'≈ ':''}{r.cm}</bdi></dd></div>)}</dl><p>{measurementNote(item,lang)}</p></section>;
}
