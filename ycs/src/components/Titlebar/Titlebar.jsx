import React, { useState, useRef, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useCurrentTitlebarActions } from './TitlebarActionsContext';
import './Titlebar.css';

function TitlebarActionIcon({ icon }) {
  if (icon === 'delete') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7H20M9 7V4H15V7M7 7L8 20H16L17 7M10 10V17M14 10V17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (icon === 'cancel') {
    return (
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 5L19 19M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 3H17L21 7V21H3V3H5ZM7 3V9H16V3M7 21V14H17V21" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

export default function Titlebar({ openPreferences, isSubwindow, title }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const actions = useCurrentTitlebarActions();

  // Close menu if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    if (!isSubwindow) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      if (!isSubwindow) {
        document.removeEventListener('mousedown', handleClickOutside);
      }
    };
  }, [isSubwindow]);

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        {!isSubwindow ? (
          <>
            <img src="/yebisu.png" alt="YCS Logo" className="logo-icon" />
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
                      WebviewWindow.getByLabel('preferences').then(existing => {
                        if (existing) {
                          existing.setFocus();
                        } else {
                          new WebviewWindow('preferences', {
                            url: '/?page=preferences',
                            title: 'Preferences',
                            width: 600,
                            height: 500,
                            decorations: false
                          });
                        }
                      }).catch(console.error);
                      setMenuOpen(false);
                    }}
                  >
                    Preferences
                  </div>
                  <div className="dropdown-separator"></div>
                  <div 
                    className="dropdown-item" 
                    onClick={() => {
                      import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().close());
                    }}
                  >
                    Exit
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--ycs-text)', fontSize: '12px', paddingLeft: '4px', opacity: 0.8, userSelect: 'none' }}>
            {title}
          </div>
        )}
      </div>

      {!isSubwindow && actions?.buttons?.length > 0 && (
        <div className="titlebar-action-buttons" onPointerDown={(event) => event.stopPropagation()}>
          {actions.buttons.map(button => (
            <button
              key={button.id}
              className={`menu-button titlebar-icon-button ${button.danger ? 'danger' : ''}`}
              type="button"
              title={button.title}
              aria-label={button.ariaLabel ?? button.title}
              disabled={button.disabled}
              onClick={button.onClick}
            >
              <TitlebarActionIcon icon={button.icon} />
            </button>
          ))}
        </div>
      )}

      {!isSubwindow && !actions?.buttons?.length && (
        <div className="titlebar-search" onPointerDown={(event) => event.stopPropagation()}>
          <input
            className="titlebar-search-input"
            type="search"
            aria-label="Search current page"
            value={actions?.search ?? ''}
            onChange={event => actions?.onSearchChange(event.target.value)}
          />
          <button className="menu-button titlebar-icon-button titlebar-add-button" type="button" title="Add" aria-label="Add" onClick={() => actions?.onAdd()}>
            <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2V22M2 12H22" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Draggable Area Spacer */}
      <div 
        data-tauri-drag-region 
        style={{ flexGrow: 1, height: '100%' }}
        onPointerDown={() => {
          import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
            getCurrentWindow().startDragging();
          });
        }}
      ></div>

      {/* Window Controls (Right side) */}
      <div className="titlebar-right" style={{
        display: 'flex',
        height: '100%',
        alignItems: 'center'
      }}>
        {!isSubwindow && (
          <>
            <div 
              className="titlebar-button"
              title="Minimize"
              onClick={() => {
                import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().minimize());
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1" y="4" width="8" height="1" fill="currentColor"/>
              </svg>
            </div>
            <div 
              className="titlebar-button"
              title="Maximize"
              onClick={() => {
                import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().toggleMaximize());
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="1.5" y="1.5" width="7" height="7" stroke="currentColor" strokeWidth="1"/>
              </svg>
            </div>
          </>
        )}
        <div 
          className="titlebar-button titlebar-close"
          title="Close"
          onClick={() => {
            import('@tauri-apps/api/window').then(({ getCurrentWindow }) => getCurrentWindow().close());
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </div>
      </div>
    </div>
  );
}
