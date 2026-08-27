export const initializeFolderPage = ({
  host,
  createTab,
  setActiveTab,
  removeTab,
  createObject,
}) => {
  let nextFolderPageNumber = 1;
  const folderRecords = new WeakMap();

  const ensureFolderRecord = folderShell => {
    const existing = folderRecords.get(folderShell);
    if (existing) return existing;

    const number = nextFolderPageNumber;
    nextFolderPageNumber += 1;
    const panel = document.createElement('section');
    panel.id = `folder-workspace-${number}`;
    panel.className = 'workspace-item-editor workspace-folder-page';
    panel.hidden = true;

    const topControls = document.createElement('div');
    topControls.className = 'workspace-top-controls';
    topControls.setAttribute('aria-label', 'Folder top controls');
    topControls.innerHTML = `
      <div class="workspace-top-controls-left">
        <input class="pixel-text-box workspace-top-text-box workspace-search-input" type="text" aria-label="Search folder" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" />
        <button class="pixel-button workspace-top-control-button workspace-search-button" type="button" aria-label="Search">
          <img class="workspace-search-icon" src="./assets/sprite/home/home_icon.png" alt="" draggable="false" />
        </button>
      </div>
      <div class="workspace-create-dropdown">
        <button class="pixel-button workspace-top-control-button folder-create-button" type="button" aria-haspopup="menu" aria-expanded="false" aria-label="Create">+</button>
        <div class="preferences-scale-options pixel-option-stack workspace-create-options" role="menu" hidden>
          <button class="pixel-option workspace-create-option" type="button" role="menuitem" data-workspace-create-option="Item" data-workspace-create-mode="home">Item</button>
          <div class="workspace-create-divider-row" role="separator" data-workspace-create-mode="home">
            <div class="pixel-divider pixel-divider-horizontal workspace-create-divider" aria-hidden="true"></div>
          </div>
          <button class="pixel-option workspace-create-option" type="button" role="menuitem" data-workspace-create-option="Folder" data-workspace-create-mode="home">Folder</button>
          <button class="pixel-option workspace-create-option" type="button" role="menuitem" data-workspace-create-option="Test" data-workspace-create-mode="home">Test</button>
        </div>
      </div>
    `;

    const searchInput = topControls.querySelector('.workspace-search-input');
    const searchButton = topControls.querySelector('.workspace-search-button');
    const createButton = topControls.querySelector('.folder-create-button');
    const createOptions = topControls.querySelector('.workspace-create-options');

    const syncGrid = () => {
      const query = searchInput.value.trim().toLocaleLowerCase();
      for (const shell of grid.querySelectorAll('.workspace-object-shell')) {
        const label = shell.querySelector('.workspace-object-label')?.textContent || '';
        const objectButton = shell.querySelector('.workspace-object');
        const matchesQuery = !query
          || label.toLocaleLowerCase().includes(query)
          || objectButton?.getAttribute('aria-label')?.toLocaleLowerCase().includes(query);
        shell.hidden = !matchesQuery;
      }
    };
    searchInput.addEventListener('input', syncGrid);
    searchButton.addEventListener('click', syncGrid);

    createButton.addEventListener('click', event => {
      event.stopPropagation();
      createOptions.hidden = !createOptions.hidden;
      createButton.setAttribute('aria-expanded', String(!createOptions.hidden));
    });

    document.addEventListener('click', event => {
      if (!createOptions.hidden && !event.target.closest('.workspace-create-dropdown')) {
        createOptions.hidden = true;
        createButton.setAttribute('aria-expanded', 'false');
      }
    });

    for (const option of createOptions.querySelectorAll('.workspace-create-option')) {
      option.addEventListener('click', () => {
        const type = option.dataset.workspaceCreateOption;
        createObject(type, 'home', grid);
        createOptions.hidden = true;
        createButton.setAttribute('aria-expanded', 'false');
      });
    }

    panel.append(topControls);

    const innerContainer = document.createElement('section');
    innerContainer.className = 'workspace-inner-container';

    const grid = document.createElement('div');
    grid.className = 'workspace-object-grid workspace-folder-grid';
    grid.workspaceFolderOwner = folderShell;

    innerContainer.append(grid);
    panel.append(innerContainer);

    const record = { number, panel, grid, tab: null };
    folderRecords.set(folderShell, record);
    return record;
  };

  const getFolderContentHost = folderShell => ensureFolderRecord(folderShell).grid;

  const openFolder = folderShell => {
    const record = ensureFolderRecord(folderShell);
    const labelText = folderShell?.querySelector('.workspace-object-label')?.textContent.trim()
      || folderShell?.querySelector('.folder-object')?.getAttribute('aria-label')
      || `Folder ${record.number}`;

    if (!record.panel.isConnected) host.append(record.panel);
    if (!record.tab?.isConnected) {
      const created = createTab({
        id: `folder-workspace-tab-${record.number}`,
        labelText,
        panelId: record.panel.id,
      });
      record.tab = created.tab;
      record.panel.setAttribute('aria-labelledby', record.tab.id);
    } else {
      setActiveTab(record.tab);
      record.tab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    return record;
  };

  const renameFolder = (folderShell, newName) => {
    const record = folderRecords.get(folderShell);
    if (!record) return;
    if (record.tab?.isConnected) {
      const tabLabel = record.tab.querySelector('.workspace-tab-label');
      if (tabLabel) tabLabel.textContent = newName;
    }
  };

  const removeFolder = folderShell => {
    const record = folderRecords.get(folderShell);
    if (!record) return;
    if (record.tab?.isConnected) removeTab(record.tab);
    else record.panel.remove();
    folderRecords.delete(folderShell);
  };

  return { getFolderContentHost, openFolder, renameFolder, removeFolder };
};
