import './apply-three-fixes.mjs';
import {build,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import {createPublicBaseline} from './public-baseline.mjs';
import {readdir,readFile,writeFile,mkdir,rm,copyFile,cp,access} from 'node:fs/promises';
import {join,relative} from 'node:path';
import {randomBytes,createCipheriv,createHash} from 'node:crypto';

const env={...loadEnv('production',process.cwd(),''),...process.env},key=Buffer.from(env.DOCUMENTS_ASSET_SECRET||env.DOCUMENTS_SECRET||'','base64');
if(key.length!==32)throw Error('Set DOCUMENTS_SECRET to a base64-encoded 32-byte server secret before building. No unprotected build is produced.');
await rm('dist',{recursive:true,force:true,maxRetries:8,retryDelay:200});
// Stage owner output outside the deployment tree so delayed filesystem writes
// cannot recreate plaintext in the public asset directory after sealing.
const personalBuild='.site-private/personal-build';
await rm(personalBuild,{recursive:true,force:true,maxRetries:8,retryDelay:200});
await build({base:'/_personal/',publicDir:false,build:{outDir:personalBuild,rollupOptions:{input:{index:'index.html',district:'district.html'}}}});
await build({configFile:false,root:'public-view',plugins:[react()],publicDir:false,build:{outDir:'../dist/client',emptyOutDir:false,target:'es2022'}});
await createPublicBaseline('dist/client/baseline');
const roots=['_personal','house','plans','materials'],manifest={};
// Read protected originals directly. Staging a recursive copy in the public
// output can leave late copy/temp files after sealing on a lazy filesystem.
// Only ciphertext is ever written there for these source roots.
async function seal(directory,sourceRoot,prefix=''){for(const name of await readdir(directory,{withFileTypes:true})){if(name.name.startsWith('.'))continue;const file=join(directory,name.name);if(name.isDirectory()){await seal(file,sourceRoot,prefix);continue;}const path=prefix+'/'+relative(sourceRoot,file).replaceAll('\\','/'),raw=await readFile(file),iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(path));const encrypted=Buffer.concat([cipher.update(raw),cipher.final(),cipher.getAuthTag()]),asset='/_vault/'+createHash('sha256').update(path).digest('hex')+'.bin';await writeFile(join('dist/client',asset),encrypted);const ext=path.split('.').pop().toLowerCase(),type=({pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',mp4:'video/mp4',json:'application/json',md:'text/plain',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',html:'text/html; charset=utf-8',svg:'image/svg+xml'})[ext]||'application/octet-stream';manifest[path]={path,asset,type,iv:iv.toString('base64'),size:raw.length};}}
await mkdir('dist/client/_vault',{recursive:true});
await seal(personalBuild,personalBuild,'/_personal');
await rm(personalBuild,{recursive:true,force:true,maxRetries:8,retryDelay:200});
for(const root of roots.filter(r=>r!=='_personal'))await seal(join('public',root),'public');
for(const entry of await readdir('public',{withFileTypes:true}))if(!roots.includes(entry.name)&&!entry.name.startsWith('.'))await cp(join('public',entry.name),join('dist/client',entry.name),{recursive:true});
await mkdir('.site-private',{recursive:true});await writeFile('.site-private/document-manifest.mjs','export const DOCUMENT_MANIFEST='+JSON.stringify(manifest)+';\n');
await build({configFile:false,publicDir:false,build:{ssr:'server/worker.mjs',outDir:'dist/server',target:'es2022',rollupOptions:{output:{entryFileNames:'index.js'}}}});
// Keep the final deploy tree clean after both Vite builds. A later build phase
// may recreate the public directory structure; originals must stay vault-only.
for(const root of roots)await rm(join('dist/client',root),{recursive:true,force:true,maxRetries:8,retryDelay:200});
await writeFile('dist/server/document-manifest.json',JSON.stringify(manifest));
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'home-studio',main:'index.js',compatibility_date:'2026-10-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:true,not_found_handling:'none'}},null,2));
await mkdir('dist/.openai',{recursive:true});await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
console.log(`Protected ${Object.keys(manifest).length} source files; server-only environment access, no plaintext originals in public output.`);

// Fail closed if a later build plugin ever recreates private plaintext.
for(const root of roots){try{await access(join('dist/client',root));throw Error('Protected plaintext remains in deployment output: '+root);}catch(error){if(error.code!=='ENOENT')throw error;}}
