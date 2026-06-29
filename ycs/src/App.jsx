import { useState, useEffect, useRef } from "react";
import Titlebar from "./components/Titlebar/Titlebar";
import PreferencesPageNew from "./components/PreferencesPageNew";
import ItemsLanding from "./components/ItemsLanding";
import TextureManager from "./components/TextureManager";
import "./App.css";

function App() {
  const isPreferences = window.location.search.includes('page=preferences');

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

    if (!isPreferences) {
      import('@tauri-apps/api/window').then(({ getCurrentWindow, getAllWindows }) => {
        const unlistenPromise = getCurrentWindow().onCloseRequested(async (event) => {
          if (event) event.preventDefault();
          try {
            const windows = await getAllWindows();
            windows.forEach(w => {
              if (w.label !== 'main') w.close();
            });
            import('@tauri-apps/plugin-window-state').then(({ saveWindowState }) => {
              return saveWindowState(63);
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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ycs-active-tab') || 'items');
  const [isRegistryOpen, setIsRegistryOpen] = useState(true);
  const [isAssetsOpen, setIsAssetsOpen] = useState(true);
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
        const maxWidth = window.innerWidth - 30;
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

  const SidebarGroup = ({ label, isOpen, onToggle, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className="ycs-tab"
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '8px', userSelect: 'none' }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s ease-out' }}>
          <path d="M9 18l6-6-6-6"/>
        </svg>
        {label}
      </div>
      {isOpen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
          {children}
        </div>
      )}
    </div>
  );

  const SidebarTab = ({ label, tabKey }) => (
    <div
      className={`ycs-tab ${activeTab === tabKey ? 'active' : ''}`}
      onClick={() => { setActiveTab(tabKey); localStorage.setItem('ycs-active-tab', tabKey); }}
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', paddingLeft: '22px' }}
    >
      <div style={{ width: '14px', flexShrink: 0 }} />
      {label}
    </div>
  );

  const tabs = [
    { key: 'items', component: <ItemsLanding /> },
    { key: 'textures', component: <TextureManager /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Titlebar />
      <main style={{ flexGrow: 1, position: 'relative', display: 'flex', width: '100%', boxSizing: 'border-box' }}>

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

            <SidebarGroup label="Registry" isOpen={isRegistryOpen} onToggle={() => setIsRegistryOpen(!isRegistryOpen)}>
              <SidebarTab label="Items" tabKey="items" />
            </SidebarGroup>

            <SidebarGroup label="Assets" isOpen={isAssetsOpen} onToggle={() => setIsAssetsOpen(!isAssetsOpen)}>
              <SidebarTab label="Textures" tabKey="textures" />
            </SidebarGroup>

          </div>
        </div>

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
          <div className="workspace-leaf">
            <div className="workspace-leaf-inner">
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', color: 'var(--ycs-text)', overflow: 'hidden', position: 'relative' }}>
                {tabs.map(t => (
                  <div key={t.key} style={{ display: activeTab === t.key ? 'flex' : 'none', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {t.component}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;
