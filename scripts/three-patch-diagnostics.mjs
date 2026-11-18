let target = 'node_modules/three/package.json';
export function setPatchTarget(path){target=path;return path;}
export function patchTarget(){return target;}
