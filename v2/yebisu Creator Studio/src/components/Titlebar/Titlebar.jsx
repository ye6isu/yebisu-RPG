import React, { useState, useRef, useEffect } from 'react';
import './Titlebar.css';

export default function Titlebar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <img src="/logo.png" alt="YCS Logo" className="logo-icon" />
        
        <div className="titlebar-menu" ref={menuRef}>
          <div 
            className={`menu-button ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            File
          </div>
          {menuOpen && (
            <div className="dropdown">
              <div 
                className="dropdown-item" 
                onClick={() => {
                  window.electronAPI?.openPreferences();
                  setMenuOpen(false);
                }}
              >
                Preferences
              </div>
              <div className="dropdown-separator"></div>
              <div 
                className="dropdown-item" 
                onClick={() => window.electronAPI?.controlWindow('close')}
              >
                Exit
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stoplights (Right side) */}
      <div className="titlebar-right" style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        WebkitAppRegion: 'no-drag'
      }}>
        <div 
          title="Minimize"
          onClick={() => window.electronAPI?.controlWindow('minimize')}
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#febb2e', cursor: 'pointer' }} 
        />
        <div 
          title="Maximize"
          onClick={() => window.electronAPI?.controlWindow('maximize')}
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#29c840', cursor: 'pointer' }} 
        />
        <div 
          title="Close"
          onClick={() => window.electronAPI?.controlWindow('close')}
          style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff5f57', cursor: 'pointer' }} 
        />
      </div>
    </div>
  );
}
