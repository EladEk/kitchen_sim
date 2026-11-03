// Exercise the compiled production Worker and the portable Vercel adapter with
// real built ciphertexts, Fetch requests and a local stand-in asset binding.
import assert from 'node:assert/strict';
import {readFile,readdir,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {loadEnv} from 'vite';
import worker from '../dist/server/index.js';
import vercel from '../api/documents.js';
const env={...loadEnv('production',process.cwd(),''),...process.env},origin='https://home.example',manifest=JSON.parse(await readFile('dist/server/document-manifest.json','utf8'));
for(const key of ['DOCUMENTS_PASSWORD','DOCUMENTS_SECRET'])assert(env[key],`server key ${key} configured`);
const types={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png'};
const ASSETS={async fetch(request){try{const path=decodeURIComponent(new URL(request.url).pathname);assert(!path.includes('..'));const b=await readFile(join('dist/client',path));return new Response(b,{headers:{'Content-Type':types[path.split('.').pop()]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}};
const bound={...env,ASSETS},request=(path,init={})=>new Request(origin+path,init),fetch=(path,init)=>worker.fetch(request(path,init),bound);
assert.equal((await fetch('/')).status,404); // asset helper does not rewrite directory indexes
assert.equal((await fetch('/',{headers:{Accept:'text/html'}})).status,200);
assert.equal((await fetch('/api/documents/session')).status,200);assert.equal((await (await fetch('/api/documents/session')).json()).authorized,false);
const all=Object.values(manifest);assert(all.length>=150);const protectedPaths=['/house/pump-room/298244.jpg','/house/house-plan.pdf','/house/photos/photo-1.jpg','/house/photos/walkthrough.mp4','/house/residents-club/298245.mp4','/house/residents-club/frame-1.jpg','/plans/plan.jpg','/materials/owner-products/MI402439-tile.jpg','/materials/harash/classico-cement.jpeg'];
for(const p of protectedPaths){const r=await fetch(p);assert.equal(r.status,401);assert.match(r.headers.get('cache-control'),/no-store/);}
assert.equal((await fetch('/house/%2Fphotos/photo-1.jpg')).status,401);
const bad=await fetch('/api/documents/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:'wrong'})});assert.equal(bad.status,401);
const opened=await fetch('/api/documents/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({password:env.DOCUMENTS_PASSWORD})});assert.equal(opened.status,200);const cookie=opened.headers.get('set-cookie').split(';')[0];
for(const path of ['/house/pump-room/298244.jpg','/house/house-plan.pdf','/house/photos/photo-1.jpg','/house/residents-club/frame-1.jpg','/materials/owner-products/MI402439-tile.jpg']){const r=await fetch(path,{headers:{Cookie:cookie}});assert.equal(r.status,200);const clear=Buffer.from(await r.arrayBuffer()),original=await readFile('public'+path);assert.equal(createHash('sha256').update(clear).digest('hex'),createHash('sha256').update(original).digest('hex'));}
const video=all.find(e=>e.path==='/house/residents-club/298245.mp4');const part=await fetch(video.path,{headers:{Cookie:cookie,Range:'bytes=0-511'}});assert.equal(part.status,206);assert.equal((await part.arrayBuffer()).byteLength,512);
assert.equal((await fetch('/house/missing.pdf',{headers:{Cookie:cookie}})).status,404);
// Even if a static host bypasses the Worker, it holds only authenticated
// ciphertext and rendering crops; complete source photos/PDFs are absent.
for(const prefix of ['house','plans','materials/owner-products','materials/harash'])await assert.rejects(stat('dist/client/'+prefix),{code:'ENOENT'});
for(const entry of all){const bytes=await readFile(join('dist/client',entry.asset));assert.equal(bytes.length,entry.size+16);assert.notEqual(bytes.subarray(0,4).toString(),'%PDF');}
async function scan(dir){for(const e of await readdir(dir,{withFileTypes:true})){const path=join(dir,e.name);if(e.isDirectory())await scan(path);else if(/\.(js|json|html|css|map)$/.test(e.name)){const s=await readFile(path,'utf8');assert(!s.includes(env.DOCUMENTS_PASSWORD),'password absent from browser code');assert(!s.includes(env.DOCUMENTS_SECRET),'key absent from browser code');if(env.DOCUMENTS_ASSET_SECRET)assert(!s.includes(env.DOCUMENTS_ASSET_SECRET),'asset key absent from browser code');}}}await scan('dist/client');
assert.equal((await fetch('/materials/runtime/MI402439-sample.png')).status,401,'owner material samples retain the R99 password boundary');assert.equal((await fetch('/materials/runtime/MI402439-sample.png',{headers:{Cookie:cookie}})).status,200,'owner material samples remain available to the authorized personal scene');
const saved={};for(const k of ['DOCUMENTS_PASSWORD','DOCUMENTS_SECRET']){saved[k]=process.env[k];process.env[k]=env[k];}
async function invoke(url,method='GET',body,headers={}){const req=Readable.from(body?[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]:[]);Object.assign(req,{url,method,headers:{host:'home.example',...headers},socket:{remoteAddress:'127.0.0.1'},...(body&&typeof body==='object'?{body}:{})});const response={headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(b){this.body=b;}};await vercel(req,response);return response;}
try{assert.equal((await invoke('/api/documents?resource=house/house-plan.pdf')).statusCode,401);const logged=await invoke('/api/documents?action=login','POST',{password:env.DOCUMENTS_PASSWORD},{origin,'content-type':'application/json'});assert.equal(logged.statusCode,200);const c=logged.headers['set-cookie'].split(';')[0];assert.equal((await invoke('/api/documents?resource=house/house-plan.pdf','GET',null,{cookie:c})).statusCode,200);assert.equal((await invoke('/api/documents?resource=house/house-plan.pdf','POST','x',{cookie:c})).statusCode,405);const form=await invoke('/api/documents?action=login','POST',{password:env.DOCUMENTS_PASSWORD,returnTo:'/house/house-plan.pdf'},{origin,'content-type':'application/x-www-form-urlencoded'});assert.equal(form.statusCode,303);assert.equal(form.headers.location,'/house/house-plan.pdf');}finally{for(const k of Object.keys(saved))saved[k]==null?delete process.env[k]:process.env[k]=saved[k];}
console.log(JSON.stringify({compiledWorker:'passed',vercelAdapter:'passed',encryptedSources:all.length,directUrlDenied:true,authorizedOriginalHashes:true,videoRange:true,clientSecretsAbsent:true,renderingFloorAvailable:true}));
