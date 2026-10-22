import {documentAuthRoute,documentSession,documentLockedResponse,canonicalDocumentPath,isProtectedDocument,decryptedDocumentResponse} from './document-access.mjs';
import {DOCUMENT_MANIFEST} from '../.site-private/document-manifest.mjs';

export default {async fetch(request,env){
 const url=new URL(request.url),path=canonicalDocumentPath(url.pathname);if(!path)return new Response('Not found',{status:404});
 const auth=await documentAuthRoute(request,env);if(auth)return auth;
 if(isProtectedDocument(path)){
  if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405});
  if(!await documentSession(request,env))return documentLockedResponse(request);
  const entry=DOCUMENT_MANIFEST[path];if(!entry)return new Response('Not found',{status:404,headers:{'Cache-Control':'private, no-store'}});
  const assetUrl=new URL(entry.asset,url.origin),encrypted=await env.ASSETS.fetch(new Request(assetUrl,{method:'GET'}));if(!encrypted.ok)return new Response('Document unavailable',{status:503});
  return decryptedDocumentResponse(request,env,entry,await encrypted.arrayBuffer());
 }
 if(path.startsWith('/api/'))return new Response('Not found',{status:404});
 const asset=await env.ASSETS.fetch(request);if(asset.status!==404)return asset;
 if(request.method==='GET'&&(request.headers.get('accept')||'').includes('text/html')&&!path.startsWith('/_vault/'))return env.ASSETS.fetch(new Request(new URL('/index.html',url.origin),request));
 return asset;
}};
