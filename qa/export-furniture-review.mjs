// Decode the shipped artifact for an offline Blender silhouette/material audit.
// This does not validate browser pixels or frame rate.
import {NodeIO} from '@gltf-transform/core';
import {ALL_EXTENSIONS} from '@gltf-transform/extensions';
import {dequantize,prune} from '@gltf-transform/functions';
import {MeshoptDecoder} from 'meshoptimizer';
await MeshoptDecoder.ready;
const io=new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({'meshopt.decoder':MeshoptDecoder}),doc=await io.read('public-view/assets/furniture-r116/furniture.glb');
doc.getRoot().listExtensionsUsed().find(e=>e.extensionName==='EXT_meshopt_compression')?.dispose();
await doc.transform(dequantize(),prune());
await io.write(process.argv[2],doc);
