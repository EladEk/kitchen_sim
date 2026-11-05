let pending=0;
let total=0,done=0,percent=0,generation=0,snapshot=Object.freeze({pending:0,total:0,done:0,percent:100,generation:0});
const listeners=new Set();
export const sceneAssetCount=()=>pending;
export const sceneAssetProgress=()=>snapshot;
export const subscribeSceneAssets=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
function notify(){for(const listener of listeners)listener();}
function update(){percent=pending?Math.max(percent,Math.min(99,Math.floor(done/total*100))):100;snapshot=Object.freeze({pending,total,done,percent,generation});notify();}
// Count real completed assets, including settled failures, across each batch.
export function trackSceneAsset(task){if(!pending){total=done=percent=0;generation++;}total++;pending++;update();return Promise.resolve(task).finally(()=>{pending--;done++;update();});}
