import React from 'react';
import Titlebar from '../Titlebar/Titlebar';
import './WindowFrame.css';

export default function WindowFrame({ children }) {
  return (
    <div className="window-frame" style={{ position: 'relative' }}>
      {/* Invisible Top Drag Area */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '8px', WebkitAppRegion: 'drag', zIndex: 10 }} />
      
      <div className="window-content" style={{ width: '100%', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
