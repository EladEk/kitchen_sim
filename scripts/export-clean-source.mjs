// Produce a runnable Clean source package without changing renderer settings.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir,copyFile,mkdtemp} from 'node:fs/promises';
import {resolve,dirname,relative,basename,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {APP_REVISION} from '../public-view/revision.mjs';
const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=resolve(process.argv[2]||join(source,'..',`HomeStudio-${APP_REVISION}-Clean.zip`));
if(!output.endsWith('.zip')||relative(source,output).split(/[\\/]/)[0]!=='..')throw Error('Choose a .zip destination outside the source checkout.');
const git=(...args)=>execFileSync('git',['-C',source,...args],{encoding:'utf8'}).trim();
if(git('status','--porcelain'))throw Error('Commit source changes before exporting.');
const commit=git('rev-parse','HEAD'),files=git('ls-files','-z').split('\0').filter(Boolean),fileSet=new Set(files);
await mkdir(dirname(output),{recursive:true});const staging=await mkdtemp(join(dirname(output),'.homestudio-clean-'));
const essentialTests=new Set(['src/apartment-view-r178.test.mjs','src/document-access.test.mjs','src/vault-runtime.test.mjs','src/scene-state.test.mjs','src/kitchen-kinematics.test.mjs','src/photoreal-lifecycle.test.mjs','src/photoreal-upgrades.test.mjs','src/material-pipeline.test.mjs','src/rendering-fixes-r173.test.mjs','public-view/photo-capture-runtime.test.mjs','public-view/gpu-selection.test.mjs','public-view/walking-dda.test.mjs']);
const selected=new Set([...(fileSet.has(`${APP_REVISION}-CHANGES.md`)?[`${APP_REVISION}-CHANGES.md`]:[]),'.env.example','.gitignore','package.json','package-lock.json','index.html','district.html','vite.config.js','vercel.json']);
for(const file of files){
 if((/^(src|public-view|server|api)\//.test(file)&&!file.endsWith('.test.mjs'))||essentialTests.has(file)||file.startsWith('public/decoders/')||file==='public/materials/interior-atlas-r22.png'||file.startsWith('public/materials/runtime/'))selected.add(file);
}
// These superseded assets are no longer read by any runtime module. Keep
// them automatically if a later version references them again.
const runtimeText=(await Promise.all(files.filter(f=>/^(src|public-view)\//.test(f)&&/\.(mjs|jsx|js)$/.test(f)&&!f.endsWith('.test.mjs')).map(f=>readFile(join(source,f),'utf8')))).join('\n');
for(const file of ['public-view/assets/limestone-r96.png','public-view/assets/furniture-r113/upholstery.glb'])if(!runtimeText.includes(basename(file)))selected.delete(file);
// Keep only build/serve scripts and their local dependency closure.
const queue=['scripts/build-secure-site.mjs','scripts/serve-lite.mjs',...files.filter(f=>/^scripts\/apply-three-.*\.mjs$/.test(f))];
while(queue.length){const file=queue.pop();if(selected.has(file))continue;selected.add(file);const text=await readFile(join(source,file),'utf8');for(const match of text.matchAll(/(?:from\s*|import\s*(?:\(\s*)?)["'](\.[^"']+)["']/g)){const target=relative(source,resolve(dirname(join(source,file)),match[1])).replaceAll('\\','/');if(target.startsWith('scripts/')&&fileSet.has(target))queue.push(target);}}
for(const file of selected){const destination=join(staging,file);await mkdir(dirname(destination),{recursive:true});await copyFile(join(source,file),destination);}
// Documentation media are optional; rendering samples and decoders are not.
const buildFile=join(staging,'scripts/build-secure-site.mjs');let build=await readFile(buildFile,'utf8');
const seal="for(const root of roots.filter(r=>r!=='_personal'))await seal(join('public',root),'public');";
if(!build.includes(seal))throw Error('Review the protected-root build loop before updating Clean export.');
build=build.replace(seal,"for(const root of roots.filter(r=>r!=='_personal')){try{await access(join('public',root));}catch(error){if(error.code==='ENOENT')continue;throw error;}await seal(join('public',root),'public');}");await writeFile(buildFile,build);
const accessFile=join(staging,'src/DocumentAccess.jsx');let ui=await readFile(accessFile,'utf8');
ui="import {REFERENCE_MEDIA_INCLUDED} from './distribution.mjs';\n"+ui;
ui=ui.replace("DocumentGate({children,lang='he'})", "DocumentGate({children,lang='he',referenceMedia=false})");
ui=ui.replace(' const {authorized,lock}=useDocumentAccess();return authorized?'," const {authorized,lock}=useDocumentAccess();if(referenceMedia&&!REFERENCE_MEDIA_INCLUDED)return <p role=\"status\">{lang==='he'?'תמונות הייחוס ומסמכי המקור אינם כלולים בחבילת הקוד הנקייה.':'Reference photos and documents are not included in the Clean package.'}</p>;return authorized?");
ui=ui.replace(' if(!protectedSource||authorized)return', ' if(protectedSource&&!REFERENCE_MEDIA_INCLUDED)return <span className="document-image-lock">{alt}</span>;\n if(!protectedSource||authorized)return');await writeFile(accessFile,ui);
await writeFile(join(staging,'src/distribution.mjs'),'// Only reference documentation is omitted; rendering assets are unchanged.\nexport const REFERENCE_MEDIA_INCLUDED=false;\n');
for(const file of ['ElectricalPhoto.jsx','CatalogueMatch.jsx','FloorPhotoComparison.jsx','KitchenElectricalCompare.jsx','HomeProducts.jsx']){const path=join(staging,'src',file);const text=await readFile(path,'utf8');await writeFile(path,text.replaceAll('<DocumentGate lang=', '<DocumentGate referenceMedia lang='));}
const pkg=JSON.parse(await readFile(join(staging,'package.json'),'utf8'));
pkg.name='home-studio-clean';pkg.scripts={postinstall:'node scripts/apply-three-fixes.mjs',dev:'npm run build && node scripts/serve-lite.mjs',build:'node scripts/build-secure-site.mjs',start:'node scripts/serve-lite.mjs',test:'node --test '+[...essentialTests].join(' ')};
const runtime=['lucide-react','n8ao','postprocessing','react','react-dom','suncalc','three','three-gpu-pathtracer','three-mesh-bvh','polygon-clipping'];
pkg.dependencies=Object.fromEntries(runtime.map(k=>[k,pkg.dependencies[k]||pkg.devDependencies[k]]));pkg.devDependencies=Object.fromEntries(['@vitejs/plugin-react','vite'].map(k=>[k,pkg.devDependencies[k]]));await writeFile(join(staging,'package.json'),JSON.stringify(pkg,null,2)+'\n');
await writeFile(join(staging,'README.md'),`# HOME STUDIO ${APP_REVISION} — Clean Source\n\nSource commit: ${commit}\n\nפרויקט נקי להרצה, עם כל תיקוני הגרסה העדכנית. מנועי WebGPU/WebGL2,\nהטקסטורות והמודלים נשמרו ללא דחיסה נוספת או שינוי באיכות. נכללים גם\nמפענחי KTX2/Basis, דגימות חומרי הרצפה והפרדה בין הגישה הציבורית והאישית.\nהוסרו תמונות וסרטוני תיעוד, קובצי PDF, צילומי QA, תוצאות בדיקות ישנות\nוכלי הפקת נכסים שאינם דרושים להרצה. ספריית הדירות והעריכה נשמרו.\n\n## הרצה\n\nNode.js 22.12 ומעלה; מומלצת Node.js 24.\n\n\`\`\`sh\nnpm ci\ncp .env.example .env.local\n\`\`\`\n\nהגדירו בקובץ המקומי DOCUMENTS_PASSWORD ו-DOCUMENTS_SECRET (מפתח בסיס־64\nשל 32 בתים או סוד ארוך). אין בחבילה סיסמאות או מפתחות של האתר החי.\nאפשר ליצור מפתח מקומי באמצעות:\n\n\`\`\`sh\nnode -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"\nnpm run dev\n\`\`\`\n\nפתחו http://localhost:4173. הפקודה בונה גם את האתר הציבורי ואת הגישה האישית.\nלאחר שינוי בקוד מפעילים מחדש את הפקודה. לבנייה בלבד: npm run build.\nלהרצת התוצר שנבנה: npm start. בדיקות הליבה הכלולות: npm test.\nלכל בדיקות המקור, חומרי התיעוד וכלי הפיתוח השתמשו ב-FullSource.\n`);
execFileSync('npm',['install','--package-lock-only','--ignore-scripts','--no-audit','--no-fund'],{cwd:staging,stdio:'pipe'});
// Save the exact generated source before installation, builds or tests.
for(const args of [['init','-q'],['add','.'],['-c','user.name=HomeStudio export','-c','user.email=clean@localhost','commit','-qm','Create Clean source distribution']])execFileSync('git',args,{cwd:staging,stdio:'pipe'});
execFileSync('git',['archive','--format=zip','--prefix='+basename(output,'.zip')+'/','--output='+output,'HEAD'],{cwd:staging,stdio:'pipe'});
console.log(JSON.stringify({sourceCommit:commit,staging,archive:output,files:selected.size,renderingAssetsUnchanged:true}));
