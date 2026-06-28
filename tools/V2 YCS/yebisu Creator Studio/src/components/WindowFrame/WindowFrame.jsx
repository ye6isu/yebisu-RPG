import React from 'react';
import Titlebar from '../Titlebar/Titlebar';
import './WindowFrame.css';

export default function WindowFrame({ children }) {
  return (
    <div className="window-frame" style={{ position: 'relative' }}>
      <Titlebar />
      
      <div className="window-content" style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
