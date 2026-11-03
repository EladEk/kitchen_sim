import wallNormal from './assets/pbr-r104/beige_wall_001_nor_gl.jpg?url';
import wallRough from './assets/pbr-r104/beige_wall_001_rough.jpg?url';
import clothColor from './assets/pbr-r104/cotton_jersey_diff.jpg?url';
import clothNormal from './assets/pbr-r104/cotton_jersey_nor_gl.jpg?url';
import clothRough from './assets/pbr-r104/cotton_jersey_rough.jpg?url';
import woodColor from './assets/pbr-r104/oak_veneer_01_diff.jpg?url';
import woodNormal from './assets/pbr-r104/oak_veneer_01_nor_gl.jpg?url';
import woodRough from './assets/pbr-r104/oak_veneer_01_rough.jpg?url';
import roadColor from './assets/pbr-r104/asphalt_03_diff.jpg?url';
import roadNormal from './assets/pbr-r104/asphalt_03_nor_gl.jpg?url';
import roadRough from './assets/pbr-r104/asphalt_03_rough.jpg?url';
import grassColor from './assets/grass-r105/color.jpg?url';
import grassNormal from './assets/grass-r105/normal.jpg?url';
import grassRough from './assets/grass-r105/roughness.png?url';
import {createScanMaterialController} from './scanned-material-core.mjs';

// CC0 measured scans; exact provenance and physical widths are in SOURCES.json.
// Owner-ordered floors/stone and their photographed samples stay authoritative.
const scans={
 plaster:{normal:wallNormal,roughness:wallRough,metres:3,strength:.12,rough:.95,environment:.55},
 paint:{normal:wallNormal,roughness:wallRough,metres:3,strength:.08,rough:.9,environment:.5},
 door:{normal:woodNormal,roughness:woodRough,metres:1.8,strength:.15,rough:.88,environment:.55},
 grass:{color:grassColor,normal:grassNormal,roughness:grassRough,metres:1.4,strength:.32,rough:1,environment:.35,naturalColor:true,source:'ambientCG',technique:'procedural'},
 fabric:{color:clothColor,normal:clothNormal,roughness:clothRough,metres:.3,strength:.38,rough:.97,environment:.38},
 wood:{color:woodColor,normal:woodNormal,roughness:woodRough,metres:1.8,strength:.32,rough:.76,environment:.65},
 asphalt:{color:roadColor,normal:roadNormal,roughness:roadRough,metres:2,strength:.7,rough:.97,environment:.4}
};

export const createScannedMaterials=options=>createScanMaterialController({...options,scans});
