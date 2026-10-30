import React from 'react';
import {createRoot} from 'react-dom/client';
import {DocumentAccessProvider} from '../src/DocumentAccess.jsx';
import {DistrictViewer} from './DistrictViewer.jsx';
createRoot(document.getElementById('root')).render(<DocumentAccessProvider><DistrictViewer/></DocumentAccessProvider>);
