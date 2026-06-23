import React, { useState, useEffect, useRef } from 'react';
import './Field.css';

export function FieldRow({ label, children }) {
  return (
    <div className="ycs-field-row">
      <div className="ycs-field-label">{label}</div>
      <div className="ycs-field-control">
        {children}
      </div>
    </div>
  );
}

export function StringField({ value, onChange, placeholder, style = {} }) {
  return (
    <input 
      className="ycs-string-input"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={style}
    />
  );
}

export function TinyButton({ onClick, children, title }) {
  return (
    <div className="ycs-tiny-button" onClick={onClick} title={title}>
      {children}
    </div>
  );
}

export function ColorField({ value, onChange }) {
  return (
    <>
      <StringField value={value} onChange={onChange} style={{ width: '65px', textAlign: 'center' }} />
      <div className="ycs-color-preview" style={{ backgroundColor: value }} title="Open OS Color Picker">
        <input 
          type="color" 
          value={value} 
          onChange={e => onChange(e.target.value)} 
          className="ycs-color-input-hidden"
        />
      </div>
      {window.EyeDropper && (
        <TinyButton 
          onClick={async () => {
            try {
              const result = await new window.EyeDropper().open();
              onChange(result.sRGBHex);
            } catch (e) {}
          }}
          title="Pick color from anywhere on your screen"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m2 22 1-1h3l9-9M3 21v-3l9-9M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </TinyButton>
      )}
    </>
  );
}

export function FontComboField({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <StringField 
        value={value} 
        onChange={onChange} 
        placeholder="e.g. 'Roboto', sans-serif" 
        style={{ width: '180px', paddingRight: '24px' }} 
      />
      <div 
        onClick={() => setIsOpen(!isOpen)}
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
      
      {isOpen && (
        <div className="dropdown" style={{ width: '100%', marginTop: '4px', top: '100%', zIndex: 100 }}>
          {options.map((opt) => (
            <div 
              key={opt.label}
              className="dropdown-item"
              style={{ fontFamily: opt.value }}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DropdownField({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef(null);
  
  const selectedOption = options.find(o => o.value === value);
  const displayValue = isOpen ? searchTerm : (selectedOption ? selectedOption.label : value);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(''); // Reset search when closed
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div 
        onClick={() => { if (!isOpen) setIsOpen(true); }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          width: '100%',
          padding: '0 8px',
          background: 'var(--ycs-bg)',
          border: '1px solid var(--ycs-foreground)',
          borderRadius: '4px',
          color: 'var(--ycs-text)',
          cursor: 'text',
          fontSize: '12px',
          boxSizing: 'border-box',
          height: '24px'
        }}
      >
        <input 
          type="text"
          value={displayValue}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            outline: 'none',
            width: '100%',
            height: '100%',
            fontFamily: 'inherit',
            fontSize: 'inherit',
            cursor: 'text'
          }}
        />
        <span 
          onClick={(e) => {
             e.stopPropagation();
             setIsOpen(!isOpen);
          }}
          style={{ fontSize: '8px', opacity: 0.7, cursor: 'pointer', padding: '4px' }}
        >▼</span>
      </div>
      
      {isOpen && (
        <div className="dropdown" style={{ width: '100%', marginTop: '4px', top: '100%', zIndex: 100 }}>
          {filteredOptions.length > 0 ? filteredOptions.map((opt) => (
            <div 
              key={opt.label}
              className="dropdown-item"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          )) : (
            <div className="dropdown-item" style={{ opacity: 0.5 }}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
}
