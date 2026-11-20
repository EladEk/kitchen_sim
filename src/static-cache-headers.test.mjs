import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('hashed assets, decoders and versioned baseline files are cached immutably at the CDN',async()=>{
 const config=JSON.parse(await readFile('vercel.json','utf8'));
 const rules=Object.fromEntries((config.headers||[]).map(rule=>[rule.source,rule.headers.find(h=>h.key==='Cache-Control')?.value]));
 for(const source of ['/assets/:path*','/decoders/:path*','/baseline/:path*']){
  assert.equal(rules[source],'public, max-age=31536000, immutable',source);
 }
 const html=config.headers.filter(rule=>rule.source==='/'||rule.source==='/(.*)'||/\.html$/.test(rule.source));
 assert(html.some(rule=>rule.source==='/'),'the page entry must have an explicit rule');
 // A page left open across a deployment must find the new entry on reload.
 for(const rule of html)assert.equal(rule.headers.find(h=>h.key.toLowerCase()==='cache-control')?.value,'no-cache','HTML must not be cached immutably: '+rule.source);
});
