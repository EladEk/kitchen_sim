import {useSyncExternalStore} from 'react';
import {sceneAssetCount,subscribeSceneAssets} from './scene-loading.mjs';
import './loading-indicator.css';
export function LoadingIndicator({message='טוען את הסימולטור…',detail='',overlay=false,compact=false}){
 return <div className={`studio-loader ${overlay?'studio-loader--overlay':''} ${compact?'studio-loader--transition':''}`} role="status" aria-live="polite" aria-busy="true" dir="auto"><span className="studio-loader-ring" aria-hidden="true"/><strong>{message}</strong>{detail&&<small>{detail}</small>}</div>;
}
export function SceneLoading({pending,lang='he',message}){
 const assets=useSyncExternalStore(subscribeSceneAssets,sceneAssetCount,()=>0);
 if(!pending&&!assets)return null;
 return <LoadingIndicator overlay message={pending?message:lang==='he'?'טוען חומרים ותמונות…':'Loading materials and images…'} detail={lang==='he'?'התצוגה תיפתח כשהיא מוכנה':'The view will open when ready'}/>;
}
