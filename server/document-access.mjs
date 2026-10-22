// Server-only. Never import this module from src/ or expose environment values.
export const DOCUMENT_SESSION_MS=2*60*60*1000;
const encoder=new TextEncoder(),cookieName='__Host-home-documents',attempts=new Map();
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Vary':'Cookie','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'};
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
function unb64(value){if(!/^[A-Za-z0-9_-]+$/.test(value)||value.length>4096)throw Error('Invalid token');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
export function documentSecret(env){const value=env?.DOCUMENTS_SECRET;if(typeof value!=='string')return null;try{const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));return bytes.length===32?bytes:null;}catch{return null;}}
export const documentsConfigured=env=>typeof env?.DOCUMENTS_PASSWORD==='string'&&env.DOCUMENTS_PASSWORD.length>0&&!!documentSecret(env);
async function hmac(env,data){const key=await crypto.subtle.importKey('raw',documentSecret(env),{name:'HMAC',hash:'SHA-256'},false,['sign']);return new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(data)));}
async function passwordVersion(env){return b64(await hmac(env,'password-version\0'+env.DOCUMENTS_PASSWORD));}
async function passwordHash(password,env){const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',salt:documentSecret(env),iterations:100000,hash:'SHA-256'},key,256));}
export async function verifyDocumentPassword(password,env){if(!documentsConfigured(env)||typeof password!=='string'||encoder.encode(password).length>256)return false;const [actual,expected]=await Promise.all([passwordHash(password,env),passwordHash(env.DOCUMENTS_PASSWORD,env)]);let difference=actual.length^expected.length;for(let i=0;i<expected.length;i++)difference|=actual[i]^expected[i];return difference===0;}
export async function documentSession(request,env,now=Date.now()){
 if(!documentsConfigured(env))return null;const cookies=(request.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));if(cookies.length!==1)return null;
 try{const token=cookies[0].slice(cookieName.length+1);if(token.length>2048)return null;const [body,signature,...rest]=token.split('.');if(rest.length||!signature)return null;const key=await crypto.subtle.importKey('raw',documentSecret(env),{name:'HMAC',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('HMAC',key,unb64(signature),encoder.encode(body)))return null;const data=JSON.parse(new TextDecoder().decode(unb64(body)));return data.v===1&&data.exp>now&&data.exp<=now+DOCUMENT_SESSION_MS&&data.pv===await passwordVersion(env)?data:null;}catch{return null;}
}
async function sessionCookie(env,now){const body=b64(encoder.encode(JSON.stringify({v:1,exp:now+DOCUMENT_SESSION_MS,pv:await passwordVersion(env),nonce:b64(crypto.getRandomValues(new Uint8Array(16)))})));return `${cookieName}=${body}.${b64(await hmac(env,body))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${DOCUMENT_SESSION_MS/1000}`;}
function json(data,status=200,extra={}){return new Response(JSON.stringify(data),{status,headers:{...privateHeaders,'Content-Type':'application/json; charset=utf-8',...extra}});}
function sameOrigin(request){return request.headers.get('origin')===new URL(request.url).origin&&request.headers.get('sec-fetch-site')!=='cross-site';}
function safeReturn(value){if(typeof value!=='string'||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/';try{const url=new URL(value,'https://local.invalid');return url.origin==='https://local.invalid'?url.pathname+url.search:'/';}catch{return '/';}}
function rateKey(request){return request.headers.get('cf-connecting-ip')||request.headers.get('x-real-ip')||'anonymous';}
export async function documentAuthRoute(request,env,now=Date.now()){
 const path=new URL(request.url).pathname;
 if(path==='/api/documents/session'){if(request.method!=='GET')return json({error:'Method not allowed'},405);const session=await documentSession(request,env,now);return json({authorized:!!session,configured:documentsConfigured(env),...(session?{expiresAt:session.exp}:{})});}
 if(!['/api/documents/login','/api/documents/logout'].includes(path))return null;
 if(request.method!=='POST')return json({error:'Method not allowed'},405,{Allow:'POST'});
 if(!sameOrigin(request))return json({error:'Invalid origin'},403);
 if(path.endsWith('/logout'))return json({authorized:false},200,{'Set-Cookie':`${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`});
 if(!documentsConfigured(env))return json({error:'Document access is not configured'},503);
 const key=rateKey(request),previous=attempts.get(key);let record=previous&&now-previous.start<15*60*1000?previous:{start:now,count:0};if(record.count>=8)return json({error:'Too many attempts'},429,{'Retry-After':String(Math.max(1,Math.ceil((record.start+15*60*1000-now)/1000)))});
 record.count++;attempts.set(key,record);if(attempts.size>4096){for(const [k,v] of attempts)if(now-v.start>15*60*1000)attempts.delete(k);while(attempts.size>4096)attempts.delete(attempts.keys().next().value);}
 let input;try{const chunks=[];let length=0;const reader=request.body?.getReader();if(reader)while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>1024){await reader.cancel();return json({error:'Invalid request'},413);}chunks.push(value);}const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const text=new TextDecoder().decode(bytes);input=(request.headers.get('content-type')||'').includes('application/json')?JSON.parse(text):Object.fromEntries(new URLSearchParams(text));}catch{return json({error:'Invalid request'},400);}
 if(!input||typeof input!=='object'||Array.isArray(input))return json({error:'Invalid request'},400);
 if(!await verifyDocumentPassword(input.password,env))return json({error:'Incorrect password'},401);
 attempts.delete(key);const cookie=await sessionCookie(env,now);
 if(!(request.headers.get('content-type')||'').includes('application/json'))return new Response(null,{status:303,headers:{...privateHeaders,'Set-Cookie':cookie,Location:safeReturn(input.returnTo)}});
 return json({authorized:true,expiresAt:now+DOCUMENT_SESSION_MS},200,{'Set-Cookie':cookie});
}
export function documentLockedResponse(request){
 if(!(request.headers.get('accept')||'').includes('text/html'))return json({error:'Document password required'},401);
 const url=new URL(request.url),escaped=(url.pathname+url.search).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return new Response(`<!doctype html><html lang="he" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>מסמכים מוגנים · Home Studio</title><style>body{font:18px system-ui;background:#f3f1e8;color:#34473c;display:grid;place-items:center;min-height:90vh}form{width:min(85vw,360px);background:white;border-radius:16px;padding:28px}input,button{box-sizing:border-box;width:100%;padding:13px;margin:10px 0;font:inherit}button{background:#3e5642;color:white;border:0;border-radius:8px}</style><form method="post" action="/api/documents/login"><h1>מסמכים ותמונות</h1><p>יש להזין סיסמה כדי לפתוח את הקובץ.</p><input type="hidden" name="returnTo" value="${escaped}"><label>סיסמה<input type="password" name="password" autocomplete="current-password" required autofocus maxlength="256"></label><button>פתיחת הקובץ</button><a href="/">חזרה לבית</a></form></html>`,{status:401,headers:{...privateHeaders,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'self'; base-uri 'none'"}});
}
export function canonicalDocumentPath(path){try{const decoded=decodeURIComponent(path);return decoded.startsWith('/')&&!decoded.includes('\\')&&!decoded.includes('\0')&&!decoded.split('/').some(s=>s==='.'||s==='..')?decoded:null;}catch{return null;}}
export function isProtectedDocument(path){const p=canonicalDocumentPath(path);return !!p&&(p.startsWith('/house/')||p.startsWith('/plans/')||p.startsWith('/materials/owner-products/')||p.startsWith('/materials/harash/'));}
export async function decryptedDocumentResponse(request,env,entry,encrypted){
 let clear;try{const key=await crypto.subtle.importKey('raw',documentSecret(env),'AES-GCM',false,['decrypt']);clear=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(atob(entry.iv),c=>c.charCodeAt(0)),additionalData:encoder.encode(entry.path)},key,encrypted));}catch{return json({error:'Document unavailable'},503);}
 const headers={...privateHeaders,'Content-Type':entry.type,'Content-Disposition':`inline; filename*=UTF-8''${encodeURIComponent(entry.path.split('/').pop())}`,'Accept-Ranges':'bytes'};let status=200,data=clear;const range=request.headers.get('range');
 if(range){const match=range.match(/^bytes=(\d*)-(\d*)$/);if(!match||!match[1]&&!match[2])return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${clear.length}`}});const start=match[1]?Number(match[1]):Math.max(0,clear.length-Number(match[2])),end=match[1]?(match[2]?Math.min(clear.length-1,Number(match[2])):clear.length-1):clear.length-1;if(start>end||start>=clear.length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end))return new Response(null,{status:416,headers:{...headers,'Content-Range':`bytes */${clear.length}`}});data=clear.subarray(start,end+1);status=206;headers['Content-Range']=`bytes ${start}-${end}/${clear.length}`;}
 headers['Content-Length']=String(data.byteLength);return new Response(request.method==='HEAD'?null:data,{status,headers});
}
