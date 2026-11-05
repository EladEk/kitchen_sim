const KTX2_SIGNATURE=[0xab,0x4b,0x54,0x58,0x20,0x32,0x30,0xbb,0x0d,0x0a,0x1a,0x0a];

// Basis Universal (vkFormat=0) is transcoded by KTX2Loader to 4x4 block
// formats on WebGPU. Validate before transcoding/upload; raster fallback can
// still load the original image if a future asset bypasses the build check.
export function assertWebGPUBasisDimensions(buffer,url=''){
 const bytes=ArrayBuffer.isView(buffer)?new Uint8Array(buffer.buffer,buffer.byteOffset,buffer.byteLength):new Uint8Array(buffer);
 if(bytes.byteLength<80||KTX2_SIGNATURE.some((value,i)=>bytes[i]!==value))return;
 const header=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(header.getUint32(12,true)!==0)return;
 const width=header.getUint32(20,true),height=header.getUint32(24,true);
 if(width%4||height%4)throw Object.assign(new Error(`Basis texture ${url||'(unnamed)'} is ${width}x${height}; WebGPU ASTC/ETC2 requires base dimensions divisible by 4.`),{name:'CompressedTextureLayoutError',code:'WEBGPU_TEXTURE_BLOCK_ALIGNMENT',details:{texture:url,width,height,blockWidth:4,blockHeight:4}});
 return {width,height};
}
