import {useSyncExternalStore} from 'react';
import {sceneAssetProgress,subscribeSceneAssets} from './scene-loading.mjs';
import {loadingPercent} from './loading-progress.mjs';
import './loading-indicator.css';
export function LoadingIndicator({message='טוען את הסימולטור…',detail='',overlay=false,compact=false,progress=0}){
 const percent=loadingPercent(progress);
 return <div className={`studio-loader ${overlay?'studio-loader--overlay':''} ${compact?'studio-loader--transition':''}`} role="status" aria-live="polite" aria-busy="true" dir="auto"><span className="studio-loader-ring" aria-hidden="true"/><strong>{message}</strong>{detail&&<small>{detail}</small>}<div className="studio-loader-progress" aria-live="off"><span className="studio-loader-percent" dir="ltr" aria-hidden="true">{percent}%</span><progress max="100" value={percent} aria-label="התקדמות טעינה"/></div></div>;
}
export function SceneLoading({pending,lang='he',message,progress=0}){
 const assets=useSyncExternalStore(subscribeSceneAssets,sceneAssetProgress,sceneAssetProgress);
 if(!pending&&!assets.pending)return null;
 const percent=pending?Math.min(85,progress*.85):85+assets.percent*.14;
 return <LoadingIndicator overlay progress={percent} message={pending?message:lang==='he'?'טוען חומרים ותמונות…':'Loading materials and images…'} detail={lang==='he'?'התצוגה תיפתח כשהיא מוכנה':'The view will open when ready'}/>;
}
