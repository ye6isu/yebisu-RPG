import React, { useState, useRef, useEffect } from 'react';
import './PreferencesPage.css';
import { FieldRow, ColorField, FontComboField, DropdownField, StringField } from './Field/Field';

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'System Default', value: "system-ui, sans-serif" }
];

const ShortcutInput = ({ value, onChange, defaultValue }) => {
  const [recording, setRecording] = useState(false);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (e) => {
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
      
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      onChange(parts.join('+'));
      setRecording(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recording, onChange]);

  return (
    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
      <div 
        style={{ 
          width: '100%', 
          padding: '4px 8px', 
          backgroundColor: 'transparent', 
          color: recording ? 'var(--ycs-highlight)' : 'var(--ycs-text)', 
          border: recording ? '1px solid var(--ycs-highlight)' : '1px solid var(--ycs-foreground)', 
          borderRadius: 'var(--ycs-radius, 4px)', 
          boxSizing: 'border-box',
          fontSize: '12px',
          fontFamily: 'inherit',
          height: '24px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {recording ? 'Listening...' : value}
      </div>
      <button 
        className="ycs-button inline" 
        onClick={() => setRecording(!recording)}
        style={{ minWidth: '70px', flexShrink: 0 }}
      >
        {recording ? 'Cancel' : 'Record'}
      </button>
      <button 
        className="ycs-button icon"
        onClick={() => onChange(defaultValue)}
        title="Reset to Default"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
      </button>
    </div>
  );
};

export default function PreferencesPage({ isTile }) {
  const [activeTab, setActiveTab] = useState('Appearance');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ycs-prefs-sidebar-width')) || 160;
  });

  const isResizing = useRef(false);
  const widthRef = useRef(sidebarWidth);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResizing = React.useCallback((e) => {
    e.preventDefault(); /* Prevents native text selection from breaking the drag */
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = widthRef.current;
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing.current) return;
      let newWidth = startWidth.current + (e.clientX - startX.current);
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

  const [accentColor, setAccentColor] = useState(localStorage.getItem('ycs-accent') || '#323233');
  const [bgColor, setBgColor] = useState(localStorage.getItem('ycs-bg') || '#1E1E1E');
  const [fgColor, setFgColor] = useState(localStorage.getItem('ycs-foreground') || '#2D2D2D');
  const [textColor, setTextColor] = useState(localStorage.getItem('ycs-text') || '#CCCCCC');
  const [highlightColor, setHighlightColor] = useState(localStorage.getItem('ycs-highlight') || '#007ACC');
  const [fontFamily, setFontFamily] = useState(localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif");
  
  const [transparency, setTransparency] = useState(parseInt(localStorage.getItem('ycs-transparency')) || 55);
  const [radius, setRadius] = useState(parseInt(localStorage.getItem('ycs-radius')) || 4);
  const [gap, setGap] = useState(parseInt(localStorage.getItem('ycs-gap')) || 6);
  const [motd, setMotd] = useState(localStorage.getItem('ycs-motd') || 'hello world');

  const [closeTabKey, setCloseTabKey] = useState(localStorage.getItem('ycs-keymap-closetab') || 'Ctrl+W');
  const [resetKey, setResetKey] = useState(localStorage.getItem('ycs-keymap-reset') || 'Ctrl+Shift+R');

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const originalAccent = localStorage.getItem('ycs-accent') || '#323233';
    const originalBg = localStorage.getItem('ycs-bg') || '#1E1E1E';
    const originalFg = localStorage.getItem('ycs-foreground') || '#2D2D2D';
    const originalText = localStorage.getItem('ycs-text') || '#CCCCCC';
    const originalHighlight = localStorage.getItem('ycs-highlight') || '#007ACC';
    const originalFont = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
    const originalTrans = parseInt(localStorage.getItem('ycs-transparency')) || 55;
    const originalRadius = parseInt(localStorage.getItem('ycs-radius')) || 4;
    const originalGap = parseInt(localStorage.getItem('ycs-gap')) || 6;
    const originalMotd = localStorage.getItem('ycs-motd') || 'hello world';
    
    if (
      accentColor !== originalAccent || bgColor !== originalBg || fgColor !== originalFg ||
      textColor !== originalText || highlightColor !== originalHighlight || fontFamily !== originalFont ||
      transparency !== originalTrans || radius !== originalRadius || gap !== originalGap || motd !== originalMotd
    ) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [accentColor, bgColor, fgColor, textColor, highlightColor, fontFamily, transparency, radius, gap, motd]);

  const applyVariables = (acc, bgC, fgC, txt, hl, font, trans, rad) => {
    let alphaHex = Math.round((trans / 100) * 255).toString(16).padStart(2, '0');
    let a = acc; if (a.length === 7 && a.startsWith('#')) a += alphaHex; else if (a.length === 9) a = a.substring(0,7) + alphaHex;
    let b = bgC; if (b.length === 7 && b.startsWith('#')) b += alphaHex; else if (b.length === 9) b = b.substring(0,7) + alphaHex;
    let f = fgC; if (f.length === 9) f = f.substring(0,7);
    let h = hl; if (h.length === 9) h = h.substring(0,7);

    document.documentElement.style.setProperty('--ycs-accent', a);
    document.documentElement.style.setProperty('--ycs-accent-solid', acc.substring(0,7));
    document.documentElement.style.setProperty('--ycs-bg', b);
    document.documentElement.style.setProperty('--ycs-foreground', f);
    document.documentElement.style.setProperty('--ycs-text', txt);
    document.documentElement.style.setProperty('--ycs-highlight', h);
    document.documentElement.style.setProperty('--ycs-font', font);
    document.documentElement.style.setProperty('--ycs-radius', `${rad}px`);
    document.documentElement.style.setProperty('--ycs-gap', `${gap}px`);
  };

  const handleApply = () => {
    localStorage.setItem('ycs-accent', accentColor);
    localStorage.setItem('ycs-bg', bgColor);
    localStorage.setItem('ycs-foreground', fgColor);
    localStorage.setItem('ycs-text', textColor);
    localStorage.setItem('ycs-highlight', highlightColor);
    localStorage.setItem('ycs-font', fontFamily);
    localStorage.setItem('ycs-transparency', transparency);
    localStorage.setItem('ycs-radius', radius);
    localStorage.setItem('ycs-gap', gap);
    localStorage.setItem('ycs-motd', motd);
    localStorage.setItem('ycs-keymap-close-tab', closeTabKey);
    localStorage.setItem('ycs-keymap-reset', resetKey);
    window.dispatchEvent(new Event('ycs-motd-changed'));
  };

  const handleCancel = () => {
    const origAccent = localStorage.getItem('ycs-accent') || '#323233';
    const origBg = localStorage.getItem('ycs-bg') || '#1E1E1E';
    const origFg = localStorage.getItem('ycs-foreground') || '#2D2D2D';
    const origText = localStorage.getItem('ycs-text') || '#CCCCCC';
    const origHighlight = localStorage.getItem('ycs-highlight') || '#007ACC';
    const origFont = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
    const origTrans = parseInt(localStorage.getItem('ycs-transparency')) || 55;
    const origRadius = parseInt(localStorage.getItem('ycs-radius')) || 4;
    const origGap = parseInt(localStorage.getItem('ycs-gap')) || 6;
    const origMotd = localStorage.getItem('ycs-motd') || 'hello world';
    const origCloseTab = localStorage.getItem('ycs-keymap-closetab') || 'Ctrl+W';
    const origReset = localStorage.getItem('ycs-keymap-reset') || 'Ctrl+Shift+R';

    setAccentColor(origAccent);
    setBgColor(origBg);
    setFgColor(origFg);
    setTextColor(origText);
    setHighlightColor(origHighlight);
    setFontFamily(origFont);
    setTransparency(origTrans);
    setRadius(origRadius);
    setGap(origGap);
    setMotd(origMotd);
    setCloseTabKey(origCloseTab);
    setResetKey(origReset);

    applyVariables(origAccent, origBg, origFg, origText, origHighlight, origFont, origTrans, origRadius);
    document.documentElement.style.setProperty('--ycs-gap', `${origGap}px`);

    if (!isTile) {
      window.electronAPI?.controlWindow('close');
    }
  };

  const handleOk = () => { 
    handleApply(); 
    if (!isTile) {
      window.electronAPI?.controlWindow('close'); 
    }
  };

  const handleAccentChange = (val) => { setAccentColor(val); localStorage.setItem('ycs-accent', val); applyVariables(val, bgColor, fgColor, textColor, highlightColor, fontFamily, transparency, radius); };
  const handleBgChange = (val) => { setBgColor(val); localStorage.setItem('ycs-bg', val); applyVariables(accentColor, val, fgColor, textColor, highlightColor, fontFamily, transparency, radius); };
  const handleFgChange = (val) => { setFgColor(val); localStorage.setItem('ycs-foreground', val); applyVariables(accentColor, bgColor, val, textColor, highlightColor, fontFamily, transparency, radius); };
  const handleTextChange = (val) => { setTextColor(val); localStorage.setItem('ycs-text', val); applyVariables(accentColor, bgColor, fgColor, val, highlightColor, fontFamily, transparency, radius); };
  const handleHighlightChange = (val) => { setHighlightColor(val); localStorage.setItem('ycs-highlight', val); applyVariables(accentColor, bgColor, fgColor, textColor, val, fontFamily, transparency, radius); };
  const handleFontChange = (val) => { setFontFamily(val); localStorage.setItem('ycs-font', val); applyVariables(accentColor, bgColor, fgColor, textColor, highlightColor, val, transparency, radius); };
  const handleTransparencyChange = (val) => { setTransparency(val); localStorage.setItem('ycs-transparency', val); applyVariables(accentColor, bgColor, fgColor, textColor, highlightColor, fontFamily, val, radius); };
  const handleRadiusChange = (val) => { setRadius(val); localStorage.setItem('ycs-radius', val); applyVariables(accentColor, bgColor, fgColor, textColor, highlightColor, fontFamily, transparency, val); };
  const handleGapChange = (val) => { setGap(val); localStorage.setItem('ycs-gap', val); document.documentElement.style.setProperty('--ycs-gap', `${val}px`); };
  const handleMotdChange = (val) => { 
    setMotd(val); 
    localStorage.setItem('ycs-motd', val); 
    window.dispatchEvent(new Event('ycs-motd-changed')); 
  };


  return (
    <div style={{ 
      width: isTile ? '100%' : '100vw', 
      height: isTile ? '100%' : '100vh', 
      minWidth: 0,
      minHeight: 0,
      backgroundColor: isTile ? 'transparent' : 'var(--ycs-bg)', 
      color: 'var(--ycs-text)', 
      display: 'flex', 
      flexDirection: 'column',
      border: isTile ? 'none' : '1px solid #444',
      boxSizing: 'border-box'
    }}>
      {!isTile && (
        <div style={{ 
          height: '28px', 
          WebkitAppRegion: 'drag', 
          backgroundColor: 'transparent', 
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
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </div>
        </div>
      )}
      
      {/* Content Layout */}
      <div className="preferences-content">
        {/* Left Sidebar */}
        <div className="preferences-sidebar" style={{ width: `${sidebarWidth}px`, maxWidth: 'calc(100% - 50px)' }}>
          <div 
            className={`preferences-tab ${activeTab === 'Appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('Appearance')}
          >
            Appearance
          </div>
          <div 
            className={`preferences-tab ${activeTab === 'Keymap' ? 'active' : ''}`}
            onClick={() => setActiveTab('Keymap')}
          >
            Keymap
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
              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Window Style</h2>
              
              <FieldRow label="Transparency">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={transparency} 
                    onChange={e => handleTransparencyChange(parseInt(e.target.value, 10))} 
                    style={{ flexGrow: 1 }}
                  />
                  <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{transparency}%</span>
                </div>
              </FieldRow>

              <FieldRow label="Corner Radius">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="24" 
                    value={radius} 
                    onChange={e => handleRadiusChange(parseInt(e.target.value, 10))} 
                    style={{ flexGrow: 1 }}
                  />
                  <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{radius}px</span>
                </div>
              </FieldRow>

              <FieldRow label="Workspace Gap">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="24" 
                    value={gap} 
                    onChange={e => handleGapChange(parseInt(e.target.value, 10))} 
                    style={{ flexGrow: 1 }}
                  />
                  <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{gap}px</span>
                </div>
              </FieldRow>

              <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', margin: '25px 0' }}></div>

              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Workspace Empty State</h2>

              <FieldRow label="MOTD Message">
                <StringField 
                  value={motd} 
                  onChange={handleMotdChange} 
                  style={{ width: '100%' }}
                />
              </FieldRow>

              <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', margin: '25px 0' }}></div>

              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>UI Color</h2>

              <FieldRow label="Background Color">
                <ColorField value={accentColor} onChange={handleAccentChange} />
              </FieldRow>
              <FieldRow label="Tile Workspace Color">
                <ColorField value={bgColor} onChange={handleBgChange} />
              </FieldRow>

              <FieldRow label="Foreground Color">
                <ColorField value={fgColor} onChange={handleFgChange} />
              </FieldRow>

              <FieldRow label="Text Color">
                <ColorField value={textColor} onChange={handleTextChange} />
              </FieldRow>

              <FieldRow label="Highlight Color">
                <ColorField value={highlightColor} onChange={handleHighlightChange} />
              </FieldRow>

              <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', margin: '25px 0' }}></div>

              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Text Font</h2>

              <FieldRow label="Font Family">
                <FontComboField value={fontFamily} onChange={handleFontChange} options={FONT_OPTIONS} />
              </FieldRow>

            </div>
          )}

          {activeTab === 'Keymap' && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Shortcuts</h2>
              
              <FieldRow label="Close Hovered Tab">
                <ShortcutInput value={closeTabKey} onChange={setCloseTabKey} defaultValue="Ctrl+W" />
              </FieldRow>

              <FieldRow label="Reset Workspace">
                <ShortcutInput value={resetKey} onChange={setResetKey} defaultValue="Ctrl+Shift+R" />
              </FieldRow>
            </div>
          )}
        </div>
      </div>
      {/* Footer */}
      <div style={{
        padding: 'var(--ycs-gap, 6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)',
        backgroundColor: 'transparent'
      }}>
        <button className="ycs-button" onClick={() => { handleApply(); handleCancel(); }}>OK</button>
        <button className="ycs-button" onClick={handleCancel}>Cancel</button>
        <button className="ycs-button" onClick={handleApply} disabled={!hasChanges}>Apply</button>
      </div>
    </div>
  );
}
