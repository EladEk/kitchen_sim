export function inVariantSlot(object){for(let p=object;p;p=p.parent)if(p.userData.variantSlot===4)return true;return false;}
export function hasVariantSlot(root){let found=false;root.traverse(o=>{if(o.userData.variantSlot===4)found=true;});return found;}
