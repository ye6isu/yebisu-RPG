import { useState, useEffect, useRef } from "react";
import Titlebar from "./components/Titlebar/Titlebar";
import PreferencesPageNew from "./components/PreferencesPageNew";
import "./App.css";

function App() {
  const isPreferences = window.location.search.includes('page=preferences');

  // Apply default preferences on load
  useEffect(() => {
    const applyTheme = () => {
      const accent = localStorage.getItem('ycs-accent') || '#323233';
      const bg = localStorage.getItem('ycs-bg') || '#000000';
      const fg = localStorage.getItem('ycs-foreground') || '#1a1a1a';
      const text = localStorage.getItem('ycs-text') || '#ffffff';
      const font = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
      const highlight = localStorage.getItem('ycs-highlight') || '#007ACC';
      const radius = localStorage.getItem('ycs-radius') || '4';
      
      document.documentElement.style.setProperty('--ycs-accent', accent);
      document.documentElement.style.setProperty('--ycs-accent-solid', accent.substring(0, 7));
      document.documentElement.style.setProperty('--ycs-bg', bg);
      document.documentElement.style.setProperty('--ycs-foreground', fg);
      document.documentElement.style.setProperty('--ycs-text', text);
      document.documentElement.style.setProperty('--ycs-highlight', highlight);
      document.documentElement.style.setProperty('--ycs-font', font);
      document.documentElement.style.setProperty('--ycs-radius', radius + 'px');
      document.body.style.backgroundColor = 'var(--ycs-bg)';
      document.body.style.color = 'var(--ycs-text)';
      document.body.style.fontFamily = 'var(--ycs-font)';
    };

    applyTheme();
    window.addEventListener('storage', applyTheme);

    // Close subwindows if main window closes
    if (!isPreferences) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow, getAllWindows }) => {
        const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
          // Prevent the default close so we can cleanly close everything else first
          if (event) event.preventDefault();
          
          try {
            const windows = await getAllWindows();
            windows.forEach(w => {
              if (w.label !== 'main') w.close();
            });
            // Ensure state is saved before force destroying
            import('@tauri-apps/plugin-window-state').then(({ saveWindowState }) => {
              return saveWindowState(63); // StateFlags.ALL
            }).finally(() => {
              getCurrentWindow().destroy();
            });
          } catch (e) {
            console.error(e);
            getCurrentWindow().destroy();
          }
        });
        return () => unlistenPromise.then(unlisten => unlisten());
      }).catch(console.error);
    }
  }, [isPreferences]);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ycs-sidebar-width')) || 224;
  });
  const [isExampleGroupOpen, setIsExampleGroupOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Tab 1');
  const resizingRef = useRef(false);

  const startResizing = (e) => {
    e.preventDefault(); 
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  useEffect(() => {
    const stopResizing = () => {
      if (resizingRef.current) {
        resizingRef.current = false;
        document.body.style.cursor = 'default';
        localStorage.setItem('ycs-sidebar-width', sidebarWidth);
      }
    };
    const resize = (e) => {
      if (resizingRef.current) {
        const maxWidth = window.innerWidth - 30; // 24px workspace + 6px gap
        const newWidth = Math.min(Math.max(224, e.clientX), maxWidth);
        setSidebarWidth(newWidth);
      }
    };
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [sidebarWidth]);

  if (isPreferences) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Titlebar isSubwindow={true} title="Preferences" />
        <div style={{ flexGrow: 1, position: 'relative', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <PreferencesPageNew 
            isTile={false} 
            onClose={() => import('@tauri-apps/api/window').then(m => m.getCurrentWindow().close())} 
          />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Titlebar />
      <main style={{ flexGrow: 1, position: 'relative', display: 'flex', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Left Toolbar / Tab Area */}
        <div 
          style={{ 
            width: `${sidebarWidth}px`, 
            minWidth: '224px',
            backgroundColor: 'var(--ycs-accent)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
            flexShrink: 0,
            position: 'relative',
            overflowX: 'hidden',
            overflowY: 'hidden'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%', padding: '0 8px', boxSizing: 'border-box', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
            
            {/* Example Group */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div
                className="ycs-tab"
                onClick={() => setIsExampleGroupOpen(!isExampleGroupOpen)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '8px', userSelect: 'none' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, transform: isExampleGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s ease-out' }}>
                  <path d="M9 18l6-6-6-6"/>
                </svg>
                Example Group
              </div>

              {isExampleGroupOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                  <div
                    className={`ycs-tab ${activeTab === 'Tab 1' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Tab 1')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '22px' }}
                  >
                    <div style={{ width: '14px', flexShrink: 0 }} />
                    Example Tab 1
                  </div>
                  <div
                    className={`ycs-tab ${activeTab === 'Tab 2' ? 'active' : ''}`}
                    onClick={() => setActiveTab('Tab 2')}
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '22px' }}
                  >
                    <div style={{ width: '14px', flexShrink: 0 }} />
                    Example Tab 2
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Resizer Handle */}
        <div style={{ position: 'relative', width: 0, zIndex: 100 }}>
          <div 
            onMouseDown={startResizing}
            style={{
              position: 'absolute',
              left: '-5px',
              width: '10px',
              height: '100%',
              cursor: 'col-resize',
              backgroundColor: 'transparent'
            }}
          />
        </div>

        {/* Right Workspace Container */}
        <div style={{ 
          flex: 1, 
          display: 'flex',
          borderRight: '6px solid var(--ycs-accent)',
          borderBottom: '6px solid var(--ycs-accent)',
          backgroundClip: 'padding-box',
          overflow: 'hidden',
          boxSizing: 'border-box',
          minWidth: '30px'
        }}>
          {/* Inner Content Area mapped from WorkspaceLeaf */}
          <div className="workspace-leaf">
            <div className="workspace-leaf-inner">
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px', color: 'var(--ycs-text)', overflow: 'hidden' }}>
                <h2>Selected Tab: {activeTab}</h2>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;

