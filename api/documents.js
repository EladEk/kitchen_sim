import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {documentAuthRoute,documentSession,documentLockedResponse,canonicalDocumentPath,decryptedDocumentResponse} from '../server/document-access.mjs';

export default async function handler(req,res){
 try{
  const origin=`https://${req.headers.host}`,input=new URL(req.url,origin),action=input.searchParams.get('action'),resource=input.searchParams.get('resource');let route=action?`/api/documents/${action}`:resource?'/'+resource.replace(/^\//,''):input.pathname;
  if(!['session','login','logout'].includes(action)&&!resource){res.statusCode=404;res.end();return;}
  const headers=new Headers();for(const [k,value] of Object.entries(req.headers))if(value!=null)headers.set(k,Array.isArray(value)?value.join(','):String(value));
  headers.delete('cf-connecting-ip');headers.set('x-real-ip',req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'anonymous');let body;if(!['GET','HEAD'].includes(req.method)){if(req.body!=null)body=typeof req.body==='string'?req.body:(headers.get('content-type')||'').includes('application/json')?JSON.stringify(req.body):new URLSearchParams(req.body).toString();else{const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>1024){res.statusCode=413;res.end();return;}chunks.push(c);}body=Buffer.concat(chunks);}}
  const request=new Request(new URL(route,origin),{method:req.method,headers,...(body?{body}:{} )});let response=await documentAuthRoute(request,process.env);
  if(!response&&!['GET','HEAD'].includes(request.method))response=new Response(null,{status:405});
  if(!response){if(!await documentSession(request,process.env))response=documentLockedResponse(request);else{const manifest=JSON.parse(await readFile(join(process.cwd(),'dist/server/document-manifest.json'),'utf8')),path=canonicalDocumentPath(route),entry=manifest[path];if(!entry)response=new Response('Not found',{status:404});else{const encrypted=await readFile(join(process.cwd(),'dist/client',entry.asset));response=await decryptedDocumentResponse(request,process.env,entry,encrypted);}}}
  res.statusCode=response.status;for(const [k,v] of response.headers)res.setHeader(k,v);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch{res.statusCode=503;res.setHeader('Cache-Control','private, no-store');res.end('Document service unavailable');}
}
