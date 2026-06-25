import React, { useState, useRef, useEffect } from 'react';
import './Workspace.css';
import { DropdownField, StandardDropdownField } from '../Field/Field';
import PreferencesPage from '../PreferencesPage';

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

// Recursive Workspace Node component
const WorkspaceNode = ({ node, onDropTab, onResizeStart, mainNodeId }) => {
  const flexStyle = { flex: `${node.size || 1} 1 0%` };

  if (node.type === 'split') {
    return (
      <div className="workspace-split" style={{ ...flexStyle, display: 'flex', flexDirection: node.direction === 'horizontal' ? 'row' : 'column' }}>
        {node.children.map((child, index) => (
          <React.Fragment key={child.id}>
            <WorkspaceNode node={child} onDropTab={onDropTab} onResizeStart={onResizeStart} mainNodeId={mainNodeId} />
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
  return <WorkspaceLeaf node={node} onDropTab={onDropTab} flexStyle={flexStyle} mainNodeId={mainNodeId} />;
};

const WorkspaceLeaf = ({ node, onDropTab, flexStyle, mainNodeId }) => {
  const [hoverZone, setHoverZone] = useState(null);
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
    e.preventDefault();
    const zone = getDropZone(e);
    if (hoverZone !== zone) setHoverZone(zone);
  };

  const handleDragLeave = () => {
    setHoverZone(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setHoverZone(null);
    const tabId = e.dataTransfer.getData('tabId');
    const sourceNodeId = e.dataTransfer.getData('sourceNodeId');
    if (!tabId) return;
    const finalZone = !node.tabId ? 'center' : (hoverZone || 'center');
    onDropTab(node.id, tabId, finalZone, null, sourceNodeId);
  };

  return (
    <div 
      className="workspace-leaf" 
      data-node-id={node.id}
      ref={leafRef}
      style={flexStyle}
    >
      <div 
        className="workspace-leaf-inner"
        draggable={!!node.tabId}
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
      >
        <div className="workspace-leaf-content">
          {node.tabId === 'Tab 1' ? (
            <div className="tab-content-placeholder" style={{ padding: '20px', alignItems: 'flex-start' }}>
              {mainNodeId === node.id && (
                <div style={{ position: 'absolute', top: 5, right: 10, opacity: 0.5, fontSize: '12px' }}>(Main)</div>
              )}
              
              <h2 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '15px', color: 'var(--ycs-text)' }}>Inline Alignment Test</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
          ) : node.tabId ? (
            <div className="tab-content-placeholder" style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', boxSizing: 'border-box' }}>
              {mainNodeId === node.id && (
                <div style={{ position: 'absolute', top: 5, right: 10, opacity: 0.5, fontSize: '12px', zIndex: 10 }}>(Main)</div>
              )}
              
              {node.tabId === 'Preferences' ? (
                <PreferencesPage isTile={true} />
              ) : (
                <div style={{ padding: '20px' }}>{node.tabId}</div>
              )}
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

export default function Workspace({ tree, setTree, mainNodeId }) {
  const [globalHoverZone, setGlobalHoverZone] = useState(null);
  const resizingRef = useRef(null);

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

  const splitNode = (node, targetId, tabId, zone, insertIndex) => {
    if (node.type === 'split') {
      if (node.id === targetId && zone === 'divider') {
        const newNode = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'leaf',
          tabId: tabId
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
            size: splitSize
          };

          if (zone === 'left' || zone === 'top') {
            newChildren.splice(childIndex, 0, newNode);
          } else {
            newChildren.splice(childIndex + 1, 0, newNode);
          }
          return { ...node, children: newChildren };
        }
      }

      return { ...node, children: node.children.map(c => splitNode(c, targetId, tabId, zone, insertIndex)) };
    }

    if (node.id === targetId) {
      if (zone === 'center') {
        return { ...node, tabId };
      }
      
      const oldSize = node.size;
      const newNode = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'leaf',
        tabId: tabId
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

  const handleDropTab = (targetId, tabId, zone, insertIndex, sourceNodeId) => {
    if (sourceNodeId === targetId && zone === 'center') return; // Do nothing on self-center drop

    if (zone === 'center' && sourceNodeId) {
      // SWAP TABS
      setTree(prevTree => {
        let targetTabId = null;
        const findTarget = (n) => {
          if (n.id === targetId) targetTabId = n.tabId;
          if (n.type === 'split') n.children.forEach(findTarget);
        };
        findTarget(prevTree);

        const swap = (n) => {
          if (n.id === targetId) return { ...n, tabId };
          if (n.id === sourceNodeId) return { ...n, tabId: targetTabId };
          if (n.type === 'split') return { ...n, children: n.children.map(swap) };
          return n;
        };
        return swap(prevTree);
      });
      return;
    }

    setTree(prevTree => {
      const addedTree = splitNode(prevTree, targetId, tabId, zone, insertIndex);
      
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
      <WorkspaceNode node={tree} onDropTab={handleDropTab} onResizeStart={handleResizeStart} mainNodeId={mainNodeId} />
    </div>
  );
}
