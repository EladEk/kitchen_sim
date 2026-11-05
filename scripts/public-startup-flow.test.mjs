import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {loadPublicBaseline} from '../public-view/baseline-loading.mjs';
import {APP_REVISION,BASELINE_REVISION} from '../public-view/revision.mjs';

test('the production startup loader accepts the actual current app, loading manifest and navigation together',async()=>{
 const requests=[],fetcher=async(url,options)=>{assert.equal(options.cache,'no-cache');assert(url.endsWith('?v='+APP_REVISION));requests.push(url);const file=url.split('?')[0];return new Response(await readFile('dist/client'+file));};
 const [navigation,building,site]=await loadPublicBaseline({fetcher});assert.equal(navigation.revision,BASELINE_REVISION);assert.equal(navigation.destinations.filter(d=>d.unit).length,43);assert(building.object);assert(site);assert.equal(requests.length,4);
});
test('a genuinely stale navigation file is rejected with expected and received versions in diagnostics',async()=>{
 const fetcher=async url=>{const file=url.split('?')[0],raw=await readFile('dist/client'+file,'utf8');if(!file.endsWith('navigation.json'))return new Response(raw);const data=JSON.parse(raw);data.revision=BASELINE_REVISION-1;return new Response(JSON.stringify(data));};
 await assert.rejects(loadPublicBaseline({fetcher}),e=>e.code==='BASELINE_REVISION_MISMATCH'&&e.details.expectedRevision===BASELINE_REVISION&&e.details.receivedRevision===BASELINE_REVISION-1);
});
