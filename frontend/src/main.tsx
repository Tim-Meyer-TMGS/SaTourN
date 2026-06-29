import React from 'react';
import ReactDOM from 'react-dom/client';

import { App } from './app/App';
import { installBrowserNoiseFilters } from './app/browser-noise';
import './styles/global.css';

installBrowserNoiseFilters();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
