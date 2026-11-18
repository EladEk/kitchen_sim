import test from 'node:test';
import assert from 'node:assert/strict';
import {pbkdf2Sync,randomBytes,createCipheriv} from 'node:crypto';
import {deriveAssetKey} from '../server/asset-key.mjs';
import {documentAuthRoute,documentSession,decryptedDocumentResponse,readCookie,clientKey} from '../server/document-access.mjs';
const env={DOCUMENTS_SECRET:'test passphrase for portable runtime',DOCUMENTS_PASSWORD:'private password'};
test('passphrase asset key matches Node PBKDF2 and explicit base64 keys take precedence',async()=>{
 assert.deepEqual(Buffer.from(await deriveAssetKey(env)),pbkdf2Sync(env.DOCUMENTS_SECRET,'homestudio-vault-asset-key-v1',100000,32,'sha256'));
 const key=randomBytes(32);assert.deepEqual(Buffer.from(await deriveAssetKey({...env,DOCUMENTS_ASSET_SECRET:key.toString('base64')})),key);
 assert.deepEqual(Buffer.from(await deriveAssetKey({DOCUMENTS_SECRET:key.toString('base64')})),key);assert.equal(await deriveAssetKey({}),null);
});
test('HTTP local login uses a WebKit-compatible cookie; HTTPS and proxy use the secure cookie',async()=>{
 for(const [origin,forwarded,secure]of [['http://localhost:4173','',false],['https://home.example','',true],['http://proxy.internal','https, http',true]]){
  const request=new Request(origin+'/api/documents/login',{method:'POST',headers:{Origin:origin,'x-forwarded-proto':forwarded,'x-real-ip':origin, 'Content-Type':'application/json'},body:JSON.stringify({password:env.DOCUMENTS_PASSWORD})});
  const response=await documentAuthRoute(request,env),cookie=response.headers.get('set-cookie');assert.equal(response.status,200);assert.equal(cookie.includes('; Secure;'),secure);assert(cookie.startsWith(secure?'__Host-home-documents=':'home-documents='));
  assert(await documentSession(new Request(origin,{headers:{Cookie:cookie.split(';')[0]}}),env));
 }
 assert.equal(readCookie('home-documents=dev; __Host-home-documents=secure'),'secure');assert.equal(readCookie('__Host-home-documents=a; __Host-home-documents=b; home-documents=dev'),null);
 assert.equal(clientKey(new Request('https://home.example',{headers:{'x-real-ip':' 1.2.3.4, 5.6.7.8 '}})),'1.2.3.4');
});
test('range cache avoids repeat file reads, evicts LRU entries and binds hits to secret and ciphertext',async()=>{
 const key=Buffer.from(await deriveAssetKey(env));let reads=0;
 const make=n=>{const path='/house/cache-'+n+'.mp4',iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(path));const encrypted=Buffer.concat([cipher.update(Buffer.from('0123456789')),cipher.final(),cipher.getAuthTag()]);return {entry:{path,iv:iv.toString('base64'),type:'video/mp4'},load:async()=>{reads++;return encrypted;}};};
 const open=(asset,configured=env)=>decryptedDocumentResponse(new Request('https://home.example'+asset.entry.path,{headers:{Range:'bytes=2-5'}}),configured,asset.entry,asset.load);
 const first=make('first');assert.equal(await (await open(first)).text(),'2345');await open(first);assert.equal(reads,1);
 assert.equal((await open(first,{...env,DOCUMENTS_SECRET:'wrong secret'})).status,503);
 for(let i=0;i<6;i++)await open(make(i));const before=reads;await open(first);assert.equal(reads,before+1);
});

test('rate limits share normalized proxy addresses and bounded storage evicts old clients',async()=>{
 const origin='https://rate-test.example',now=Date.now();
 const attempt=(ip,time=now)=>documentAuthRoute(new Request(origin+'/api/documents/login',{method:'POST',headers:{Origin:origin,'x-real-ip':ip,'Content-Type':'application/json'},body:'[]'}),env,time);
 for(let i=0;i<8;i++)assert.equal((await attempt(`bounded-client, proxy-${i}`)).status,400);
 assert.equal((await attempt('bounded-client, next')).status,429);
 for(let i=0;i<2050;i++)await attempt('new-client-'+i);
 assert.equal((await attempt('bounded-client, next')).status,400);
 assert.equal((await attempt('bounded-client',now+16*60*1000)).status,400);
});
