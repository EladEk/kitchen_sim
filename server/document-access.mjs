// Server-only. Never import this module from src/ or expose environment values.
import {BUILD_ASSET_SECRET} from './build-asset-key.mjs';
import {base64Key,deriveAssetKey} from './asset-key.mjs';
export const DOCUMENT_SESSION_MS=2*60*60*1000;
const encoder=new TextEncoder(),attempts=new Map();
const SECURE_COOKIE_NAME='__Host-home-documents',DEV_COOKIE_NAME='home-documents';
const MAX_CACHE_BYTES=48*1024*1024,MAX_CACHE_ENTRIES=6,decryptedCache=new Map();let cacheBytes=0;
export function isSecureRequest(request){return new URL(request.url).protocol==='https:'||(request.headers.get('x-forwarded-proto')||'').split(',')[0].trim()==='https';}
export function sessionCookie(value,maxAgeSeconds,secure=true){return `${secure?SECURE_COOKIE_NAME:DEV_COOKIE_NAME}=${value}; Path=/; HttpOnly;${secure?' Secure;':''} SameSite=Strict; Max-Age=${maxAgeSeconds}`;}
export function readCookie(header=''){const cookies=header.split(';').map(s=>s.trim());for(const name of [SECURE_COOKIE_NAME,DEV_COOKIE_NAME]){const found=cookies.filter(s=>s.startsWith(name+'='));if(found.length)return found.length===1?found[0].slice(name.length+1):null;}return null;}
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function unb64(value){if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length>4096)throw Error('Invalid token');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export function documentSecret(env){const value=env?.DOCUMENTS_SECRET;return base64Key(value)||(typeof value==='string'&&value.trim()?encoder.encode(value):null);}
async function assetSecret(env){const configured=await deriveAssetKey(env);return configured||(!(env?.DOCUMENTS_SECRET||env?.DOCUMENTS_ASSET_SECRET)?base64Key(BUILD_ASSET_SECRET):null);}
export const documentsConfigured=env=>typeof env?.DOCUMENTS_PASSWORD==='string'&&env.DOCUMENTS_PASSWORD.length>0&&!!documentSecret(env);
async function hmac(env,data){const key=await crypto.subtle.importKey('raw',documentSecret(env),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(data)));}
async function passwordVersion(env){return b64(await hmac(env,'password-version\0'+env.DOCUMENTS_PASSWORD));}
async function passwordHash(password,env){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:documentSecret(env),iterations:100000,hash:'SHA-256'},key,256));}
export async function verifyDocumentPassword(password,env){if(!documentsConfigured(env)||typeof password!=='string'||encoder.encode(password).length>256)return false;const [actual,expected]=await Promise.all([passwordHash(password,env),passwordHash(env.DOCUMENTS_PASSWORD,env)]);let difference=actual.length^expected.length;for(let i=0;i<expected.length;i++)difference|=actual[i]^expected[i];return difference===0;}
export async function documentSession(request,env,now=Date.now()){
 if(!documentsConfigured(env))return null;const token=readCookie(request.headers.get('cookie')||'');if(!token)return null;
 try{if(token.length>2048)return null;const [body,signature,...rest]=token.split('.');if(rest.length||!signature)return null;const key=await crypto.subtle.importKey('raw',documentSecret(env),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',key,unb64(signature),encoder.encode(body)))return null;const data=JSON.parse(new TextDecoder().decode(unb64(body)));return data.v===1&&data.exp>now&&data.exp<=now+DOCUMENT_SESSION_MS&&data.pv===await passwordVersion(env)?data:null;}catch{return null;}
}
async function signedSessionCookie(request,env,now){const body=b64(encoder.encode(JSON.stringify({v:1,exp:now+DOCUMENT_SESSION_MS,pv:await passwordVersion(env),nonce:b64(crypto.getRandomValues(new Uint8Array(16)))})));return sessionCookie(`${body}.${b64(await hmac(env,body))}`,DOCUMENT_SESSION_MS/1000,isSecureRequest(request));}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...privateHeaders,'Content-Type':'application/json; charset=utf-8',...extra}});}
function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';}
function safeReturn(value){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/';try{const url=new URL(value,'https://local.invalid');return url.origin==='https://local.invalid'?url.pathname+url.search:'/';}catch{return '/';}}
export function clientKey(request){return (request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||request.headers.get('x-vercel-forwarded-for')||'anonymous').split(',')[0].trim()||'anonymous';}
function rateLimited(request,now){
 if(attempts.size>512)for(const [key,value]of attempts)if(now-value.start>=15*60*1000)attempts.delete(key);
 const key=clientKey(request),previous=attempts.get(key),record=previous&&now-previous.start<15*60*1000?previous:{start:now,count:0};
 if(record.count>=8)return {key,retry:Math.max(1,Math.ceil((record.start+15*60*1000-now)/1000))};
 record.count++;attempts.set(key,record);while(attempts.size>2048)attempts.delete(attempts.keys().next().value);return {key};
}
export async function documentAuthRoute(request,env,now=Date.now()){
 const path=new URL(request.url).pathname;
 if(path==='/api/documents/session'){if(request.method!=='GET')return json({error:'Method not allowed'},405);const session=await documentSession(request,env,now);return json({authorized:!!session,configured:documentsConfigured(env),...(session?{expiresAt:session.exp}:{})});}
 if(!['/api/documents/login','/api/documents/logout'].includes(path))return null;
 if(request.method!=='POST')return json({error:'Method not allowed'},405,{Allow:'POST'});
 if(!sameOrigin(request))return json({error:'Invalid origin'},403);
 if(path.endsWith('/logout'))return json({authorized:false},200,{'Set-Cookie':sessionCookie('',0,isSecureRequest(request))});
 if(!documentsConfigured(env))return json({error:'Document access is not configured'},503);
 const {key,retry}=rateLimited(request,now);if(retry)return json({error:'Too many attempts'},429,{'Retry-After':String(retry)});
 let input;try{const chunks=[];let length=0;const reader=request.body?.getReader();if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1024){await reader.cancel();return json({error:'Invalid request'},413);}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const text=new TextDecoder().decode(bytes);input=(request.headers.get('content-type')||'').includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));}catch{return json({error:'Invalid request'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request'},400);
 if(!await verifyDocumentPassword(input.password,env))return json({error:'Incorrect password'},401);
 attempts.delete(key);const cookie=await signedSessionCookie(request,env,now);
 if(!(request.headers.get('content-type')||'').includes('application/json'))return new Response(null,{status:303,headers:{...privateHeaders,'Set-Cookie':cookie,Location:safeReturn(input.returnTo)}});
 return json({authorized:true,expiresAt:now+DOCUMENT_SESSION_MS},200,{'Set-Cookie':cookie});
}
export function documentLockedResponse(request){
 if(!(request.headers.get('accept')||'').includes('text/html'))return json({error:'Document password required'},401);
 const url=new URL(request.url),escaped=(url.pathname+url.search).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return new Response(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מסמכים מוגנים · Home Studio</title><style>body{font:18px system-ui;background:#f3f1e8;color:#34473c;display:grid;place-items:center;min-height:90vh}form{width:min(85vw,360px);background:white;border-radius:16px;padding:28px}input,button{box-sizing:border-box;width:100%;padding:13px;margin:10px 0;font:inherit}button{background:#3e5642;color:white;border:0;border-radius:8px}</style><form method="post" action="/api/documents/login"><h1>מסמכים ותמונות</h1><p>יש להזין סיסמה כדי לפתוח את הקובץ.</p><input type="hidden" name="returnTo" value="${escaped}"><label>סיסמה<input type="password" name="password" autocomplete="current-password" required autofocus maxlength="256"></label><button>פתיחת הקובץ</button><a href="/">חזרה לבית</a></form></html>`,{status:401,headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; base-uri 'none'"}});
}
export function canonicalDocumentPath(path){try{const decoded=decodeURIComponent(path);return decoded.startsWith('/')&&!decoded.includes('\\')&&!decoded.includes('\0')&&!decoded.split('/').some(s=>s==='.'||s==='..')?decoded:null;}catch{return null;}}
export function isProtectedDocument(path){const p=canonicalDocumentPath(path);return !!p&&(p==='/_personal'||p.startsWith('/_personal/')||p.startsWith('/house/')||p.startsWith('/plans/')||p==='/materials'||p.startsWith('/materials/'));}
export async function decryptedDocumentResponse(request,env,entry,encrypted){
 let clear;try{
  const primary=await assetSecret(env),embedded=base64Key(BUILD_ASSET_SECRET);const secret=primary||embedded;if(!secret)throw Error('Asset key unavailable');
  // Bind cache hits to the key and authenticated ciphertext identity, not just a
  // pathname. Secret rotation and new builds must never expose stale plaintext.
  const identity=entry.iv+'|'+(entry.asset||'')+'|'+b64(secret)+'|'+(embedded?b64(embedded):''),cached=decryptedCache.get(entry.path);
  if(cached?.identity===identity){clear=cached.clear;decryptedCache.delete(entry.path);decryptedCache.set(entry.path,cached);}
  else{
   const bytes=typeof encrypted==='function'?await encrypted():encrypted,key=await crypto.subtle.importKey('raw',secret,'AES-GCM',false,['decrypt']);
   const algorithm={name:'AES-GCM',iv:Uint8Array.from(atob(entry.iv),c=>c.charCodeAt(0)),additionalData:encoder.encode(entry.path)};
   try{clear=new Uint8Array(await crypto.subtle.decrypt(algorithm,key,bytes));}
   catch(error){
    // Runtime secrets are not readable by local Sites builds. Only a Worker
    // built without configuration embeds this fallback; Vercel source and
    // configured builds contain no embedded key. Authentication still gates it.
    if(!embedded||b64(embedded)===b64(secret))throw error;
    const localKey=await crypto.subtle.importKey('raw',embedded,'AES-GCM',false,['decrypt']);clear=new Uint8Array(await crypto.subtle.decrypt(algorithm,localKey,bytes));
   }
   if(clear.byteLength<=MAX_CACHE_BYTES){
    const old=decryptedCache.get(entry.path);if(old){cacheBytes-=old.clear.byteLength;decryptedCache.delete(entry.path);}
    while(decryptedCache.size>=MAX_CACHE_ENTRIES||cacheBytes+clear.byteLength>MAX_CACHE_BYTES){const first=decryptedCache.keys().next().value;cacheBytes-=decryptedCache.get(first).clear.byteLength;decryptedCache.delete(first);}
    decryptedCache.set(entry.path,{identity,clear});cacheBytes+=clear.byteLength;
   }
  }
 }catch{return json({error:'Document unavailable'},503);}
 const headers={...privateHeaders,'Content-Type':entry.type,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(entry.path.split('/').pop())}`,'Accept-Ranges':'bytes'};let status=200,data=clear;const range=request.headers.get('range');
 if(range){const match=range.match(/^bytes=(\d*)-(\d*)$/);if(!match||!match[1]&&!match[2])return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${clear.length}`}});const start=match[1]?Number(match[1]):Math.max(0,clear.length-Number(match[2])),end=match[1]?(match[2]?Math.min(clear.length-1,Number(match[2])):clear.length-1):clear.length-1;if(start>end||start>=clear.length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${clear.length}`}});data=clear.subarray(start,end+1);status=206;headers['Content-Range']=`bytes ${start}-${end}/${clear.length}`;}
 headers['Content-Length']=String(data.byteLength);return new Response(request.method==='HEAD'?null:data,{status,headers});
}
