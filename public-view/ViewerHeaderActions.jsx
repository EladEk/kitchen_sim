import React from 'react';
export function ViewerHeaderActions({onEdit,disabled=false,children}){
 return <div className="viewer-header-actions"><button type="button" className="apartment-edit-open" disabled={disabled} onClick={onEdit}>עריכת דירה</button><div className="photo-header-slot" data-photo-controls-slot="">{children}</div></div>;
}
