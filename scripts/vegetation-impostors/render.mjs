// R185 vegetation impostors: renders a CC0 Poly Haven plant (orthographic,
// three side views + one top view, transparent background) into a 2x2 atlas.
// usage: node scripts/vegetation-impostors/render.mjs <polyhaven-id> <out.png> [tile] [node]
// Sources: .site-private/vegetation-src/<id>/src/<id>.gltf (python fetch from api.polyhaven.com).
// Needs playwright-core and a Chrome at CHROME (default /usr/bin/google-chrome).
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const [model,out,tile='512',node='']=process.argv.slice(2);
const roots={'/three/':path.join(repo,'node_modules/three/'),'/src/':path.join(repo,'.site-private/vegetation-src/'),'/':here+'/'};
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.gltf':'model/gltf+json','.bin':'application/octet-stream','.jpg':'image/jpeg','.png':'image/png'};
const server=http.createServer((q,r)=>{const u=decodeURIComponent(new URL(q.url,'http://x').pathname);const prefix=Object.keys(roots).find(p=>u.startsWith(p));const file=path.join(roots[prefix],u.slice(prefix.length));if(!file.startsWith(roots[prefix])||!fs.existsSync(file)){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(r);});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const port=server.address().port;
const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/google-chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox']});
try{const page=await browser.newPage();page.on('pageerror',e=>console.error(e.message));
 await page.goto(`http://127.0.0.1:${port}/render.html?m=${model}&tile=${tile}&node=${encodeURIComponent(node)}`);await page.waitForFunction(()=>window.__png,null,{timeout:900000});
 const r=await page.evaluate(()=>({out:window.__out,png:window.__png}));fs.writeFileSync(out,Buffer.from(r.png.split(',')[1],'base64'));console.log(JSON.stringify(r.out));
}finally{await browser.close();server.close();}
