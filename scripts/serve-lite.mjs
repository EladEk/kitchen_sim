import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {loadEnv} from 'vite';
import worker from '../dist/server/index.js';

const root=resolve('dist/client'),env={...loadEnv('production',process.cwd(),''),...process.env};
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.bin':'application/octet-stream','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.ktx2':'image/ktx2','.glb':'model/gltf-binary','.wasm':'application/wasm'};
env.ASSETS={async fetch(request){
 const url=new URL(request.url);let path;try{path=decodeURIComponent(url.pathname);}catch{return new Response('Not found',{status:404});}
 const file=resolve(root,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(root+'/'))return new Response('Not found',{status:404});
 try{if(!(await stat(file)).isFile())return new Response('Not found',{status:404});return new Response(await readFile(file),{headers:{'Content-Type':mime[extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}};
const server=createServer(async(req,res)=>{
 try{
  const protocol='http:',host=req.headers.host||'localhost:4173',headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(value!=null)headers.set(name,Array.isArray(value)?value.join(','):value);
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024){res.writeHead(413);res.end();return;}chunks.push(chunk);}
  const body=Buffer.concat(chunks),request=new Request(new URL(req.url,protocol+'//'+host),{method:req.method,headers,...(body.length?{body}:{} )}),response=await worker.fetch(request,env);
  res.statusCode=response.status;for(const [name,value]of response.headers)if(name!=='set-cookie')res.setHeader(name,value);const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch{res.writeHead(500,{'Cache-Control':'no-store'});res.end('Request failed');}
});
const port=Number(process.env.PORT)||4173,host=process.env.HOST||'127.0.0.1';server.listen(port,host,()=>console.log(`HOME STUDIO: http://localhost:${port}\nBound address: http://${host}:${port}`));
