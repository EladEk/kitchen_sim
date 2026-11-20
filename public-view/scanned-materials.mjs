import treeImpostor from './assets/vegetation-r185/tree_jacaranda.ktx2?url';
import treeImpostorFallback from './assets/vegetation-r185/tree_jacaranda.webp?url';
import shrubImpostor from './assets/vegetation-r185/shrub_searsia.ktx2?url';
import shrubImpostorFallback from './assets/vegetation-r185/shrub_searsia.webp?url';
import wallNormalFallback from './assets/pbr-r104/beige_wall_001_nor_gl.jpg?url';
import wallNormal from './assets/pbr-r113/beige_wall_001_nor_gl.ktx2?url';
import wallRoughFallback from './assets/pbr-r104/beige_wall_001_rough.jpg?url';
import wallRough from './assets/pbr-r113/beige_wall_001_rough.ktx2?url';
import clothColorFallback from './assets/pbr-r104/cotton_jersey_diff.jpg?url';
import clothColor from './assets/pbr-r113/cotton_jersey_diff.ktx2?url';
import clothNormalFallback from './assets/pbr-r104/cotton_jersey_nor_gl.jpg?url';
import clothNormal from './assets/pbr-r113/cotton_jersey_nor_gl.ktx2?url';
import clothRoughFallback from './assets/pbr-r104/cotton_jersey_rough.jpg?url';
import clothRough from './assets/pbr-r113/cotton_jersey_rough.ktx2?url';
import woodColorFallback from './assets/pbr-r104/oak_veneer_01_diff.jpg?url';
import woodColor from './assets/pbr-r113/oak_veneer_01_diff.ktx2?url';
import woodNormalFallback from './assets/pbr-r104/oak_veneer_01_nor_gl.jpg?url';
import woodNormal from './assets/pbr-r113/oak_veneer_01_nor_gl.ktx2?url';
import woodRoughFallback from './assets/pbr-r104/oak_veneer_01_rough.jpg?url';
import woodRough from './assets/pbr-r113/oak_veneer_01_rough.ktx2?url';
import roadColorFallback from './assets/pbr-r104/asphalt_03_diff.jpg?url';
import roadColor from './assets/pbr-r113/asphalt_03_diff.ktx2?url';
import roadNormalFallback from './assets/pbr-r104/asphalt_03_nor_gl.jpg?url';
import roadNormal from './assets/pbr-r113/asphalt_03_nor_gl.ktx2?url';
import roadRoughFallback from './assets/pbr-r104/asphalt_03_rough.jpg?url';
import roadRough from './assets/pbr-r113/asphalt_03_rough.ktx2?url';
// R180: CC0 Poly Haven 'Leafy Grass' photoscan (see assets/grass-r180/SOURCES.json).
import grassColor from './assets/grass-r180/color.jpg?url';
import grassNormal from './assets/grass-r180/normal.jpg?url';
import grassRough from './assets/grass-r180/roughness.jpg?url';
// R181: CC0 Poly Haven 'Hessian 380' woven upholstery (see assets/upholstery-r181/SOURCES.json).
import upholsteryColor from './assets/upholstery-r181/color.jpg?url';
import upholsteryNormal from './assets/upholstery-r181/normal.jpg?url';
import upholsteryRough from './assets/upholstery-r181/roughness.jpg?url';
// R183: CC0 Poly Haven painted plaster and ambientCG Marble 014 (assets/pbr-r183/SOURCES.json).
import plasterNormalFallback from './assets/pbr-r183/plaster_nor_gl.jpg?url';
import plasterNormal from './assets/pbr-r183/plaster_nor_gl.ktx2?url';
import plasterRoughFallback from './assets/pbr-r183/plaster_rough.jpg?url';
import plasterRough from './assets/pbr-r183/plaster_rough.ktx2?url';
import worktopColorFallback from './assets/pbr-r183/worktop_diff.jpg?url';
import worktopColor from './assets/pbr-r183/worktop_diff.ktx2?url';
import worktopNormalFallback from './assets/pbr-r183/worktop_nor_gl.jpg?url';
import worktopNormal from './assets/pbr-r183/worktop_nor_gl.ktx2?url';
import worktopRoughFallback from './assets/pbr-r183/worktop_rough.jpg?url';
import worktopRough from './assets/pbr-r183/worktop_rough.ktx2?url';
import {createCompressedMaterialLoader} from './ktx-material-loader.mjs';
import {createScanMaterialController} from './scanned-material-core.mjs';

// CC0 measured scans; exact provenance and physical widths are in SOURCES.json.
// Owner-ordered floors/stone and their photographed samples stay authoritative.
// compressedColorMean: measured linear mean of the neutralized KTX2 albedo
// (scripts/compress-pbr.py), so GPU-compressed and JPEG scans keep the same colour.
const scans={
 plaster:{normal:wallNormal,roughness:wallRough,metres:3,strength:.12,rough:.95,environment:.55},
 paint:{normal:wallNormal,roughness:wallRough,metres:3,strength:.08,rough:.62,environment:.5},
 door:{normal:woodNormal,roughness:woodRough,metres:1.8,strength:.18,rough:.64,environment:.55},
 grass:{color:grassColor,normal:grassNormal,roughness:grassRough,metres:2,strength:.55,rough:1,environment:.3,naturalColor:true,source:'Poly Haven leafy_grass',technique:'photoscan'},
 fabric:{colorMean:[.540361,.405250,.337280],compressedColorMean:[.839879,.839868,.839895],color:clothColor,normal:clothNormal,roughness:clothRough,metres:.3,strength:.38,rough:.85,environment:.75},
 // Sofa/armchair cloth: a visible woven slub; tint removed at load (no colorMean),
 // matte (map mean .9) and capped at 1024 px on phones.
 upholstery:{color:upholsteryColor,normal:upholsteryNormal,roughness:upholsteryRough,metres:.55,strength:1,rough:1,environment:.55,source:'Poly Haven hessian_380'},
 wood:{colorMean:[.359834,.211142,.098359],compressedColorMean:[.841074,.828395,.804503],color:woodColor,normal:woodNormal,roughness:woodRough,metres:1.8,strength:.32,rough:.76,environment:.65},
 // R183 walls/ceilings: real roller-paint relief at 2 m, colour and roughness stay the finish's own.
 wallPaint:{normal:plasterNormal,roughness:plasterRough,metres:2,strength:.9,keepFinish:true,replaceDetail:true,source:'Poly Haven painted_plaster_wall'},
 // R183 worktops: veined stone detail at an estimated 1.2 m slab scale; the selected stone colour stays.
 worktop:{color:worktopColor,normal:worktopNormal,roughness:worktopRough,metres:1.2,strength:.35,rough:.32,environment:.9,source:'ambientCG Marble014'},
 // R185: rendered CC0 Poly Haven plant impostor atlases (assets/vegetation-r185);
 // atlas UVs, not metric tiling; the instance colour stays the tint.
 treeImpostor:{color:treeImpostor,metres:1,naturalColor:true,keepFinish:true,atlas:true,source:'Poly Haven jacaranda_tree',technique:'impostor'},
 shrubImpostor:{color:shrubImpostor,metres:1,naturalColor:true,keepFinish:true,atlas:true,source:'Poly Haven searsia_lucida',technique:'impostor'},
 asphalt:{color:roadColor,normal:roadNormal,roughness:roadRough,metres:2,strength:.7,rough:.97,environment:.4}
};

const fallbacks=new Map([[treeImpostor,treeImpostorFallback],[shrubImpostor,shrubImpostorFallback],[wallNormal,wallNormalFallback],[wallRough,wallRoughFallback],[clothColor,clothColorFallback],[clothNormal,clothNormalFallback],[clothRough,clothRoughFallback],[woodColor,woodColorFallback],[woodNormal,woodNormalFallback],[woodRough,woodRoughFallback],[roadColor,roadColorFallback],[roadNormal,roadNormalFallback],[roadRough,roadRoughFallback],[plasterNormal,plasterNormalFallback],[plasterRough,plasterRoughFallback],[worktopColor,worktopColorFallback],[worktopNormal,worktopNormalFallback],[worktopRough,worktopRoughFallback]]);
export function createScannedMaterials(options={}){const compressed=options.renderer?createCompressedMaterialLoader(options.renderer,fallbacks):null,controller=createScanMaterialController({...options,scans, ...(compressed?{loader:compressed.load}:{})});return {apply:controller.apply,get textures(){return controller.textures;},get stats(){return controller.stats;},dispose(){controller.dispose();compressed?.dispose();}};}
