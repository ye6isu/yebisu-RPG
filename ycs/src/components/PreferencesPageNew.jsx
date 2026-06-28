import React, { useState, useRef, useEffect } from 'react';
import './PreferencesPage.css';
import { FieldRow, ColorField, FontComboField } from './Field/Field';

const FONT_OPTIONS = [
  { label: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { label: 'Roboto', value: "'Roboto', sans-serif" },
  { label: 'Open Sans', value: "'Open Sans', sans-serif" },
  { label: 'Segoe UI', value: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
  { label: 'System Default', value: "system-ui, sans-serif" }
];

export default function PreferencesPageNew({ isTile = false, onClose }) {
  const [activeTab, setActiveTab] = useState('Appearance');
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ycs-prefs-sidebar-width')) || 160;
  });

  const isResizing = useRef(false);
  const widthRef = useRef(sidebarWidth);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const startResizing = React.useCallback((e) => {
    e.preventDefault();
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
  
  const [radius, setRadius] = useState(() => {
    const stored = localStorage.getItem('ycs-radius');
    return stored !== null ? parseInt(stored, 10) : 4;
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const originalAccent = localStorage.getItem('ycs-accent') || '#323233';
    const originalBg = localStorage.getItem('ycs-bg') || '#1E1E1E';
    const originalFg = localStorage.getItem('ycs-foreground') || '#2D2D2D';
    const originalText = localStorage.getItem('ycs-text') || '#CCCCCC';
    const originalHighlight = localStorage.getItem('ycs-highlight') || '#007ACC';
    const originalFont = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
    const storedRadius = localStorage.getItem('ycs-radius');
    const originalRadius = storedRadius !== null ? parseInt(storedRadius, 10) : 4;
    
    if (
      accentColor !== originalAccent || bgColor !== originalBg || fgColor !== originalFg ||
      textColor !== originalText || highlightColor !== originalHighlight || fontFamily !== originalFont ||
      radius !== originalRadius
    ) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [accentColor, bgColor, fgColor, textColor, highlightColor, fontFamily, radius]);

  const applyVariables = (acc, bgC, fgC, txt, hl, font, rad) => {
    let a = acc;
    let b = bgC;
    let f = fgC;
    let h = hl;

    document.documentElement.style.setProperty('--ycs-accent', a);
    document.documentElement.style.setProperty('--ycs-accent-solid', acc.substring(0,7));
    document.documentElement.style.setProperty('--ycs-bg', b);
    document.documentElement.style.setProperty('--ycs-foreground', f);
    document.documentElement.style.setProperty('--ycs-text', txt);
    document.documentElement.style.setProperty('--ycs-highlight', h);
    document.documentElement.style.setProperty('--ycs-font', font);
    document.body.style.fontFamily = font;
    document.documentElement.style.setProperty('--ycs-radius', `${rad}px`);
  };

  const handleApply = () => {
    localStorage.setItem('ycs-accent', accentColor);
    localStorage.setItem('ycs-bg', bgColor);
    localStorage.setItem('ycs-foreground', fgColor);
    localStorage.setItem('ycs-text', textColor);
    localStorage.setItem('ycs-highlight', highlightColor);
    localStorage.setItem('ycs-font', fontFamily);
    localStorage.setItem('ycs-radius', radius);
  };

  const handleCancel = () => {
    const origAccent = localStorage.getItem('ycs-accent') || '#323233';
    const origBg = localStorage.getItem('ycs-bg') || '#1E1E1E';
    const origFg = localStorage.getItem('ycs-foreground') || '#2D2D2D';
    const origText = localStorage.getItem('ycs-text') || '#CCCCCC';
    const origHighlight = localStorage.getItem('ycs-highlight') || '#007ACC';
    const origFont = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
    const storedOrigRadius = localStorage.getItem('ycs-radius');
    const origRadius = storedOrigRadius !== null ? parseInt(storedOrigRadius, 10) : 4;

    setAccentColor(origAccent);
    setBgColor(origBg);
    setFgColor(origFg);
    setTextColor(origText);
    setHighlightColor(origHighlight);
    setFontFamily(origFont);
    setRadius(origRadius);

    applyVariables(origAccent, origBg, origFg, origText, origHighlight, origFont, origRadius);

    if (onClose) {
      onClose();
    }
  };

  const handleOk = () => { 
    handleApply(); 
    if (onClose) {
      onClose();
    }
  };

  const handleAccentChange = (val) => { setAccentColor(val); applyVariables(val, bgColor, fgColor, textColor, highlightColor, fontFamily, radius); };
  const handleBgChange = (val) => { setBgColor(val); applyVariables(accentColor, val, fgColor, textColor, highlightColor, fontFamily, radius); };
  const handleFgChange = (val) => { setFgColor(val); applyVariables(accentColor, bgColor, val, textColor, highlightColor, fontFamily, radius); };
  const handleTextChange = (val) => { setTextColor(val); applyVariables(accentColor, bgColor, fgColor, val, highlightColor, fontFamily, radius); };
  const handleHighlightChange = (val) => { setHighlightColor(val); applyVariables(accentColor, bgColor, fgColor, textColor, val, fontFamily, radius); };
  const handleFontChange = (val) => { setFontFamily(val); applyVariables(accentColor, bgColor, fgColor, textColor, highlightColor, val, radius); };
  const handleRadiusChange = (val) => { setRadius(val); applyVariables(accentColor, bgColor, fgColor, textColor, highlightColor, fontFamily, val); };

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'transparent', 
      color: 'var(--ycs-text)' 
    }}>
      <div className="preferences-content" style={{ flexGrow: 1, height: '100%' }}>
        <div className="preferences-sidebar" style={{ width: `${sidebarWidth}px`, maxWidth: 'calc(100% - 50px)' }}>
          <div 
            className={`preferences-tab ${activeTab === 'Appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('Appearance')}
          >
            Appearance
          </div>
        </div>

        <div className="sidebar-resizer" onMouseDown={startResizing}></div>

        <div className="preferences-main">
          {activeTab === 'Appearance' && (
            <div>
              <h2 style={{ marginTop: 0, fontSize: '16px', fontWeight: '500', color: 'var(--ycs-text)', marginBottom: '15px' }}>Window Style</h2>
              
              <FieldRow label="Corner Radius">
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                  <input 
                    type="range" 
                    min="0" 
                    max="24" 
                    value={radius} 
                    onChange={e => handleRadiusChange(parseInt(e.target.value, 10))} 
                    className="ycs-slider"
                    style={{ 
                      flexGrow: 1,
                      background: `linear-gradient(to right, var(--ycs-highlight) ${(radius / 24) * 100}%, var(--ycs-foreground) ${(radius / 24) * 100}%)`
                    }}
                  />
                  <span style={{ fontSize: '12px', width: '30px', textAlign: 'right' }}>{radius}px</span>
                </div>
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
        </div>
      </div>
      
      <div style={{
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: '8px',
        borderTop: '1px solid var(--ycs-foreground)',
        backgroundColor: 'transparent'
      }}>
        <button className="ycs-button" onClick={handleOk}>OK</button>
        <button className="ycs-button" onClick={handleCancel}>Cancel</button>
        <button className="ycs-button" onClick={handleApply} disabled={!hasChanges}>Apply</button>
      </div>
    </div>
  );
}
