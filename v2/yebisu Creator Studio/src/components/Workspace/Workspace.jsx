import React, { useState, useRef, useEffect } from 'react';
import './Workspace.css';
import { DropdownField, StandardDropdownField } from '../Field/Field';

import PreferencesPageNew from '../PreferencesPageNew';
import ItemPage from '../ItemPage';
import ItemPageNew, { ItemTexturePlaceholder, ItemTagsPlaceholder, ItemRecipePlaceholder, ItemMethodsPlaceholder, ItemModelJsonPlaceholder, DataComponentsPlaceholder } from '../ItemPageNew';

const Tab1Test = () => (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', overflow: 'auto' }}>
      <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px', color: 'var(--ycs-text)' }}>Inline Alignment Test</h2>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <input type="text" className="ycs-input inline" placeholder="Text input..." style={{ width: '120px' }} />
        <div style={{ width: '120px' }}>
          <StandardDropdownField 
            options={[{label: 'Dropdown 1', value: '1'}, {label: 'Dropdown 2', value: '2'}]} 
            value="1" 
            onChange={() => {}} 
          />
        </div>
        <div style={{ width: '140px' }}>
          <DropdownField 
            options={[{label: 'Dropdown 1', value: '1'}, {label: 'Dropdown 2', value: '2'}]} 
            value="1" 
            onChange={() => {}} 
          />
        </div>
      </div>
    </div>
  </div>
);

const Tab2Test = ({ nodeId, tree }) => {
  const [direction, setDirection] = useState('right');

  let child1Node = null;
  let child2Node = null;
  const checkOpen = (n) => {
    if (!n) return;
    if (n.type === 'leaf' && n.linkedParentId === nodeId) {
      if (n.tabId === 'Texture Selector') child1Node = n;
      if (n.tabId === 'Property Editor') child2Node = n;
    }
    if (n.type === 'split') n.children.forEach(checkOpen);
  };
  checkOpen(tree);

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h2 style={{ fontSize: '14px', color: 'var(--ycs-text)' }}>Parent/Child Tile Test</h2>
      <div style={{ width: '150px' }}>
        <StandardDropdownField 
          options={[
            {label: 'Split Right', value: 'right'},
            {label: 'Split Left', value: 'left'},
            {label: 'Split Bottom', value: 'bottom'},
            {label: 'Split Top', value: 'top'}
          ]} 
          value={direction} 
          onChange={setDirection} 
        />
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button 
          className="ycs-btn" 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
              detail: {
                parentId: nodeId,
                targetNodeId: child2Node ? child2Node.id : nodeId,
                childTabId: 'Texture Selector',
                direction: child2Node ? (direction === 'top' || direction === 'bottom' ? 'right' : 'bottom') : direction,
                isOpen: !child1Node
              }
            }));
          }}
          style={{ width: '150px' }}
        >
          {child1Node ? 'Close Texture' : 'Open Texture'}
        </button>
        <button 
          className="ycs-btn" 
          onClick={() => {
            window.dispatchEvent(new CustomEvent('ycs-toggle-child', {
              detail: {
                parentId: nodeId,
                targetNodeId: child1Node ? child1Node.id : nodeId,
                childTabId: 'Property Editor',
                direction: child1Node ? (direction === 'top' || direction === 'bottom' ? 'right' : 'bottom') : direction,
                isOpen: !child2Node
              }
            }));
          }}
          style={{ width: '150px' }}
        >
          {child2Node ? 'Close Properties' : 'Open Properties'}
        </button>
      </div>
    </div>
  );
};

const Tab3_3Test = ({ nodeId }) => {
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('ycs-replace-and-split', {
          detail: {
            nodeId,
            replaceTabId: 'Tab 3.3.1',
            splitTabId: 'Tab 3.3.2',
            direction: 'bottom'
          }
        }));
      }, 50);
    }
  }, [nodeId]);

  return null;
};

export const COMPONENT_REGISTRY = {
  'Preferences': PreferencesPageNew,
  'Tab 1': Tab1Test,
  'Tab 2': Tab2Test,
  'Tab 3.3': Tab3_3Test,
  'Item (Old)': ItemPage,
  'Item': ItemPageNew,
  'Item Texture': ItemTexturePlaceholder,
  'Item Tags': ItemTagsPlaceholder,
  'Item Recipe': ItemRecipePlaceholder,
  'Item Methods': ItemMethodsPlaceholder,
  'Item Model JSON': ItemModelJsonPlaceholder,
  'Data Components': DataComponentsPlaceholder,
};

export const resolveComponent = (tabId) => {
  if (COMPONENT_REGISTRY[tabId]) return COMPONENT_REGISTRY[tabId];
  const prefix = tabId.split('::')[0];
  if (prefix !== tabId && COMPONENT_REGISTRY[prefix]) return COMPONENT_REGISTRY[prefix];
  return null;
};

const renderTabContent = (tabId, onClose, nodeId, tree) => {
  const Component = resolveComponent(tabId);
  if (Component) {
    return <Component isTile={true} onClose={onClose} nodeId={nodeId} tree={tree} tabId={tabId} />;
  }
  return <div style={{ padding: '20px' }}>{tabId}</div>;
};

const WorkspaceDivider = ({ parentId, index, onDropTab, direction, onResizeStart }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isRow = direction === 'horizontal';

  const handleDragOver = (e) => {
    if (!Array.from(e.dataTransfer.types).includes('ycs-tab')) return;
    e.preventDefault();
    setIsHovered(true);
  };

  const handleDragLeave = () => {
    setIsHovered(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsHovered(false);
    const tabId = e.dataTransfer.getData('tabId');
    const sourceNodeId = e.dataTransfer.getData('sourceNodeId');
    if (!tabId) return;
    onDropTab(parentId, tabId, 'divider', index, sourceNodeId);
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    // Go up twice: e.currentTarget -> .workspace-divider-container -> .workspace-split
    const splitContainer = e.currentTarget.parentElement.parentElement;
    const parentRect = splitContainer.getBoundingClientRect();
    onResizeStart({
      parentId,
      index,
      direction,
      startPos: isRow ? e.clientX : e.clientY,
      parentSize: isRow ? parentRect.width : parentRect.height
    });
  };

  return (
    <div 
      className="workspace-divider-container"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: isRow ? 'var(--ycs-gap)' : '100%',
        height: isRow ? '100%' : 'var(--ycs-gap)',
        flexShrink: 0
      }}
    >
      <div className={`workspace-divider ${isHovered ? 'divider-hover' : ''}`} />
      <div
        style={{
          position: 'absolute',
          width: isRow ? '30px' : '100%',
          height: isRow ? '100%' : '30px',
          zIndex: 50,
          cursor: isRow ? 'col-resize' : 'row-resize'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

const WorkspaceNode = ({ node, onDropTab, onResizeStart, activeNodeId, onCloseTab, selectedTiles, onTileSelect, tree }) => {
  const flexStyle = { flex: `${node.size || 1} 1 0%` };

  if (node.type === 'split') {
    return (
      <div className="workspace-split" style={{ ...flexStyle, display: 'flex', flexDirection: node.direction === 'horizontal' ? 'row' : 'column' }}>
        {node.children.map((child, index) => (
          <React.Fragment key={child.id}>
            <WorkspaceNode node={child} onDropTab={onDropTab} onResizeStart={onResizeStart} activeNodeId={activeNodeId} onCloseTab={onCloseTab} selectedTiles={selectedTiles} onTileSelect={onTileSelect} tree={tree} />
            {index < node.children.length - 1 && (
              <WorkspaceDivider 
                parentId={node.id} 
                index={index + 1} 
                onDropTab={onDropTab} 
                direction={node.direction} 
                onResizeStart={onResizeStart}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Leaf Node
  return <WorkspaceLeaf node={node} onDropTab={onDropTab} flexStyle={flexStyle} activeNodeId={activeNodeId} onCloseTab={onCloseTab} selectedTiles={selectedTiles} onTileSelect={onTileSelect} tree={tree} />;
};

const WorkspaceLeaf = ({ node, onDropTab, flexStyle, activeNodeId, onCloseTab, selectedTiles, onTileSelect, tree }) => {
  const [hoverZone, setHoverZone] = useState(null);
  const [isDraggable, setIsDraggable] = useState(false);
  const leafRef = useRef(null);
  const [motd, setMotd] = useState(localStorage.getItem('ycs-motd') || 'hello world');

  useEffect(() => {
    const handleMotdChange = () => setMotd(localStorage.getItem('ycs-motd') || 'hello world');
    window.addEventListener('ycs-motd-changed', handleMotdChange);
    return () => window.removeEventListener('ycs-motd-changed', handleMotdChange);
  }, []);

  const getDropZone = (e) => {
    const rect = leafRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Dynamically scale snap area up to 150px, but never more than 1/3rd of the window width/height
    const edgeThresholdX = Math.min(150, rect.width / 3);
    const edgeThresholdY = Math.min(150, rect.height / 3);
    
    if (x < edgeThresholdX) return 'left';
    if (x > rect.width - edgeThresholdX) return 'right';
    if (y < edgeThresholdY) return 'top';
    if (y > rect.height - edgeThresholdY) return 'bottom';
    
    return 'center';
  };

  const handleDragOver = (e) => {
    if (!Array.from(e.dataTransfer.types).includes('ycs-tab')) return;
    
    // If it's a popout window dragging over us, only highlight/allow drop if Ctrl is pressed!
    if (Array.from(e.dataTransfer.types).includes('ycs-popout') && !e.ctrlKey) {
      setHoverZone(null);
      return;
    }

    e.preventDefault();
    const zone = getDropZone(e);
    if (hoverZone !== zone) setHoverZone(zone);
  };

  const handleDragLeave = () => {
    setHoverZone(null);
  };

  const handleDrop = (e) => {
    const isPopout = Array.from(e.dataTransfer.types).includes('ycs-popout');
    if (isPopout && !e.ctrlKey) {
        return;
    }
    e.preventDefault();
    setHoverZone(null);
    setIsDraggable(false);
    const tabId = e.dataTransfer.getData('tabId');
    const sourceNodeId = e.dataTransfer.getData('sourceNodeId');
    if (!tabId) return;
    const finalZone = !node.tabId ? 'center' : (hoverZone || 'center');
    
    // SWAP LOGIC FOR POPOUTS & SETTINGS TABS
    // If we are dropping into the center, and there's no sourceNodeId, it would normally overwrite the tile.
    // To prevent "eating" the old tile, we "swap" it by popping the old tile out!
    if (finalZone === 'center' && node.tabId && !sourceNodeId) {
      if (window.electronAPI?.openPopout) {
        window.electronAPI.openPopout(node.tabId);
      }
    }

    onDropTab(node.id, tabId, finalZone, null, sourceNodeId);
    
    if (isPopout) {
        window.electronAPI?.broadcastDockSuccess(tabId);
    }
  };

  return (
    <div 
      className="workspace-leaf" 
      data-node-id={node.id}
      ref={leafRef}
      style={flexStyle}
    >
      <div 
        className={`workspace-leaf-inner ${selectedTiles?.includes(node.id) ? 'selected-leaf' : ''}`}
        onMouseDown={(e) => {
          if (onTileSelect) onTileSelect(node.id, e);
          if (e.ctrlKey && node.tabId) setIsDraggable(true);
        }}
        onMouseEnter={(e) => {
          if (onTileSelect) onTileSelect(node.id, e);
        }}
        onMouseUp={() => setIsDraggable(false)}
        onMouseLeave={() => setIsDraggable(false)}
        draggable={isDraggable}
        onDragStart={(e) => {
          if (!e.ctrlKey) {
            e.preventDefault();
            return;
          }
          if (node.tabId) {
            e.dataTransfer.setData('sourceNodeId', node.id);
            e.dataTransfer.setData('tabId', node.tabId);
            e.dataTransfer.setData('ycs-tab', 'true');
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={(e) => {
          setIsDraggable(false);
          if (e.dataTransfer.dropEffect === 'none' && node.tabId) {
            window.electronAPI?.openPopout(node.tabId);
            if (onCloseTab) onCloseTab(node.id);
          }
        }}
      >
        <div className="workspace-leaf-content">
          {node.tabId ? (
            <div className="tab-content-placeholder" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxSizing: 'border-box', minWidth: 0, minHeight: 0 }}>
              {renderTabContent(node.tabId, onCloseTab ? () => onCloseTab(node.id) : null, node.id, tree)}
            </div>
          ) : (
            <span style={{ opacity: 0.3, userSelect: 'none' }}>{motd}</span>
          )}
        </div>

        {hoverZone && (
          <div className={`drop-overlay drop-${hoverZone}`} />
        )}
      </div>
    </div>
  );
};


const findNode = (node, id) => {
  if (node.id === id) return node;
  if (node.type === 'split') {
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
};

export default function Workspace({ tree, setTree, activeNodeId, selectedTiles, onTileSelect }) {
  const [globalHoverZone, setGlobalHoverZone] = useState(null);
  const resizingRef = useRef(null);

  const handleCloseTab = (nodeId) => {
    setTree(prevTree => {
      const removeNode = (n, tId) => {
        if (n.id === tId) return null;
        if (n.type === 'split') {
          const newC = n.children.map(c => removeNode(c, tId)).filter(Boolean);
          if (newC.length === 0) return null;
          if (newC.length === 1) return { ...newC[0], size: n.size };
          return { ...n, children: newC };
        }
        return n;
      };
      const finalTree = removeNode(prevTree, nodeId);
      return finalTree || { id: 'root', type: 'leaf', tabId: null };
    });
  };

  const handleResizeStart = (data) => {
    const parentNode = findNode(tree, data.parentId);
    if (!parentNode) return;

    const children = parentNode.children;
    const hasSizes = children.every(c => c.size !== undefined);
    
    const getInitialSize = (child) => hasSizes ? child.size : (100 / children.length);
    const totalSize = hasSizes ? children.reduce((sum, c) => sum + c.size, 0) : 100;

    resizingRef.current = {
      ...data,
      initialPrevSize: getInitialSize(children[data.index - 1]),
      initialNextSize: getInitialSize(children[data.index]),
      currentTotalSize: totalSize,
      hasSizes: hasSizes
    };
    
    document.body.style.cursor = data.direction === 'horizontal' ? 'col-resize' : 'row-resize';
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!resizingRef.current) return;
      const resizing = resizingRef.current;
      const isRow = resizing.direction === 'horizontal';
      const currentPos = isRow ? e.clientX : e.clientY;
      const delta = currentPos - resizing.startPos;
      
      if (delta === 0 && resizing.hasSizes) return;

      const getMinPx = (n, dir) => {
        if (n.type === 'leaf') return dir === 'horizontal' ? 200 : 150;
        if (n.type === 'split') {
          const gap = parseInt(localStorage.getItem('ycs-gap') || '8', 10);
          if (n.direction === dir) {
            const sizes = n.children.map(c => getMinPx(c, dir));
            return sizes.reduce((sum, s) => sum + s, 0) + gap * (sizes.length - 1);
          } else {
            const sizes = n.children.map(c => getMinPx(c, dir));
            return Math.max(...sizes);
          }
        }
        return dir === 'horizontal' ? 200 : 150;
      };

      setTree(prevTree => {
        const updateSizes = (node) => {
          if (node.id === resizing.parentId && node.type === 'split') {
            let newChildren = [...node.children];
            
            if (!resizing.hasSizes) {
              const defaultSize = 100 / newChildren.length;
              newChildren = newChildren.map(c => ({ ...c, size: defaultSize }));
            }

            const deltaSize = (delta / resizing.parentSize) * resizing.currentTotalSize;

            const newPrevSize = resizing.initialPrevSize + deltaSize;
            const newNextSize = resizing.initialNextSize - deltaSize;

            const prevMinPx = getMinPx(newChildren[resizing.index - 1], resizing.direction);
            const nextMinPx = getMinPx(newChildren[resizing.index], resizing.direction);
            
            const prevMinSize = (prevMinPx / resizing.parentSize) * resizing.currentTotalSize;
            const nextMinSize = (nextMinPx / resizing.parentSize) * resizing.currentTotalSize;

            if (newPrevSize > prevMinSize && newNextSize > nextMinSize) {
               newChildren[resizing.index - 1] = { ...newChildren[resizing.index - 1], size: newPrevSize };
               newChildren[resizing.index] = { ...newChildren[resizing.index], size: newNextSize };
            } else {
               if (newNextSize <= nextMinSize) {
                  newChildren[resizing.index] = { ...newChildren[resizing.index], size: nextMinSize };
                  newChildren[resizing.index - 1] = { ...newChildren[resizing.index - 1], size: resizing.initialPrevSize + resizing.initialNextSize - nextMinSize };
               } else if (newPrevSize <= prevMinSize) {
                  newChildren[resizing.index - 1] = { ...newChildren[resizing.index - 1], size: prevMinSize };
                  newChildren[resizing.index] = { ...newChildren[resizing.index], size: resizing.initialNextSize + resizing.initialPrevSize - prevMinSize };
               }
            }
            return { ...node, children: newChildren };
          }
          if (node.type === 'split') {
            return { ...node, children: node.children.map(updateSizes) };
          }
          return node;
        };
        return updateSizes(prevTree);
      });
    };

    const handleMouseUp = () => {
      if (resizingRef.current) {
        document.body.style.cursor = 'default';
        resizingRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [setTree]);

  const splitNode = (node, targetId, tabId, zone, insertIndex, linkedParentId) => {
    if (node.type === 'split') {
      if (node.id === targetId && zone === 'divider') {
        const newNode = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'leaf',
          tabId: tabId,
          linkedParentId: linkedParentId
        };
        const newChildren = [...node.children];
        
        // Ensure new node inherits proportional size
        const existingSizes = newChildren.map(c => c.size).filter(s => s !== undefined);
        if (existingSizes.length > 0) {
           newNode.size = existingSizes.reduce((a, b) => a + b, 0) / existingSizes.length;
        }

        newChildren.splice(insertIndex, 0, newNode);
        return { ...node, children: newChildren };
      }

      const childIndex = node.children.findIndex(c => c.id === targetId);
      if (childIndex !== -1 && (zone === 'left' || zone === 'right' || zone === 'top' || zone === 'bottom')) {
        const isHorizontal = zone === 'left' || zone === 'right';
        const isVertical = zone === 'top' || zone === 'bottom';
        if ((node.direction === 'horizontal' && isHorizontal) || (node.direction === 'vertical' && isVertical)) {
          let newChildren = [...node.children];
          
          // Force all children to have explicit flex proportions
          const totalExisting = newChildren.length;
          newChildren = newChildren.map(c => ({
            ...c,
            size: c.size !== undefined ? c.size : (100 / totalExisting)
          }));

          const targetChild = newChildren[childIndex];
          const splitSize = targetChild.size / 2;
          
          targetChild.size = splitSize;
          
          const newNode = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'leaf',
            tabId: tabId,
            size: splitSize,
            linkedParentId: linkedParentId
          };

          if (zone === 'left' || zone === 'top') {
            newChildren.splice(childIndex, 0, newNode);
          } else {
            newChildren.splice(childIndex + 1, 0, newNode);
          }
          return { ...node, children: newChildren };
        }
      }

      return { ...node, children: node.children.map(c => splitNode(c, targetId, tabId, zone, insertIndex, linkedParentId)) };
    }

    if (node.id === targetId) {
      if (zone === 'center') {
        return { ...node, tabId };
      }
      
      const oldSize = node.size;
      const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'leaf',
        tabId: tabId,
        linkedParentId: linkedParentId
      };
      
      // Keep the original node's ID so it retains "Main" status
      const oldNode = { ...node };
      delete oldNode.size; // Reset so they perfectly split 50/50 inside the new split

      const newSplitId = Math.random().toString(36).substr(2, 9);

      if (zone === 'left') return { id: newSplitId, type: 'split', direction: 'horizontal', size: oldSize, children: [newNode, oldNode] };
      if (zone === 'right') return { id: newSplitId, type: 'split', direction: 'horizontal', size: oldSize, children: [oldNode, newNode] };
      if (zone === 'top') return { id: newSplitId, type: 'split', direction: 'vertical', size: oldSize, children: [newNode, oldNode] };
      if (zone === 'bottom') return { id: newSplitId, type: 'split', direction: 'vertical', size: oldSize, children: [oldNode, newNode] };
    }

    return node;
  };

  useEffect(() => {
    const handleToggleChild = (e) => {
      const { parentId, childTabId, direction, isOpen } = e.detail;
      setTree(prevTree => {
        if (isOpen) {
          let isAlreadyOpen = false;
          const checkOpen = (n) => {
            if (n.type === 'leaf' && n.linkedParentId === parentId && n.tabId === childTabId) isAlreadyOpen = true;
            if (n.type === 'split') n.children.forEach(checkOpen);
          };
          checkOpen(prevTree);
          if (!isAlreadyOpen) {
            const splitTargetId = e.detail.targetNodeId || parentId;

            // Find existing sibling children of the same parent on the same side
            // If found, stack the new child alongside them in the perpendicular direction
            let existingSiblingId = null;
            const findSibling = (n) => {
              if (n.type === 'leaf' && n.linkedParentId === parentId && !existingSiblingId) {
                existingSiblingId = n.id;
              }
              if (n.type === 'split') n.children.forEach(findSibling);
            };
            findSibling(prevTree);

            if (existingSiblingId) {
              // Stack perpendicular: right/left children stack top-to-bottom, top/bottom children stack left-to-right
              const stackDirection = (direction === 'right' || direction === 'left') ? 'bottom' : 'right';
              return splitNode(prevTree, existingSiblingId, childTabId, stackDirection, null, parentId);
            }

            return splitNode(prevTree, splitTargetId, childTabId, direction, null, parentId);
          }
          return prevTree;
        } else {
          let childNodeId = null;
          const checkOpen = (n) => {
            if (n.type === 'leaf' && n.linkedParentId === parentId && n.tabId === childTabId) childNodeId = n.id;
            if (n.type === 'split') n.children.forEach(checkOpen);
          };
          checkOpen(prevTree);
          if (childNodeId) {
             setTimeout(() => {
                window.dispatchEvent(new CustomEvent('ycs-close-tab-recursive', { detail: { targetId: childNodeId } }));
             }, 0);
          }
          return prevTree;
        }
      });
    };
    window.addEventListener('ycs-toggle-child', handleToggleChild);
    return () => window.removeEventListener('ycs-toggle-child', handleToggleChild);
  }, [setTree]);

  useEffect(() => {
    const handleReplaceAndSplit = (e) => {
      const { nodeId, replaceTabId, splitTabId, direction } = e.detail;
      setTree(prevTree => {
        const replaceNode = (n) => {
          if (n.id === nodeId) return { ...n, tabId: replaceTabId };
          if (n.type === 'split') return { ...n, children: n.children.map(replaceNode) };
          return n;
        };
        const treeAfterReplace = replaceNode(prevTree);
        return splitNode(treeAfterReplace, nodeId, splitTabId, direction, null, nodeId);
      });
    };
    window.addEventListener('ycs-replace-and-split', handleReplaceAndSplit);
    return () => window.removeEventListener('ycs-replace-and-split', handleReplaceAndSplit);
  }, [setTree]);

  useEffect(() => {
    const handleNativeDock = (e) => {
      const { targetId, tabId } = e.detail;
      handleDropTab(targetId, tabId, 'center', null, null);
      window.electronAPI?.broadcastDockSuccess(tabId);
    };
    window.addEventListener('ycs-native-dock', handleNativeDock);
    return () => window.removeEventListener('ycs-native-dock', handleNativeDock);
  }, []);

  const handleDropTab = (targetId, tabId, zone, insertIndex, sourceNodeId, linkedParentId) => {
    if (sourceNodeId === targetId) {
      if (zone === 'center') return; // Do nothing on self-center drop
      // If dragging a tile into its own split zone, do nothing to prevent duplication/deletion bugs
      if (zone === 'left' || zone === 'right' || zone === 'top' || zone === 'bottom') return;
    }

    if (zone === 'center' && sourceNodeId) {
      // SWAP TABS — clear linkedParentId on both since user explicitly moved them
      setTree(prevTree => {
        let targetTabId = null;
        const findTarget = (n) => {
          if (n.id === targetId) targetTabId = n.tabId;
          if (n.type === 'split') n.children.forEach(findTarget);
        };
        findTarget(prevTree);

        const swap = (n) => {
          if (n.id === targetId) return { ...n, tabId, linkedParentId: undefined };
          if (n.id === sourceNodeId) return { ...n, tabId: targetTabId, linkedParentId: undefined };
          if (n.type === 'split') return { ...n, children: n.children.map(swap) };
          return n;
        };
        return swap(prevTree);
      });
      return;
    }

    setTree(prevTree => {
      const addedTree = splitNode(prevTree, targetId, tabId, zone, insertIndex, linkedParentId);
      
      // If moved from another tile to create a new split, remove the old tile
      if (sourceNodeId && zone !== 'center' && sourceNodeId !== targetId) {
         const removeNode = (n, tId) => {
           if (n.id === tId) return null;
           if (n.type === 'split') {
             const newC = n.children.map(c => removeNode(c, tId)).filter(Boolean);
             if (newC.length === 0) return null;
             if (newC.length === 1) return { ...newC[0], size: n.size };
             return { ...n, children: newC };
           }
           return n;
         };
         const finalTree = removeNode(addedTree, sourceNodeId);
         return finalTree || { id: 'root', type: 'leaf', tabId: null };
      }

      return addedTree;
    });
  };

  const handleGlobalDragOver = (e, zone) => {
    if (!Array.from(e.dataTransfer.types).includes('ycs-tab')) return;
    e.preventDefault();
    e.stopPropagation();
    if (globalHoverZone !== zone) {
      setGlobalHoverZone(zone);
    }
  };

  const handleGlobalDragLeave = () => {
    setGlobalHoverZone(null);
  };

  const handleGlobalDrop = (e, zone) => {
    e.preventDefault();
    e.stopPropagation();
    setGlobalHoverZone(null);
    const tabId = e.dataTransfer.getData('tabId');
    const sourceNodeId = e.dataTransfer.getData('sourceNodeId');
    if (!tabId) return;

    setTree(prevTree => {
      const newNode = { id: Math.random().toString(36).substr(2, 9), type: 'leaf', tabId };
      let addedTree;

      if ((zone === 'left' || zone === 'right') && prevTree.type === 'split' && prevTree.direction === 'horizontal') {
        const newChildren = [...prevTree.children];
        const existingSizes = newChildren.map(c => c.size).filter(s => s !== undefined);
        if (existingSizes.length > 0) newNode.size = existingSizes.reduce((a, b) => a + b, 0) / existingSizes.length;

        if (zone === 'left') newChildren.unshift(newNode);
        if (zone === 'right') newChildren.push(newNode);
        addedTree = { ...prevTree, children: newChildren };
      }
      else if ((zone === 'top' || zone === 'bottom') && prevTree.type === 'split' && prevTree.direction === 'vertical') {
        const newChildren = [...prevTree.children];
        const existingSizes = newChildren.map(c => c.size).filter(s => s !== undefined);
        if (existingSizes.length > 0) newNode.size = existingSizes.reduce((a, b) => a + b, 0) / existingSizes.length;

        if (zone === 'top') newChildren.unshift(newNode);
        if (zone === 'bottom') newChildren.push(newNode);
        addedTree = { ...prevTree, children: newChildren };
      }
      else {
        // Keep the original tree's ID to preserve Main status, give the new split a random ID
        const oldTree = { ...prevTree };
        const newSplitId = Math.random().toString(36).substr(2, 9);
        
        if (zone === 'left') addedTree = { id: newSplitId, type: 'split', direction: 'horizontal', children: [newNode, oldTree] };
        else if (zone === 'right') addedTree = { id: newSplitId, type: 'split', direction: 'horizontal', children: [oldTree, newNode] };
        else if (zone === 'top') addedTree = { id: newSplitId, type: 'split', direction: 'vertical', children: [newNode, oldTree] };
        else if (zone === 'bottom') addedTree = { id: newSplitId, type: 'split', direction: 'vertical', children: [oldTree, newNode] };
      }

      if (sourceNodeId) {
         const removeNode = (n, tId) => {
           if (n.id === tId) return null;
           if (n.type === 'split') {
             const newC = n.children.map(c => removeNode(c, tId)).filter(Boolean);
             if (newC.length === 0) return null;
             if (newC.length === 1) return { ...newC[0], size: n.size };
             return { ...n, children: newC };
           }
           return n;
         };
         const finalTree = removeNode(addedTree, sourceNodeId);
         return finalTree || { id: 'root', type: 'leaf', tabId: null };
      }

      return addedTree;
    });
  };

  const renderGlobalDropZone = (zone) => {
    const isRow = zone === 'left' || zone === 'right';
    const style = {
      position: 'absolute',
      zIndex: 200,
    };
    
    if (isRow) {
      style.top = 0;
      style.bottom = 0;
      style.width = '15px';
      if (zone === 'left') style.left = 0;
      if (zone === 'right') style.right = 0;
    } else {
      style.left = 0;
      style.right = 0;
      style.height = '15px';
      if (zone === 'top') style.top = 0;
      if (zone === 'bottom') style.bottom = 0;
    }

    return (
      <div 
        style={style}
        onDragOver={(e) => handleGlobalDragOver(e, zone)}
        onDragLeave={handleGlobalDragLeave}
        onDrop={(e) => handleGlobalDrop(e, zone)}
      >
        {globalHoverZone === zone && (
          <div 
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'var(--ycs-highlight)',
              opacity: 0.4,
              pointerEvents: 'none'
            }} 
          />
        )}
      </div>
    );
  };

  return (
    <div className="workspace-container">
      {renderGlobalDropZone('top')}
      {renderGlobalDropZone('bottom')}
      {renderGlobalDropZone('left')}
      {renderGlobalDropZone('right')}
      <WorkspaceNode node={tree} onDropTab={handleDropTab} onResizeStart={handleResizeStart} activeNodeId={activeNodeId} onCloseTab={handleCloseTab} selectedTiles={selectedTiles} onTileSelect={onTileSelect} tree={tree} />
    </div>
  );
}
