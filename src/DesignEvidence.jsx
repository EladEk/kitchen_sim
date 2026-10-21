import {designEvidence,EVIDENCE_LABELS} from './design-evidence.mjs';
export function DesignEvidence({item,settings={},lang='he'}){
 const evidence=designEvidence(item,settings),he=lang==='he';
 return <dl className="design-evidence" aria-label={he?'מקור ורמת דיוק':'Evidence and accuracy'}>{[['basis','מקור','Basis'],['position','מיקום','Position'],['dimensions','מידות','Dimensions']].map(([key,iw,en])=><div key={key}><dt>{he?iw:en}</dt><dd data-evidence={evidence[key]}>{EVIDENCE_LABELS[evidence[key]][he?0:1]}</dd></div>)}</dl>;
}
