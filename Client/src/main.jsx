import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// Set fixed configuration directly instead of fetching config.json
window.runtimeConfig = {
  apiBaseUrl: 'http://localhost:3000',
  //apiBaseUrl: 'http://192.168.1.245:3000',
  defaultDateFormat: 'YYYY-MM-DD',
  appName: 'Akoya Water Park',
  features: {
    enablePrinting: true,
    enableExports: true
  }
};

// Start app immediately with the fixed config
startApp();

function startApp() {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
