import test from 'node:test';
import assert from 'node:assert/strict';
import {trackSceneAsset,sceneAssetCount,subscribeSceneAssets} from './scene-loading.mjs';
test('loader tracks concurrent real work, clears rejected loads and releases subscriptions',async()=>{
 const counts=[],off=subscribeSceneAssets(()=>counts.push(sceneAssetCount()));let done;
 const slow=trackSceneAsset(new Promise(resolve=>{done=resolve;}));
 const failed=trackSceneAsset(Promise.reject(Error('offline')));
 assert.equal(sceneAssetCount(),2);await assert.rejects(failed,/offline/);assert.equal(sceneAssetCount(),1);
 done('ready');assert.equal(await slow,'ready');assert.equal(sceneAssetCount(),0);assert.deepEqual(counts,[1,2,1,0]);off();
 await trackSceneAsset(Promise.resolve());assert.equal(counts.length,4);
});
