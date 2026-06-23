import React, { useState, useRef, useEffect } from 'react';
import './PreferencesPage.css';

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'System Default', value: "system-ui, sans-serif" }
];

export default function PreferencesPage() {
  const [activeTab, setActiveTab] = useState('Appearance');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ycs-prefs-sidebar-width')) || 160;
  });

  const isResizing = useRef(false);
  const widthRef = useRef(sidebarWidth);

  const startResizing = React.useCallback((e) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      let newWidth = e.clientX;
      if (newWidth < 120) newWidth = 120;
      if (newWidth > 400) newWidth = 400;
      widthRef.current = newWidth;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = 'default';
        localStorage.setItem('ycs-prefs-sidebar-width', widthRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const [accentColor, setAccentColor] = useState(() => localStorage.getItem('ycs-accent') || '#323233');
  const [bgColor, setBgColor] = useState(() => localStorage.getItem('ycs-bg') || '#252526');
  const [fgColor, setFgColor] = useState(() => localStorage.getItem('ycs-foreground') || '#444444');
  const [textColor, setTextColor] = useState(() => localStorage.getItem('ycs-text') || '#ffffff');
  const [highlightColor, setHighlightColor] = useState(() => localStorage.getItem('ycs-highlight') || '#0078d7');
  const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif");
  const [fontMenuOpen, setFontMenuOpen] = useState(false);

  const originalState = useRef({
    accent: localStorage.getItem('ycs-accent') || '#323233',
    bg: localStorage.getItem('ycs-bg') || '#252526',
    fg: localStorage.getItem('ycs-foreground') || '#444444',
    text: localStorage.getItem('ycs-text') || '#ffffff',
    highlight: localStorage.getItem('ycs-highlight') || '#0078d7',
    font: localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif"
  });

  const handleApply = () => {
    // Update the baseline original state to current values
    originalState.current = {
      accent: accentColor,
      bg: bgColor,
      fg: fgColor,
      text: textColor,
      highlight: highlightColor,
      font: fontFamily
    };
  };

  const hasChanges = 
    accentColor !== originalState.current.accent ||
    bgColor !== originalState.current.bg ||
    fgColor !== originalState.current.fg ||
    textColor !== originalState.current.text ||
    highlightColor !== originalState.current.highlight ||
    fontFamily !== originalState.current.font;

  const handleCancel = () => {
    const orig = originalState.current;
    
    // Revert local React state
    setAccentColor(orig.accent);
    setBgColor(orig.bg);
    setFgColor(orig.fg);
    setTextColor(orig.text);
    setHighlightColor(orig.highlight);
    setFontFamily(orig.font);

    // Revert local DOM
    document.documentElement.style.setProperty('--ycs-accent', orig.accent);
    document.documentElement.style.setProperty('--ycs-bg', orig.bg);
    document.documentElement.style.setProperty('--ycs-foreground', orig.fg);
    document.documentElement.style.setProperty('--ycs-text', orig.text);
    document.documentElement.style.setProperty('--ycs-highlight', orig.highlight);
    document.documentElement.style.setProperty('--ycs-font', orig.font);

    // Revert localStorage (triggers sync to other windows)
    localStorage.setItem('ycs-accent', orig.accent);
    localStorage.setItem('ycs-bg', orig.bg);
    localStorage.setItem('ycs-foreground', orig.fg);
    localStorage.setItem('ycs-text', orig.text);
    localStorage.setItem('ycs-highlight', orig.highlight);
    localStorage.setItem('ycs-font', orig.font);

    window.electronAPI?.controlWindow('close');
  };

  const handleOk = () => {
    handleApply();
    window.electronAPI?.controlWindow('close');
  };

  const handleAccentChange = (val) => {
    setAccentColor(val);
    localStorage.setItem('ycs-accent', val);
    document.documentElement.style.setProperty('--ycs-accent', val);
  };

  const handleBgChange = (val) => {
    setBgColor(val);
    localStorage.setItem('ycs-bg', val);
    document.documentElement.style.setProperty('--ycs-bg', val);
  };

  const handleFgChange = (val) => {
    setFgColor(val);
    localStorage.setItem('ycs-foreground', val);
    document.documentElement.style.setProperty('--ycs-foreground', val);
  };

  const handleTextChange = (val) => {
    setTextColor(val);
    localStorage.setItem('ycs-text', val);
    document.documentElement.style.setProperty('--ycs-text', val);
  };

  const handleHighlightChange = (val) => {
    setHighlightColor(val);
    localStorage.setItem('ycs-highlight', val);
    document.documentElement.style.setProperty('--ycs-highlight', val);
  };

  const handleFontChange = (val) => {
    setFontFamily(val);
    localStorage.setItem('ycs-font', val);
    document.documentElement.style.setProperty('--ycs-font', val);
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      backgroundColor: 'var(--ycs-bg)', 
      color: 'var(--ycs-text)', 
      display: 'flex', 
      flexDirection: 'column',
      border: '1px solid #444',
      boxSizing: 'border-box'
    }}>
      {/* Native Drag Titlebar */}
      <div style={{ 
        height: '28px', 
        WebkitAppRegion: 'drag', 
        backgroundColor: 'var(--ycs-bg)', 
        display: 'flex',  
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingLeft: '10px', 
        fontSize: '12px',
        fontWeight: '500',
        flexShrink: 0,
        borderBottom: '1px solid var(--ycs-foreground)'
      }}>
        <span>Preferences</span>
        <div 
          onClick={() => window.electronAPI?.controlWindow('close')}
          style={{
            width: '28px',
            height: '28px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            WebkitAppRegion: 'no-drag',
            cursor: 'pointer',
            transition: 'background-color 0.1s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff5f57'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <img src="/close-icon.svg" alt="Close" style={{ width: '14px', height: '14px' }} />
        </div>
      </div>
      
      {/* Content Layout */}
      <div className="preferences-content">
        {/* Left Sidebar */}
        <div className="preferences-sidebar" style={{ width: `${sidebarWidth}px` }}>
          <div 
            className={`preferences-tab ${activeTab === 'Appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('Appearance')}
          >
            Appearance
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          className="sidebar-resizer" 
          onMouseDown={startResizing}
        ></div>

        {/* Right Main Area */}
        <div className="preferences-main">
          {activeTab === 'Appearance' && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>UI Color</h2>
              
              <div className="setting-row">
                <label>Accent Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={accentColor}
                    onChange={(e) => handleAccentChange(e.target.value)}
                    style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ycs-foreground)', color: 'var(--ycs-text)', padding: '4px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                  />
                  <input 
                    type="color" 
                    value={accentColor} 
                    onChange={(e) => handleAccentChange(e.target.value)} 
                  />
                  {window.EyeDropper && (
                    <div 
                      onClick={async () => {
                        try {
                          const result = await new window.EyeDropper().open();
                          handleAccentChange(result.sRGBHex);
                        } catch (e) {} // User canceled
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title="Pick color from anywhere on your screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="setting-row">
                <label>Background Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={bgColor}
                    onChange={(e) => handleBgChange(e.target.value)}
                    style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ycs-foreground)', color: 'var(--ycs-text)', padding: '4px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                  />
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => handleBgChange(e.target.value)} 
                  />
                  {window.EyeDropper && (
                    <div 
                      onClick={async () => {
                        try {
                          const result = await new window.EyeDropper().open();
                          handleBgChange(result.sRGBHex);
                        } catch (e) {} // User canceled
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title="Pick color from anywhere on your screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="setting-row">
                <label>Foreground Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={fgColor}
                    onChange={(e) => handleFgChange(e.target.value)}
                    style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ycs-foreground)', color: 'var(--ycs-text)', padding: '4px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                  />
                  <input 
                    type="color" 
                    value={fgColor} 
                    onChange={(e) => handleFgChange(e.target.value)} 
                  />
                  {window.EyeDropper && (
                    <div 
                      onClick={async () => {
                        try {
                          const result = await new window.EyeDropper().open();
                          handleFgChange(result.sRGBHex);
                        } catch (e) {} // User canceled
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title="Pick color from anywhere on your screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ycs-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="setting-row">
                <label>Text Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={textColor}
                    onChange={(e) => handleTextChange(e.target.value)}
                    style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ycs-foreground)', color: 'var(--ycs-text)', padding: '4px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                  />
                  <input 
                    type="color" 
                    value={textColor} 
                    onChange={(e) => handleTextChange(e.target.value)} 
                  />
                  {window.EyeDropper && (
                    <div 
                      onClick={async () => {
                        try {
                          const result = await new window.EyeDropper().open();
                          handleTextChange(result.sRGBHex);
                        } catch (e) {} // User canceled
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title="Pick color from anywhere on your screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ycs-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div className="setting-row">
                <label>Highlight Color</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={highlightColor}
                    onChange={(e) => handleHighlightChange(e.target.value)}
                    style={{ width: '65px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--ycs-foreground)', color: 'var(--ycs-text)', padding: '4px', borderRadius: '4px', fontSize: '12px', textAlign: 'center', outline: 'none' }}
                  />
                  <input 
                    type="color" 
                    value={highlightColor} 
                    onChange={(e) => handleHighlightChange(e.target.value)} 
                  />
                  {window.EyeDropper && (
                    <div 
                      onClick={async () => {
                        try {
                          const result = await new window.EyeDropper().open();
                          handleHighlightChange(result.sRGBHex);
                        } catch (e) {} // User canceled
                      }}
                      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '4px' }}
                      title="Pick color from anywhere on your screen"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ycs-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', margin: '25px 15px', opacity: 0.3, borderRadius: '1px' }}></div>

              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Text Font</h2>

              <div className="setting-row">
                <label>Font Family</label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input 
                      type="text" 
                      value={fontFamily}
                      onChange={(e) => handleFontChange(e.target.value)}
                      style={{ 
                        width: '180px', 
                        background: 'rgba(0,0,0,0.3)', 
                        border: '1px solid var(--ycs-foreground)', 
                        color: 'var(--ycs-text)', 
                        padding: '4px 24px 4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '12px', 
                        outline: 'none',
                        fontFamily: 'inherit',
                        boxSizing: 'border-box'
                      }}
                      placeholder="e.g. 'Roboto', sans-serif"
                    />
                    <div 
                      onClick={() => setFontMenuOpen(!fontMenuOpen)}
                      style={{ 
                        position: 'absolute', 
                        right: '4px', 
                        cursor: 'pointer', 
                        opacity: 0.7, 
                        padding: '4px',
                        fontSize: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ▼
                    </div>
                  </div>
                  
                  {fontMenuOpen && (
                    <div className="dropdown" style={{ width: '100%', marginTop: '4px', top: '100%' }}>
                      {FONT_OPTIONS.map((font) => (
                        <div 
                          key={font.label}
                          className="dropdown-item"
                          style={{ fontFamily: font.value }}
                          onClick={() => {
                            handleFontChange(font.value);
                            setFontMenuOpen(false);
                          }}
                        >
                          {font.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{ 
        height: '50px', 
        borderTop: '1px solid var(--ycs-foreground)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'flex-end', 
        padding: '0 15px', 
        gap: '10px', 
        backgroundColor: 'var(--ycs-bg)', 
        flexShrink: 0 
      }}>
        <button className="ycs-button primary" onClick={handleOk}>OK</button>
        <button className="ycs-button" onClick={handleCancel}>Cancel</button>
        <button className="ycs-button" onClick={handleApply} disabled={!hasChanges}>Apply</button>
      </div>

    </div>
  );
}
