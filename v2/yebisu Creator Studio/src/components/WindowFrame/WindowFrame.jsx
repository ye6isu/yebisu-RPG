import React from 'react';
import Titlebar from '../Titlebar/Titlebar';
import './WindowFrame.css';

export default function WindowFrame({ children, onOpenPreferences }) {
  return (
    <div className="window-frame">
      <Titlebar onOpenPreferences={onOpenPreferences} />
      <div className="window-content">
        {children}
      </div>
    </div>
  );
}
