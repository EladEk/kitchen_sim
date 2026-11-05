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
import grassColorFallback from './assets/grass-r105/color.jpg?url';
import grassColor from './assets/pbr-r113/color.ktx2?url';
import grassNormalFallback from './assets/grass-r105/normal.jpg?url';
import grassNormal from './assets/pbr-r113/normal.ktx2?url';
import grassRoughFallback from './assets/grass-r105/roughness.png?url';
import grassRough from './assets/pbr-r113/roughness.ktx2?url';
import {createCompressedMaterialLoader} from './ktx-material-loader.mjs';
import {createScanMaterialController} from './scanned-material-core.mjs';

// CC0 measured scans; exact provenance and physical widths are in SOURCES.json.
// Owner-ordered floors/stone and their photographed samples stay authoritative.
const scans={
 plaster:{normal:wallNormal,roughness:wallRough,metres:3,strength:.12,rough:.95,environment:.55},
 paint:{normal:wallNormal,roughness:wallRough,metres:3,strength:.08,rough:.62,environment:.5},
 door:{normal:woodNormal,roughness:woodRough,metres:1.8,strength:.18,rough:.64,environment:.55},
 grass:{color:grassColor,normal:grassNormal,roughness:grassRough,metres:1.4,strength:.32,rough:1,environment:.35,naturalColor:true,source:'ambientCG',technique:'procedural'},
 fabric:{colorMean:[.540361,.405250,.337280],color:clothColor,normal:clothNormal,roughness:clothRough,metres:.3,strength:.38,rough:.97,environment:.38},
 wood:{colorMean:[.359834,.211142,.098359],color:woodColor,normal:woodNormal,roughness:woodRough,metres:1.8,strength:.32,rough:.76,environment:.65},
 asphalt:{color:roadColor,normal:roadNormal,roughness:roadRough,metres:2,strength:.7,rough:.97,environment:.4}
};

const fallbacks=new Map([[wallNormal,wallNormalFallback],[wallRough,wallRoughFallback],[clothColor,clothColorFallback],[clothNormal,clothNormalFallback],[clothRough,clothRoughFallback],[woodColor,woodColorFallback],[woodNormal,woodNormalFallback],[woodRough,woodRoughFallback],[roadColor,roadColorFallback],[roadNormal,roadNormalFallback],[roadRough,roadRoughFallback],[grassColor,grassColorFallback],[grassNormal,grassNormalFallback],[grassRough,grassRoughFallback]]);
export function createScannedMaterials(options={}){const compressed=options.renderer?createCompressedMaterialLoader(options.renderer,fallbacks):null,controller=createScanMaterialController({...options,scans, ...(compressed?{loader:compressed.load}:{})});return {apply:controller.apply,get textures(){return controller.textures;},get stats(){return controller.stats;},dispose(){controller.dispose();compressed?.dispose();}};}
