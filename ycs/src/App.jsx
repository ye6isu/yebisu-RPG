import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import Titlebar from "./components/Titlebar/Titlebar";
import { TitlebarActionsProvider } from "./components/Titlebar/TitlebarActionsContext";
import PreferencesPageNew from "./components/PreferencesPageNew";
import ItemsLanding from "./components/ItemsLanding";
import EntitiesLanding from "./components/EntitiesLanding";
import TabsLanding from "./components/TabsLanding";
import TagsLanding from "./components/TagsLanding";
import TextureManager from "./components/TextureManager";
import ComponentsLanding from "./components/ComponentsLanding";
import EntityVariablesLanding from "./components/EntityVariablesLanding";
import AttributesLanding from "./components/AttributesLanding";
import KeybindsLanding from "./components/KeybindsLanding";
import AbilitiesLanding from "./components/AbilitiesLanding";
import HudLanding from "./components/HudLanding";
import ResourcesLanding from "./components/ResourcesLanding";
import VfxLanding from "./components/VfxLanding";
import VfxNewLanding from "./components/VfxNewLanding";
import OverlayScrollArea from "./components/OverlayScrollArea";
import "./App.css";

function storedSidebarGroupState(key) {
  const stored = localStorage.getItem(key);
  return stored === null ? true : stored === 'true';
}

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ycs-sidebar-collapsed') === 'true';
  });
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ycs-active-tab') || 'items');
  const [isRegistryOpen, setIsRegistryOpen] = useState(() => storedSidebarGroupState('ycs-sidebar-registry-open'));
  const [isDataOpen, setIsDataOpen] = useState(() => storedSidebarGroupState('ycs-sidebar-data-open'));
  const [isAssetsOpen, setIsAssetsOpen] = useState(() => storedSidebarGroupState('ycs-sidebar-assets-open'));
  const [isInterfaceOpen, setIsInterfaceOpen] = useState(() => storedSidebarGroupState('ycs-sidebar-interface-open'));
  const [runningTasks, setRunningTasks] = useState({ runClient: false, runData: false });
  const [pendingTasks, setPendingTasks] = useState({ runClient: false, runData: false });
  const resizingRef = useRef(false);

  const startResizing = (e) => {
    if (isSidebarCollapsed) return;
    e.preventDefault();
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(current => {
      const next = !current;
      localStorage.setItem('ycs-sidebar-collapsed', String(next));
      return next;
    });
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

  useEffect(() => {
    if (isPreferences) return undefined;
    let cancelled = false;
    const refreshTaskStatus = async () => {
      try {
        const [runClient, runData] = await Promise.all([
          invoke('gradle_task_running', { task: 'runClient' }),
          invoke('gradle_task_running', { task: 'runData' }),
        ]);
        if (!cancelled) setRunningTasks({ runClient, runData });
      } catch (error) {
        console.error(error);
      }
    };
    refreshTaskStatus();
    const timer = window.setInterval(refreshTaskStatus, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isPreferences]);

  const toggleGradleTask = async (task) => {
    setPendingTasks(current => ({ ...current, [task]: true }));
    try {
      const running = await invoke('toggle_gradle_task', { task });
      setRunningTasks(current => ({ ...current, [task]: running }));
    } catch (error) {
      console.error(error);
      window.alert(`Unable to ${runningTasks[task] ? 'stop' : 'start'} ${task}: ${error}`);
    } finally {
      setPendingTasks(current => ({ ...current, [task]: false }));
    }
  };

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

  const toggleSidebarGroup = (storageKey, setter) => {
    setter(current => {
      const next = !current;
      localStorage.setItem(storageKey, String(next));
      return next;
    });
  };

  const SidebarGroup = ({ label, isOpen, onToggle, tabKeys, children }) => (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        className={`ycs-tab ${!isOpen && tabKeys.includes(activeTab) ? 'active' : ''}`}
        onClick={onToggle}
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '6px 8px', userSelect: 'none' }}
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
      style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', padding: '6px 22px' }}
    >
      <div style={{ width: '14px', flexShrink: 0 }} />
      {label}
    </div>
  );

  const RunTaskIcon = ({ kind, running }) => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      {kind === 'client' ? (
        <>
          <rect x="2.5" y="2.5" width="13" height="10" rx="1" stroke="currentColor" />
          <path d="M6 15.5h6M9 12.5v3" stroke="currentColor" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="9" cy="4" rx="6" ry="2.5" stroke="currentColor" />
          <path d="M3 4v7.5C3 12.88 5.69 14 9 14s6-1.12 6-2.5V4M3 7.75c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" stroke="currentColor" />
        </>
      )}
      {running ? (
        <rect x="7" y="6" width="4" height="4" rx="0.5" fill="currentColor" />
      ) : (
        <path d="M7 5.75L11.5 8 7 10.25V5.75Z" fill="currentColor" />
      )}
    </svg>
  );

  const tabs = [
    { key: 'items', component: <ItemsLanding isActive={activeTab === 'items'} /> },
    { key: 'entities', component: <EntitiesLanding isActive={activeTab === 'entities'} /> },
    { key: 'tabs', component: <TabsLanding isActive={activeTab === 'tabs'} /> },
    { key: 'tags', component: <TagsLanding isActive={activeTab === 'tags'} /> },
    { key: 'components', component: <ComponentsLanding isActive={activeTab === 'components'} /> },
    { key: 'entityvars', component: <EntityVariablesLanding isActive={activeTab === 'entityvars'} /> },
    { key: 'attributes', component: <AttributesLanding isActive={activeTab === 'attributes'} /> },
    { key: 'keybinds', component: <KeybindsLanding isActive={activeTab === 'keybinds'} /> },
    { key: 'abilities', component: <AbilitiesLanding isActive={activeTab === 'abilities'} /> },
    { key: 'textures', component: <TextureManager isActive={activeTab === 'textures'} /> },
    { key: 'vfx', component: <VfxLanding isActive={activeTab === 'vfx'} /> },
    { key: 'vfx-new', component: <VfxNewLanding isActive={activeTab === 'vfx-new'} /> },
    { key: 'resources', component: <ResourcesLanding isActive={activeTab === 'resources'} /> },
    { key: 'hud', component: <HudLanding isActive={activeTab === 'hud'} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Titlebar />
      <main style={{ flexGrow: 1, position: 'relative', display: 'flex', width: '100%', boxSizing: 'border-box', minHeight: 0, overflow: 'hidden' }}>

        {!isSidebarCollapsed && <div
          className="ycs-main-sidebar"
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
          <OverlayScrollArea
            vertical
            horizontal={false}
            style={{ width: '100%', flex: 1, minHeight: 0 }}
            contentStyle={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%', padding: '0 8px', boxSizing: 'border-box' }}
          >

            <SidebarGroup
              label="Registry"
              isOpen={isRegistryOpen}
              onToggle={() => toggleSidebarGroup('ycs-sidebar-registry-open', setIsRegistryOpen)}
              tabKeys={['items', 'entities', 'tabs', 'tags']}
            >
              <SidebarTab label="Items" tabKey="items" />
              <SidebarTab label="Entities" tabKey="entities" />
              <SidebarTab label="Creative Tabs" tabKey="tabs" />
              <SidebarTab label="Tags" tabKey="tags" />
            </SidebarGroup>

            <SidebarGroup
              label="Data"
              isOpen={isDataOpen}
              onToggle={() => toggleSidebarGroup('ycs-sidebar-data-open', setIsDataOpen)}
              tabKeys={['components', 'entityvars', 'attributes', 'keybinds', 'abilities']}
            >
              <SidebarTab label="Data Components" tabKey="components" />
              <SidebarTab label="Entity Variables" tabKey="entityvars" />
              <SidebarTab label="Attributes" tabKey="attributes" />
              <SidebarTab label="Keybinds" tabKey="keybinds" />
              <SidebarTab label="Abilities" tabKey="abilities" />
            </SidebarGroup>

            <SidebarGroup
              label="Assets"
              isOpen={isAssetsOpen}
              onToggle={() => toggleSidebarGroup('ycs-sidebar-assets-open', setIsAssetsOpen)}
              tabKeys={['textures', 'vfx', 'vfx-new']}
            >
              <SidebarTab label="Textures" tabKey="textures" />
              <SidebarTab label="VFX" tabKey="vfx" />
              <SidebarTab label="VFX (New)" tabKey="vfx-new" />
            </SidebarGroup>

            <SidebarGroup
              label="Interface"
              isOpen={isInterfaceOpen}
              onToggle={() => toggleSidebarGroup('ycs-sidebar-interface-open', setIsInterfaceOpen)}
              tabKeys={['resources', 'hud']}
            >
              <SidebarTab label="Resources" tabKey="resources" />
              <SidebarTab label="HUD" tabKey="hud" />
            </SidebarGroup>

          </OverlayScrollArea>
          <div className="ycs-sidebar-run-bar">
            <button
              className={`ycs-button icon ycs-sidebar-run-button ${runningTasks.runClient ? 'running' : ''}`}
              disabled={pendingTasks.runClient}
              onClick={() => toggleGradleTask('runClient')}
              title={runningTasks.runClient ? 'Stop Client' : 'Run Client'}
              aria-label={runningTasks.runClient ? 'Stop Client' : 'Run Client'}
            >
              <RunTaskIcon kind="client" running={runningTasks.runClient} />
            </button>
            <button
              className={`ycs-button icon ycs-sidebar-run-button ${runningTasks.runData ? 'running' : ''}`}
              disabled={pendingTasks.runData}
              onClick={() => toggleGradleTask('runData')}
              title={runningTasks.runData ? 'Stop Data' : 'Run Data'}
              aria-label={runningTasks.runData ? 'Stop Data' : 'Run Data'}
            >
              <RunTaskIcon kind="data" running={runningTasks.runData} />
            </button>
          </div>
        </div>}

        <div className={`ycs-sidebar-divider ${isSidebarCollapsed ? 'collapsed' : ''}`}>
          {!isSidebarCollapsed && (
            <div
              className="ycs-sidebar-resize-hitbox"
              onMouseDown={startResizing}
              aria-hidden="true"
            />
          )}
          <button
            type="button"
            className="ycs-sidebar-collapse-button"
            onMouseDown={event => event.stopPropagation()}
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? 'Show tabs' : 'Hide tabs'}
            aria-label={isSidebarCollapsed ? 'Show tabs' : 'Hide tabs'}
            aria-expanded={!isSidebarCollapsed}
          >
            <svg width="12" height="18" viewBox="0 0 12 18" fill="none" aria-hidden="true">
              <path
                d={isSidebarCollapsed ? 'M4 3.5L9 9L4 14.5' : 'M8 3.5L3 9L8 14.5'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
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

export default function AppWithTitlebarActions() {
  return (
    <TitlebarActionsProvider>
      <App />
    </TitlebarActionsProvider>
  );
}
