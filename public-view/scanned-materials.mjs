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
import plasterColorFallback from './assets/pbr-r153/plaster_grey_04_color.jpg?url';
import plasterColor from './assets/pbr-r153/plaster_grey_04_color.ktx2?url';
import paintColorFallback from './assets/pbr-r153/white_plaster_02_color.jpg?url';
import paintColor from './assets/pbr-r153/white_plaster_02_color.ktx2?url';
import stoneColorFallback from './assets/pbr-r153/marble_012_color.jpg?url';
import stoneColor from './assets/pbr-r153/marble_012_color.ktx2?url';
import cementColorFallback from './assets/pbr-r153/smooth_concrete_floor_color.jpg?url';
import cementColor from './assets/pbr-r153/smooth_concrete_floor_color.ktx2?url';
import cementNormalFallback from './assets/pbr-r153/smooth_concrete_floor_normal.jpg?url';
import cementNormal from './assets/pbr-r153/smooth_concrete_floor_normal.ktx2?url';
import cementRoughFallback from './assets/pbr-r153/smooth_concrete_floor_roughness.jpg?url';
import cementRough from './assets/pbr-r153/smooth_concrete_floor_roughness.ktx2?url';
import {createCompressedMaterialLoader} from './ktx-material-loader.mjs';
import {createScanMaterialController} from './scanned-material-core.mjs';

// CC0 measured scans; exact provenance and physical widths are in SOURCES.json.
// Owner-ordered floors/stone and their photographed samples stay authoritative.
// R153 photoreal pass: walls, ceilings and floors gain measured CC0 albedo
// mottling (greyscale, tint-neutral; colorMean keeps the chosen finish as the
// mean colour). See assets/pbr-r153/SOURCES.json for provenance and sizes.
// compressedColorMean is the measured mean of the neutralized KTX2 albedo
// (compress-pbr.py), so GPU-compressed and JPEG scans keep the same colour.
const scans={
 plaster:{color:plasterColor,colorMean:[.745676,.745676,.745676],normal:wallNormal,roughness:wallRough,metres:3,strength:.16,rough:.95,environment:.55},
 paint:{color:paintColor,colorMean:[.745790,.745790,.745790],normal:wallNormal,roughness:wallRough,metres:3,strength:.1,rough:.62,environment:.5},
 door:{normal:woodNormal,roughness:woodRough,metres:1.8,strength:.24,rough:.6,environment:.6},
 grass:{color:grassColor,normal:grassNormal,roughness:grassRough,metres:1.4,strength:.32,rough:1,environment:.35,naturalColor:true,source:'ambientCG',technique:'procedural'},
 fabric:{colorMean:[.540361,.405250,.337280],compressedColorMean:[.839879,.839868,.839895],color:clothColor,normal:clothNormal,roughness:clothRough,metres:.3,strength:.38,rough:.97,environment:.38},
 wood:{colorMean:[.359834,.211142,.098359],compressedColorMean:[.841074,.828395,.804503],color:woodColor,normal:woodNormal,roughness:woodRough,metres:1.8,strength:.32,rough:.76,environment:.65},
 asphalt:{color:roadColor,normal:roadNormal,roughness:roadRough,metres:2,strength:.7,rough:.97,environment:.4},
 porcelain:{color:stoneColor,colorMean:[.747498,.747498,.747498],metres:1.6,rough:.42,environment:.85,source:'ambientCG'},
 cement:{color:cementColor,colorMean:[.746496,.746496,.746496],normal:cementNormal,roughness:cementRough,metres:2,strength:.45,rough:.9,environment:.45}
};

const fallbacks=new Map([[wallNormal,wallNormalFallback],[wallRough,wallRoughFallback],[clothColor,clothColorFallback],[clothNormal,clothNormalFallback],[clothRough,clothRoughFallback],[woodColor,woodColorFallback],[woodNormal,woodNormalFallback],[woodRough,woodRoughFallback],[roadColor,roadColorFallback],[roadNormal,roadNormalFallback],[roadRough,roadRoughFallback],[grassColor,grassColorFallback],[grassNormal,grassNormalFallback],[grassRough,grassRoughFallback],[plasterColor,plasterColorFallback],[paintColor,paintColorFallback],[stoneColor,stoneColorFallback],[cementColor,cementColorFallback],[cementNormal,cementNormalFallback],[cementRough,cementRoughFallback]]);
export function createScannedMaterials(options={}){const compressed=options.renderer?createCompressedMaterialLoader(options.renderer,fallbacks):null,controller=createScanMaterialController({...options,scans, ...(compressed?{loader:compressed.load}:{})});return {apply:controller.apply,get textures(){return controller.textures;},get stats(){return controller.stats;},dispose(){controller.dispose();compressed?.dispose();}};}
