import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes,createCipheriv} from 'node:crypto';
import {documentAuthRoute,documentSession,documentsConfigured,verifyDocumentPassword,documentLockedResponse,canonicalDocumentPath,isProtectedDocument,decryptedDocumentResponse,DOCUMENT_SESSION_MS} from '../server/document-access.mjs';
const env={DOCUMENTS_PASSWORD:'test-only-password',DOCUMENTS_SECRET:randomBytes(32).toString('base64')},origin='https://home.example',now=Date.now();let n=0;
const login=(password,extra={},time=now)=>documentAuthRoute(new Request(origin+'/api/documents/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':String(++n),...extra},body:JSON.stringify({password})}),env,time);
const req=(path='/',cookie='',extra={})=>new Request(origin+path,{headers:{Cookie:cookie,...extra}});

test('server configuration fails closed and password verification never returns environment values',async()=>{
 assert(!documentsConfigured({}));assert(!documentsConfigured({...env,DOCUMENTS_SECRET:'invalid'}));assert(await verifyDocumentPassword(env.DOCUMENTS_PASSWORD,env));assert(!await verifyDocumentPassword('wrong',env));assert(!await verifyDocumentPassword('a'.repeat(300),env));
 const response=await documentAuthRoute(req('/api/documents/session'),{});assert.deepEqual(await response.json(),{authorized:false,configured:false});
 const unavailable=await documentAuthRoute(new Request(origin+'/api/documents/login',{method:'POST',headers:{Origin:origin},body:'password=anything'}),{});assert.equal(unavailable.status,503);
});
test('login issues a secure HttpOnly session; wrong passwords, forged, duplicate, expired and rotated sessions are rejected',async()=>{
 assert.equal((await login('wrong')).status,401);const r=await login(env.DOCUMENTS_PASSWORD);assert.equal(r.status,200);const cookie=r.headers.get('set-cookie');assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/SameSite=Strict/);assert(!cookie.includes(env.DOCUMENTS_PASSWORD));assert(!cookie.includes(env.DOCUMENTS_SECRET));const pair=cookie.split(';')[0];
 assert(await documentSession(req('/',pair),env,now+1));assert(!await documentSession(req('/',pair+'x'),env,now));assert(!await documentSession(req('/',pair+'; '+pair),env,now));assert(!await documentSession(req('/',pair),env,now+DOCUMENT_SESSION_MS+1));assert(!await documentSession(req('/',pair),{...env,DOCUMENTS_PASSWORD:'changed'},now));assert(!await documentSession(req('/',pair),{...env,DOCUMENTS_SECRET:randomBytes(32).toString('base64')},now));
 const status=await documentAuthRoute(req('/api/documents/session',pair),env,now+1);assert((await status.json()).authorized);assert.match(status.headers.get('cache-control'),/no-store/);
});
test('login enforces origin, request shape, method, size and bounded repeated failures',async()=>{
 assert.equal((await login(env.DOCUMENTS_PASSWORD,{Origin:'https://other.example'})).status,403);
 const bad=(method,body)=>new Request(origin+'/api/documents/login',{method,headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':String(++n)},...(body?{body}:{})});
 assert.equal((await documentAuthRoute(bad('GET'),env)).status,405);assert.equal((await documentAuthRoute(bad('POST','null'),env)).status,400);assert.equal((await documentAuthRoute(bad('POST','{'),env)).status,400);assert.equal((await documentAuthRoute(bad('POST','x'.repeat(1100)),env)).status,413);
 for(let i=0;i<8;i++)assert.equal((await login('wrong',{'CF-Connecting-IP':'repeat-test'})).status,401);
 assert.equal((await login(env.DOCUMENTS_PASSWORD,{'CF-Connecting-IP':'repeat-test'})).status,429);assert.equal((await login(env.DOCUMENTS_PASSWORD,{'CF-Connecting-IP':'repeat-test'},now+16*60*1000)).status,200);
});
test('direct file URLs show an unlock form; redirects stay on the same origin and logout clears the cookie',async()=>{
 const locked=documentLockedResponse(req('/house/a.jpg','',{Accept:'text/html'}));assert.equal(locked.status,401);const html=await locked.text();assert(html.includes('type="password"'));assert(!html.includes(env.DOCUMENTS_PASSWORD));
 const form=await documentAuthRoute(new Request(origin+'/api/documents/login',{method:'POST',headers:{Origin:origin,'CF-Connecting-IP':'form','Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({password:env.DOCUMENTS_PASSWORD,returnTo:'//evil.example'})}),env,now);assert.equal(form.status,303);assert.equal(form.headers.get('location'),'/');
 const logout=await documentAuthRoute(new Request(origin+'/api/documents/logout',{method:'POST',headers:{Origin:origin}}),env);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
});
test('only canonical private paths are accepted',()=>{
 assert(isProtectedDocument('/house/plan.pdf'));assert(isProtectedDocument('/plans/main.jpg'));assert(isProtectedDocument('/materials/owner-products/tile.jpg'));assert(isProtectedDocument('/materials/harash/source.jpeg'));assert(!isProtectedDocument('/materials/runtime/MI402439-sample.png'));assert.equal(canonicalDocumentPath('/house/%2e%2e/file'),null);assert.equal(canonicalDocumentPath('/house/%5cfoo'),null);assert.equal(canonicalDocumentPath('/house/%00file'),null);
});
test('encrypted sources require the correct server key and authenticated path; media supports byte ranges and HEAD',async()=>{
 const raw=Buffer.from('source-image-original-bytes'),iv=randomBytes(12),path='/house/original.jpg',cipher=createCipheriv('aes-256-gcm',Buffer.from(env.DOCUMENTS_SECRET,'base64'),iv);cipher.setAAD(Buffer.from(path));const encrypted=Buffer.concat([cipher.update(raw),cipher.final(),cipher.getAuthTag()]),entry={path,iv:iv.toString('base64'),type:'image/jpeg'};
 const opened=await decryptedDocumentResponse(req(path),env,entry,encrypted);assert.equal(opened.status,200);assert.deepEqual(Buffer.from(await opened.arrayBuffer()),raw);assert.match(opened.headers.get('cache-control'),/private, no-store/);
 const range=await decryptedDocumentResponse(req(path,'',{Range:'bytes=7-11'}),env,entry,encrypted);assert.equal(range.status,206);assert.deepEqual(Buffer.from(await range.arrayBuffer()),raw.subarray(7,12));assert.equal(range.headers.get('content-range'),`bytes 7-11/${raw.length}`);
 assert.equal((await decryptedDocumentResponse(req(path,'',{Range:'bytes=999-'}),env,entry,encrypted)).status,416);
 const head=await decryptedDocumentResponse(new Request(origin+path,{method:'HEAD'}),env,entry,encrypted);assert.equal(await head.text(),'');assert.equal(head.headers.get('content-length'),String(raw.length));
 assert.equal((await decryptedDocumentResponse(req(path),env,{...entry,path:'/house/other.jpg'},encrypted)).status,503);
 assert.equal((await decryptedDocumentResponse(req(path),{...env,DOCUMENTS_SECRET:randomBytes(32).toString('base64')},entry,encrypted)).status,503);
});
