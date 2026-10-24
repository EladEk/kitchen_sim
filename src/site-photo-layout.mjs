// R54: horizontal context is registered to the ground/development plans.
// Furniture heights, planting and bin dimensions are photo-based estimates.
export const LAUNDRY_SCREEN_Z=9.04526; // actual southern PORCH mouth; registered per storey
export const ENTRY_GARDENS=[
 {id:'secondary-entry-garden',polygon:[[-5.90,-10.90],[-4.85,-10.90],[-4.85,-.65],[-5.90,-.65]]},
 {id:'secondary-entry-border',polygon:[[-.10,-2.58],[5.48,-2.58],[5.48,-2.04],[-.10,-2.04]]},
 {id:'entry-garden-north',polygon:[[17.65,-11.45],[30.82,-11.45],[30.82,-9.22],[23.77,-9.22],[23.77,-9.28],[17.65,-9.28]]},
 {id:'entry-garden-island',polygon:[[25.50,-8.45],[32.37,-8.45],[32.37,-5.94],[25.50,-5.94]]},
 {id:'entry-garden-south',polygon:[[17.72,-1.90],[32.37,-1.90],[32.37,-.36],[17.72,-.36]]}
];
export const BURIED_BINS={id:'site-buried-bins',position:[-6.45,24.8],width:3.25,depth:2.05,centres:[[-7.25,24.8],[-5.65,24.8]],bodyWidth:.88,bodyDepth:.85,height:1.25,dimensionsInferred:true};
export const RESERVOIR={id:'site-water-reservoir',minX:13.8497,maxX:17.4981,minZ:-11.611,maxZ:-8.1997,wall:.18,height:2.65};
export const photoSiteObstacles=()=>[
 ...BURIED_BINS.centres.map(([x,z])=>({minX:x-.5,maxX:x+.5,minZ:z-.5,maxZ:z+.5,siteObstacle:'site-buried-bins'})),
 // Solid reservoir shell; the cutaway is for inspection, not a walk-in room.
 {minX:RESERVOIR.minX,maxX:RESERVOIR.maxX,minZ:RESERVOIR.minZ,maxZ:RESERVOIR.maxZ,siteObstacle:RESERVOIR.id}
];
// Lid visible in 307548/307549 beside the front railing and neighbour wall.
// Coordinates registered by relative fence offsets; not a measured survey.
export const SERVICE_CHAMBER_PHOTO={position:[11.05,16.76],source:'service-yard',page:5,positionInferred:true,lidVisuallyConfirmed:true};
