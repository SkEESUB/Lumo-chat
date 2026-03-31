import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  // Use StrictMode carefully with Socket.io as it mounts/unmounts components double times in dev
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
