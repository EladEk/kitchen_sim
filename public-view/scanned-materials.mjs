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
 upholstery:{color:upholsteryColor,normal:upholsteryNormal,roughness:upholsteryRough,metres:.274,strength:.7,rough:1,environment:.55,source:'Poly Haven hessian_380'},
 wood:{colorMean:[.359834,.211142,.098359],compressedColorMean:[.841074,.828395,.804503],color:woodColor,normal:woodNormal,roughness:woodRough,metres:1.8,strength:.32,rough:.76,environment:.65},
 asphalt:{color:roadColor,normal:roadNormal,roughness:roadRough,metres:2,strength:.7,rough:.97,environment:.4}
};

const fallbacks=new Map([[wallNormal,wallNormalFallback],[wallRough,wallRoughFallback],[clothColor,clothColorFallback],[clothNormal,clothNormalFallback],[clothRough,clothRoughFallback],[woodColor,woodColorFallback],[woodNormal,woodNormalFallback],[woodRough,woodRoughFallback],[roadColor,roadColorFallback],[roadNormal,roadNormalFallback],[roadRough,roadRoughFallback]]);
export function createScannedMaterials(options={}){const compressed=options.renderer?createCompressedMaterialLoader(options.renderer,fallbacks):null,controller=createScanMaterialController({...options,scans, ...(compressed?{loader:compressed.load}:{})});return {apply:controller.apply,get textures(){return controller.textures;},get stats(){return controller.stats;},dispose(){controller.dispose();compressed?.dispose();}};}
