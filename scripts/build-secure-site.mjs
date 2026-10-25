import {build,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {createPublicBaseline} from './public-baseline.mjs';
import {readdir,readFile,writeFile,mkdir,rm,copyFile,cp} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {randomBytes,createCipheriv,createHash} from 'node:crypto';

const env={...loadEnv('production',process.cwd(),''),...process.env},key=Buffer.from(env.DOCUMENTS_SECRET||'','base64');
if(key.length!==32)throw Error('Set DOCUMENTS_SECRET to a base64-encoded 32-byte server secret before building. No unprotected build is produced.');
await rm('dist',{recursive:true,force:true});
// Owner app is built in a separate protected namespace, with no public imports.
await build({base:'/_personal/',publicDir:false,build:{outDir:'dist/client/_personal'}});
await build({configFile:false,root:'public-view',plugins:[react()],publicDir:false,build:{outDir:'../dist/client',emptyOutDir:false,target:'es2022'}});
await createPublicBaseline('dist/client/baseline');
// Original assets are copied only for sealing, never published in plaintext.
await cp('public','dist/client',{recursive:true});
const roots=['_personal','house','plans','materials'],manifest={};
async function seal(directory){for(const name of await readdir(directory,{withFileTypes:true})){const file=join(directory,name.name);if(name.isDirectory()){await seal(file);continue;}const path='/'+relative('dist/client',file).replaceAll('\\','/'),raw=await readFile(file),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(path));const encrypted=Buffer.concat([cipher.update(raw),cipher.final(),cipher.getAuthTag()]),asset='/_vault/'+createHash('sha256').update(path).digest('hex')+'.bin';await writeFile(join('dist/client',asset),encrypted);const ext=path.split('.').pop().toLowerCase(),type=({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',json:'application/json',md:'text/plain',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8',svg:'image/svg+xml'})[ext]||'application/octet-stream';manifest[path]={path,asset,type,iv:iv.toString('base64'),size:raw.length};await rm(file);}}
await mkdir('dist/client/_vault',{recursive:true});for(const root of roots){await seal(join('dist/client',root));await rm(join('dist/client',root),{recursive:true,force:true});}
await mkdir('.site-private',{recursive:true});await writeFile('.site-private/document-manifest.mjs','export const DOCUMENT_MANIFEST='+JSON.stringify(manifest)+';\n');
await build({configFile:false,publicDir:false,build:{ssr:'server/worker.mjs',outDir:'dist/server',target:'es2022',rollupOptions:{output:{entryFileNames:'index.js'}}}});
// Keep the final deploy tree clean after both Vite builds. A later build phase
// may recreate the public directory structure; originals must stay vault-only.
for(const root of roots)await rm(join('dist/client',root),{recursive:true,force:true});
await writeFile('dist/server/document-manifest.json',JSON.stringify(manifest));
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'home-studio',main:'index.js',compatibility_date:'2026-10-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true,not_found_handling:'none'}},null,2));
await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log(`Protected ${Object.keys(manifest).length} source files; server-only environment access, no plaintext originals in public output.`);
