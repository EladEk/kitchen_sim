import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertWebGPUBasisDimensions} from './compressed-texture-layout.mjs';

test('the reported 1023x1024 Basis allocation is rejected before GPU upload with the asset and dimensions',async()=>{
 const valid=await readFile('public-view/assets/pbr-r113/cotton_jersey_diff.ktx2');
 assert.deepEqual(assertWebGPUBasisDimensions(valid),{width:1024,height:1024});
 const old=Buffer.from(valid);old.writeUInt32LE(1023,20);
 assert.throws(()=>assertWebGPUBasisDimensions(old,'cotton_jersey_diff.ktx2'),error=>error.code==='WEBGPU_TEXTURE_BLOCK_ALIGNMENT'&&error.details.width===1023&&error.details.blockWidth===4&&error.message.includes('cotton_jersey_diff.ktx2'));
 // Byte views can start inside a larger response buffer.
 const padded=Buffer.concat([Buffer.alloc(13),old]);assert.throws(()=>assertWebGPUBasisDimensions(padded.subarray(13)),{code:'WEBGPU_TEXTURE_BLOCK_ALIGNMENT'});
 const height=Buffer.from(valid);height.writeUInt32LE(1022,24);assert.throws(()=>assertWebGPUBasisDimensions(height),{code:'WEBGPU_TEXTURE_BLOCK_ALIGNMENT'});
 assert.doesNotThrow(()=>assertWebGPUBasisDimensions(new Uint8Array(4)));
 const uncompressed=Buffer.from(old);uncompressed.writeUInt32LE(37,12);assert.doesNotThrow(()=>assertWebGPUBasisDimensions(uncompressed),'ordinary RGBA KTX2 does not need 4x4 block dimensions');
});

test('all shipped Basis maps match the manifest and fit mobile WebGPU 4x4 base blocks',async()=>{
 const manifest=JSON.parse(await readFile('public-view/assets/pbr-r113/MANIFEST.json'));
 for(const row of manifest.textures){const bytes=await readFile(row.output),size=assertWebGPUBasisDimensions(bytes,row.output);assert.deepEqual([size.width,size.height],row.size);assert.equal(size.width%4,0);assert.equal(size.height%4,0);assert.equal(bytes.readUInt32LE(40),Math.floor(Math.log2(Math.max(...row.size)))+1,'complete mip pyramid');}
 for(const row of manifest.textures.filter(t=>t.source.includes('cotton_jersey'))){assert.deepEqual(row.source_size,[1024,1025]);assert.deepEqual(row.size,[1024,1024]);}
});
