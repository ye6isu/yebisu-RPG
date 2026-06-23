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
    </div>
  );
}
