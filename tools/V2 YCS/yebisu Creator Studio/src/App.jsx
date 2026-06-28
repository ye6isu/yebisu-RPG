import React, { useEffect, useState, useRef, useCallback } from 'react';
import WindowFrame from './components/WindowFrame/WindowFrame';
import { COMPONENT_REGISTRY, resolveComponent } from './components/Workspace/Workspace';
import Workspace from './components/Workspace/Workspace';

const getTreeMinSize = (node) => {
  if (node.type === 'leaf') return { width: 200, height: 150 };
  if (node.type === 'split') {
     const gap = parseInt(localStorage.getItem('ycs-gap') || '8', 10);
     if (node.direction === 'horizontal') {
        const sizes = node.children.map(getTreeMinSize);
        const width = sizes.reduce((sum, s) => sum + s.width, 0) + gap * (sizes.length - 1);
        const height = Math.max(...sizes.map(s => s.height));
        return { width, height };
     } else {
        const sizes = node.children.map(getTreeMinSize);
        const height = sizes.reduce((sum, s) => sum + s.height, 0) + gap * (sizes.length - 1);
        const width = Math.max(...sizes.map(s => s.width));
        return { width, height };
     }
  }
  return { width: 200, height: 150 };
};

const PopoutWindow = ({ tabId }) => {
  const Component = resolveComponent(tabId);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Control') setIsCtrlPressed(true); };
    const handleKeyUp = (e) => { if (e.key === 'Control') setIsCtrlPressed(false); };
    const handleBlur = () => setIsCtrlPressed(false);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    // Force the title so main.js can find and kill this exact window by title
    document.title = `YCS Popout - ${tabId}`;

    const unsubscribe = window.electronAPI?.onDockSuccess?.((dockedTabId) => {
      if (dockedTabId === tabId) {
        window.electronAPI?.controlWindow('close');
      }
    });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      // IPC listeners in electron usually don't easily unsubscribe if not implemented, but it will be destroyed anyway when closed
    };
  }, [tabId]);

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--ycs-bg)', overflow: 'hidden' }}>
      <div 
        draggable={isCtrlPressed}
        onDragStart={(e) => {
          if (!isCtrlPressed) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.setData('tabId', tabId);
          e.dataTransfer.setData('ycs-tab', 'true');
          e.dataTransfer.setData('ycs-popout', 'true');
          // Important: We must not change WebkitAppRegion mid-drag!
        }}
        onDragEnd={(e) => {
          setIsCtrlPressed(false); // Force reset state when drag ends
        }}
        style={{
          height: '28px',
          width: '100%',
          backgroundColor: isCtrlPressed ? 'var(--ycs-accent)' : 'transparent',
          WebkitAppRegion: isCtrlPressed ? 'no-drag' : 'drag', // OS drag normally, HTML drag when Ctrl is pressed
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingLeft: '10px',
          fontSize: '12px',
          fontWeight: '500',
          flexShrink: 0,
          borderBottom: '1px solid var(--ycs-foreground)',
          color: 'var(--ycs-text)',
          cursor: isCtrlPressed ? 'grab' : 'default',
          transition: 'background-color 0.1s ease'
        }}
        title={isCtrlPressed ? "Drag to dock tab into workspace" : "Hold Ctrl to dock this window"}
      >
        <span>{tabId}</span>
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
      <div style={{ flexGrow: 1, minHeight: 0, position: 'relative' }}>
        {Component ? <Component isTile={false} tabId={tabId} /> : <div style={{ padding: '20px' }}>{tabId}</div>}
      </div>
    </div>
  );
};

function App() {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    return parseInt(localStorage.getItem('ycs-sidebar-width')) || 180;
  });

  const [workspaceTree, setWorkspaceTree] = useState({
    id: 'root-node',
    type: 'leaf',
    tabId: null // Default open tab
  });

  const [activeNodeId, setActiveNodeId] = useState('root-node');
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedTiles, setSelectedTiles] = useState([]);
  const [isGameplayOpen, setIsGameplayOpen] = useState(true);
  const [isAssetsOpen, setIsAssetsOpen] = useState(true);

  const handleTileSelect = (nodeId, e) => {
    if (e.ctrlKey && e.type === 'mousedown') {
      setSelectedTiles(prev => prev.filter(id => id !== nodeId));
    } else if (e.shiftKey) {
      if (e.type === 'mousedown' || e.type === 'mouseenter') {
        setSelectedTiles(prev => prev.includes(nodeId) ? prev : [...prev, nodeId]);
      }
    }
  };

  useEffect(() => {
    const findNodeById = (node, id) => {
      if (node.id === id) return node;
      if (node.type === 'split') {
        for (const child of node.children) {
          const found = findNodeById(child, id);
          if (found) return found;
        }
      }
      return null;
    };
    const mainNode = findNodeById(workspaceTree, activeNodeId);
    
    // If current main node doesn't exist or is empty, automatically assign main to the first populated tab
    if (!mainNode || !mainNode.tabId) {
      const findFirstPopulated = (node) => {
        if (node.type === 'leaf' && node.tabId) return node;
        if (node.type === 'split') {
          for (const child of node.children) {
            const found = findFirstPopulated(child);
            if (found) return found;
          }
        }
        return null;
      };
      const first = findFirstPopulated(workspaceTree);
      if (first) {
        setActiveNodeId(first.id);
      }
    }
  }, [workspaceTree, activeNodeId]);

  const removeNodes = (node, idsToRemove) => {
    if (idsToRemove.includes(node.id)) return null;
    if (node.type === 'split') {
      const removedSizes = node.children
        .filter(c => idsToRemove.includes(c.id) && c.size !== undefined)
        .reduce((sum, c) => sum + c.size, 0);
      const newChildren = node.children.map(c => removeNodes(c, idsToRemove)).filter(Boolean);
      if (newChildren.length === 0) return null;
      if (newChildren.length === 1) {
        return { ...newChildren[0], size: node.size };
      }
      if (removedSizes > 0 && newChildren.length >= 2) {
        const lastIdx = newChildren.length - 1;
        newChildren[lastIdx] = { ...newChildren[lastIdx], size: (newChildren[lastIdx].size || 1) + removedSizes };
      }
      return { ...node, children: newChildren };
    }
    return node;
  };

  const closeTab = (targetId) => {
    setWorkspaceTree(prevTree => {
      const idsToRemove = [targetId];
      
      const findChildren = (node) => {
        if (node.type === 'leaf' && node.linkedParentId && idsToRemove.includes(node.linkedParentId)) {
          if (!idsToRemove.includes(node.id)) {
            idsToRemove.push(node.id);
          }
        }
        if (node.type === 'split') node.children.forEach(findChildren);
      };

      let prevLen = 0;
      while (idsToRemove.length > prevLen) {
        prevLen = idsToRemove.length;
        findChildren(prevTree);
      }

      if (idsToRemove.includes(prevTree.id)) {
        return { id: 'root', type: 'leaf', tabId: null };
      }

      const newTree = removeNodes(prevTree, idsToRemove);
      return newTree || { id: 'root', type: 'leaf', tabId: null };
    });
  };

  useEffect(() => {
    const handleRecursiveClose = (e) => {
      closeTab(e.detail.targetId);
    };
    window.addEventListener('ycs-close-tab-recursive', handleRecursiveClose);
    return () => window.removeEventListener('ycs-close-tab-recursive', handleRecursiveClose);
  }, []);

  const handleTabClick = (tabId) => {
    if (workspaceTree.type === 'split') return; // Disable tab switching when multiple tiles are open

    let updated = false;
    let targetFound = false;
    
    const checkTarget = (node) => {
      if (node.id === activeNodeId && node.type === 'leaf') targetFound = true;
      if (node.type === 'split') node.children.forEach(checkTarget);
    };
    checkTarget(workspaceTree);
    
    if (targetFound) {
      const updateTargetNode = (node) => {
        if (updated) return node;
        if (node.id === activeNodeId && node.type === 'leaf') {
          updated = true;
          return { ...node, tabId };
        }
        if (node.type === 'split') return { ...node, children: node.children.map(updateTargetNode) };
        return node;
      };
      setWorkspaceTree(updateTargetNode(workspaceTree));
    } else {
      let newMainId = activeNodeId;
      const updateFirstLeaf = (node) => {
        if (updated) return node;
        if (node.type === 'leaf') {
          updated = true;
          newMainId = node.id;
          return { ...node, tabId };
        }
        if (node.type === 'split') return { ...node, children: node.children.map(updateFirstLeaf) };
        return node;
      };
      setWorkspaceTree(updateFirstLeaf(workspaceTree));
      setActiveNodeId(newMainId);
    }
  };

  const findTabId = (node, targetId) => {
    if (node.id === targetId) return node.tabId;
    if (node.type === 'split') {
      for (const child of node.children) {
        const found = findTabId(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };  const handleDragStart = (e, tabId) => {
    e.dataTransfer.setData('tabId', tabId);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const resetWorkspace = () => {
    setWorkspaceTree({
      id: 'root-node',
      type: 'leaf',
      tabId: null
    });
  };

  const isResizing = useRef(false);

  const startResizing = useCallback((e) => {
    e.preventDefault(); /* Prevents native text selection from breaking the drag */
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing.current) {
      isResizing.current = false;
      document.body.style.cursor = 'default';
    }
  }, []);

  const resize = useCallback((e) => {
    if (isResizing.current) {
      const wsSize = getTreeMinSize(workspaceTree);
      const gap = parseInt(localStorage.getItem('ycs-gap') || '8', 10);
      const reservedSpace = wsSize.width + gap; // Minimum workspace width + right border
      const maxWidth = window.innerWidth - reservedSpace - 2; // Account for WindowFrame borders
      const newWidth = Math.min(Math.max(180, e.clientX), maxWidth);
      setSidebarWidth(newWidth);
    }
  }, [workspaceTree]);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  useEffect(() => {
    const wsSize = getTreeMinSize(workspaceTree);
    const gap = parseInt(localStorage.getItem('ycs-gap') || '8', 10);
    // sidebarWidth + right border + workspace width + WindowFrame borders
    const totalMinWidth = sidebarWidth + wsSize.width + gap + 2;
    // bottom border + workspace height + titlebar (40px) + WindowFrame borders
    const totalMinHeight = wsSize.height + gap + 40 + 2;

    if (window.electronAPI && window.electronAPI.setMinimumSize) {
       window.electronAPI.setMinimumSize(totalMinWidth, totalMinHeight);
    }
  }, [workspaceTree, sidebarWidth]);

  useEffect(() => {
    const applyTheme = () => {
      const transparency = parseInt(localStorage.getItem('ycs-transparency') || '55', 10);
      const alphaHex = Math.round(((100 - transparency) / 100) * 255).toString(16).padStart(2, '0');

      let accent = localStorage.getItem('ycs-accent') || '#323233';
      let bg = localStorage.getItem('ycs-bg') || '#252526';
      let fg = localStorage.getItem('ycs-foreground') || '#444444';
      
      document.documentElement.style.setProperty('--ycs-accent-solid', accent);
      document.documentElement.style.setProperty('--ycs-bg-solid', bg);
      document.documentElement.style.setProperty('--ycs-foreground-solid', fg);

      if (accent.length === 7 && accent.startsWith('#')) accent += alphaHex;
      else if (accent.length === 9) accent = accent.substring(0, 7) + alphaHex;
      
      if (bg.length === 7 && bg.startsWith('#')) bg += alphaHex;
      else if (bg.length === 9) bg = bg.substring(0, 7) + alphaHex;
      
      // Foreground and Highlight are strictly solid colors.
      if (fg.length === 9) fg = fg.substring(0, 7);
      
      let highlight = localStorage.getItem('ycs-highlight') || '#0078d7';
      if (highlight.length === 9) highlight = highlight.substring(0, 7);
      
      const text = localStorage.getItem('ycs-text') || '#ffffff';
      const font = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
      const radius = localStorage.getItem('ycs-radius') || '4';
      const gap = localStorage.getItem('ycs-gap') || '6';
      
      document.documentElement.style.setProperty('--ycs-accent', accent);
      document.documentElement.style.setProperty('--ycs-bg', bg);
      document.documentElement.style.setProperty('--ycs-foreground', fg);
      document.documentElement.style.setProperty('--ycs-text', text);
      document.documentElement.style.setProperty('--ycs-highlight', highlight);
      document.documentElement.style.setProperty('--ycs-font', font);
      document.documentElement.style.setProperty('--ycs-radius', radius + 'px');
      document.documentElement.style.setProperty('--ycs-gap', gap + 'px');
      
      window.electronAPI?.updateTheme({ accent });
    };
    applyTheme();
    window.addEventListener('storage', applyTheme);
    return () => window.removeEventListener('storage', applyTheme);
  }, []);

  const urlParams = new URLSearchParams(window.location.search);

  if (urlParams.get('page') === 'popout') {
    return <PopoutWindow tabId={urlParams.get('tabId')} />;
  }

  // Keymaps Listener
  useEffect(() => {
    const handleMouseMove = (e) => {
      window.lastMouseX = e.clientX;
      window.lastMouseY = e.clientY;
    };
    
    const handleKeyDown = (e) => {
      const matchKey = (keyStr, event) => {
         const parts = keyStr.split('+').map(p => p.trim().toLowerCase());
         const alt = parts.includes('alt');
         const ctrl = parts.includes('ctrl') || parts.includes('control');
         const shift = parts.includes('shift');
         const key = parts.find(p => p !== 'alt' && p !== 'ctrl' && p !== 'control' && p !== 'shift');
         if (!key) return false;
         return event.altKey === alt && event.ctrlKey === ctrl && event.shiftKey === shift && event.key.toLowerCase() === key;
      };

      const closeStr = localStorage.getItem('ycs-keymap-close-tab') || 'Ctrl+W';
      const resetStr = localStorage.getItem('ycs-keymap-reset') || 'Ctrl+Shift+R';

      if (matchKey(resetStr, e)) {
        e.preventDefault();
        resetWorkspace();
      } else if (matchKey(closeStr, e)) {
        e.preventDefault();
        const el = document.elementFromPoint(window.lastMouseX || 0, window.lastMouseY || 0);
        if (el) {
          const leaf = el.closest('.workspace-leaf');
          if (leaf) {
             const nodeId = leaf.getAttribute('data-node-id');
             if (nodeId) closeTab(nodeId);
          }
        }
      }
    };

    const handleContextMenu = (e) => {
      if (e.defaultPrevented) return;
      const leafNode = e.target.closest('.workspace-leaf');
      if (leafNode) {
        e.preventDefault();
        const nodeId = leafNode.getAttribute('data-node-id');
        if (nodeId) {
          setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
        }
      }
    };

    const handleGlobalClick = (e) => {
      setContextMenu(null);
      if (!e.shiftKey && !e.ctrlKey && !e.target.closest('.workspace-leaf')) {
        setSelectedTiles([]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('click', handleGlobalClick);
    
    let removeNativeDropListener = null;
    if (window.electronAPI?.onNativePopoutDropped) {
      // Pass a function, returns an unsubscription function if implemented, otherwise nothing
      // We can also just ignore unsubscription if it's not strictly necessary, but better to be safe.
      window.electronAPI.onNativePopoutDropped((data) => {
        const { tabId, x, y } = data;
        const el = document.elementFromPoint(x, y);
        if (el) {
          const leaf = el.closest('.workspace-leaf');
          if (leaf) {
             const nodeId = leaf.getAttribute('data-node-id');
             if (nodeId) {
               // We need a way to dock the tab. handleTabClick expects a click, but we can't easily trigger it.
               // We can dispatch a custom event and let the Workspace component handle it!
               window.dispatchEvent(new CustomEvent('ycs-native-dock', { detail: { targetId: nodeId, tabId } }));
             }
          }
        }
      });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  return (
    <WindowFrame>
      <div style={{ display: 'flex', width: '100%', height: '100%', boxSizing: 'border-box', backgroundColor: 'transparent' }}>
        
        {/* Left Toolbar / Tab Area */}
      <div 
        style={{ 
          width: `${sidebarWidth}px`, 
          minWidth: '180px',
          backgroundColor: 'var(--ycs-accent)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
          position: 'relative'
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          const isPopout = Array.from(e.dataTransfer.types).includes('ycs-popout');
          if (isPopout) return; // Already a popout, ignore
          
          e.preventDefault();
          const sourceNodeId = e.dataTransfer.getData('sourceNodeId');
          const tabId = e.dataTransfer.getData('tabId');
          if (tabId) {
            window.electronAPI?.openPopout(tabId);
            if (sourceNodeId) closeTab(sourceNodeId);
          }
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', width: '100%', padding: '0 8px 44px 8px', boxSizing: 'border-box', overflowY: 'auto', flex: 1 }}>
          {/* Assets Group */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className="ycs-tab"
              onClick={() => setIsAssetsOpen(!isAssetsOpen)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '12px', userSelect: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isAssetsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s ease-out' }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
              Assets
            </div>

            {isAssetsOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                <div
                  className={`ycs-tab ${workspaceTree.type !== 'split' && findTabId(workspaceTree, activeNodeId) === 'Textures' ? 'active' : ''}`}
                  onClick={() => handleTabClick('Textures')}
                  draggable
                  onDragStart={(e) => {
                    if (!e.ctrlKey) { e.preventDefault(); return; }
                    e.dataTransfer.setData('tabId', 'Textures');
                    e.dataTransfer.setData('ycs-tab', 'true');
                  }}
                  onDragEnd={(e) => {
                    if (e.dataTransfer.dropEffect === 'none') {
                      window.electronAPI?.openPopout('Textures');
                    }
                  }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '38px' }}
                >
                  <div style={{ width: '14px', flexShrink: 0 }} />
                  Textures
                </div>
              </div>
            )}
          </div>

          {/* Gameplay Group */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              className="ycs-tab"
              onClick={() => setIsGameplayOpen(!isGameplayOpen)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '12px', userSelect: 'none' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transform: isGameplayOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.1s ease-out' }}>
                <path d="M9 18l6-6-6-6"/>
              </svg>
              Gameplay
            </div>

            {isGameplayOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '2px' }}>
                <div
                  className={`ycs-tab ${workspaceTree.type !== 'split' && (findTabId(workspaceTree, activeNodeId) === 'Items' || findTabId(workspaceTree, activeNodeId) === 'Item') ? 'active' : ''}`}
                  onClick={() => handleTabClick('Items')}
                  draggable
                  onDragStart={(e) => {
                    if (!e.ctrlKey) { e.preventDefault(); return; }
                    e.dataTransfer.setData('tabId', 'Items');
                    e.dataTransfer.setData('ycs-tab', 'true');
                  }}
                  onDragEnd={(e) => {
                    if (e.dataTransfer.dropEffect === 'none') {
                      window.electronAPI?.openPopout('Items');
                    }
                  }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '38px' }}
                >
                  <div style={{ width: '14px', flexShrink: 0 }} />
                  Items
                </div>
                <div
                  className={`ycs-tab ${workspaceTree.type !== 'split' && findTabId(workspaceTree, activeNodeId) === 'Creative Tabs' ? 'active' : ''}`}
                  onClick={() => handleTabClick('Creative Tabs')}
                  draggable
                  onDragStart={(e) => {
                    if (!e.ctrlKey) { e.preventDefault(); return; }
                    e.dataTransfer.setData('tabId', 'Creative Tabs');
                    e.dataTransfer.setData('ycs-tab', 'true');
                  }}
                  onDragEnd={(e) => {
                    if (e.dataTransfer.dropEffect === 'none') {
                      window.electronAPI?.openPopout('Creative Tabs');
                    }
                  }}
                  style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', paddingLeft: '38px' }}
                >
                  <div style={{ width: '14px', flexShrink: 0 }} />
                  Creative Tabs
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      
      {/* Settings Button */}
      <button 
        className="ycs-button icon"
        onClick={() => window.electronAPI?.openPreferences()}
        title="Settings"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('tabId', 'Preferences');
          e.dataTransfer.setData('ycs-tab', 'true');
        }}
        onDragEnd={(e) => {
          if (e.dataTransfer.dropEffect === 'none') {
            window.electronAPI?.openPopout('Preferences');
          }
        }}
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          WebkitAppRegion: 'no-drag',
          zIndex: 100
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>

      {/* Clear Workspace Button (Next to Settings Icon) */}
      <button 
        className="ycs-button icon"
        onClick={resetWorkspace}
        title="Clear Workspace"
        style={{
          position: 'absolute',
          bottom: '8px',
          left: 'calc(8px + 36px)',
          WebkitAppRegion: 'no-drag',
          zIndex: 100
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
          <path d="M3 3v5h5"></path>
        </svg>
      </button>
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
          borderRight: 'var(--ycs-gap) solid var(--ycs-accent)',
          borderBottom: 'var(--ycs-gap) solid var(--ycs-accent)',
          backgroundClip: 'padding-box',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          <Workspace tree={workspaceTree} setTree={setWorkspaceTree} activeNodeId={activeNodeId} selectedTiles={selectedTiles} onTileSelect={handleTileSelect} />
        </div>

      </div>

      {/* Custom Context Menu */}
      {contextMenu && (
        <div style={{
          position: 'fixed',
          top: contextMenu.y,
          left: contextMenu.x,
          backgroundColor: 'var(--ycs-bg)',
          border: '1px solid var(--ycs-foreground)',
          borderRadius: 'var(--ycs-radius, 4px)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          zIndex: 1000,
          padding: '4px 0',
          minWidth: '150px',
          color: 'var(--ycs-text)',
          fontSize: '13px'
        }}>
          <div 
            onClick={() => {
              const targets = selectedTiles.includes(contextMenu.nodeId) ? selectedTiles : [contextMenu.nodeId];
              targets.forEach(id => {
                const tabId = findTabId(workspaceTree, id);
                if (tabId) window.electronAPI?.openPopout(tabId);
              });
              targets.forEach(id => closeTab(id));
            }}
            style={{ padding: '8px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ycs-highlight)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {selectedTiles.includes(contextMenu.nodeId) && selectedTiles.length > 1 ? 'Pop Selected Tiles' : 'Pop This Tile'}
          </div>
          <div 
            onClick={() => {
              const targets = selectedTiles.includes(contextMenu.nodeId) ? selectedTiles : [contextMenu.nodeId];
              targets.forEach(id => closeTab(id));
            }}
            style={{ padding: '8px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ycs-highlight)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {selectedTiles.includes(contextMenu.nodeId) && selectedTiles.length > 1 ? 'Close Selected Tiles' : 'Close This Tile'}
          </div>
          <div 
            onClick={() => {
              const keepIds = selectedTiles.includes(contextMenu.nodeId) ? selectedTiles : [contextMenu.nodeId];
              // Close all leaves NOT in keepIds
              const closeNonKept = (node) => {
                if (node.type === 'leaf' && !keepIds.includes(node.id)) {
                  closeTab(node.id);
                } else if (node.type === 'split') {
                  node.children.forEach(closeNonKept);
                }
              };
              // Need to pass the current tree, but state updates might queue, so we'll collect IDs first
              const toClose = [];
              const collectToClose = (node) => {
                 if (node.type === 'leaf' && !keepIds.includes(node.id)) toClose.push(node.id);
                 if (node.type === 'split') node.children.forEach(collectToClose);
              };
              collectToClose(workspaceTree);
              toClose.forEach(id => closeTab(id));
            }}
            style={{ padding: '8px 12px', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ycs-highlight)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            {selectedTiles.includes(contextMenu.nodeId) && selectedTiles.length > 1 ? 'Keep Selected & Clear Others' : 'Keep This & Clear Others'}
          </div>
          <div 
            onClick={() => resetWorkspace()}
            style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--ycs-red, #ff5555)' }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--ycs-highlight)'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Clear All Tiles
          </div>
        </div>
      )}
    </WindowFrame>
  );
}

export default App;
