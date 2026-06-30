import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import RecipeEditor from './RecipeEditor';

const TYPE_LABELS = {
  shaped: 'Shaped',
  shapeless: 'Shapeless',
  smelting: 'Smelting',
  blasting: 'Blasting',
  smoking: 'Smoking',
  campfire_cooking: 'Campfire',
  stonecutting: 'Stonecutting',
};

export default function RecipesLanding() {
  const [recipes, setRecipes] = useState([]);
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(async () => {
    try {
      const ids = await invoke('list_ycs_data', { category: 'recipes' });
      const loaded = [];
      for (const id of ids) {
        try {
          const raw = await invoke('load_ycs_data', { category: 'recipes', id });
          loaded.push(JSON.parse(raw));
        } catch {}
      }
      setRecipes(loaded);
    } catch {
      setRecipes([]);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const deleteRecipe = async (recipe, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete recipe "${recipe.id}"?`)) return;
    const injections = Array.isArray(recipe._injections) ? recipe._injections : [];
    try {
      for (const inj of injections) {
        try {
          if (inj.type === 'created-file') {
            await invoke('delete_mod_file', { file: inj.file });
          }
        } catch {}
      }
      await invoke('delete_ycs_data', { category: 'recipes', id: recipe.id });
      await reload();
    } catch (err) {
      console.error('Failed to delete recipe:', err);
    }
  };

  if (creating) {
    return <RecipeEditor onBack={() => { setCreating(false); reload(); }} />;
  }

  if (editing) {
    return <RecipeEditor recipeId={editing} onBack={() => { setEditing(null); reload(); }} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '12px 16px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>Recipes</h2>
        <button className="ycs-button icon" onClick={() => setCreating(true)} title="New Recipe">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--ycs-foreground)', width: '100%', flexShrink: 0 }} />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {recipes.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {recipes.map(recipe => (
              <div
                key={recipe.id}
                onClick={() => setEditing(recipe.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '6px 8px',
                  borderRadius: 'var(--ycs-radius, 4px)',
                  border: '1px solid var(--ycs-foreground)',
                  cursor: 'pointer',
                  transition: 'background-color 0.1s, border-color 0.1s',
                  boxSizing: 'border-box',
                  minWidth: '160px', flex: '1 1 160px', maxWidth: '320px',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.backgroundColor = 'var(--ycs-accent)';
                  e.currentTarget.style.borderColor = 'var(--ycs-highlight)';
                  const del = e.currentTarget.querySelector('.row-delete');
                  if (del) del.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.borderColor = 'var(--ycs-foreground)';
                  const del = e.currentTarget.querySelector('.row-delete');
                  if (del) del.style.opacity = '0';
                }}
              >
                <div style={{
                  width: '6px', height: '24px', flexShrink: 0, borderRadius: '3px',
                  backgroundColor: 'var(--ycs-highlight)', opacity: 0.6,
                }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {recipe.id}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.4 }}>
                    {TYPE_LABELS[recipe.recipeType] || recipe.recipeType}
                    {recipe.result ? ` → ${recipe.result}` : ''}
                  </div>
                </div>
                <div
                  className="row-delete"
                  onClick={(e) => deleteRecipe(recipe, e)}
                  title="Delete"
                  style={{ width: 18, height: 18, cursor: 'pointer', opacity: 0, transition: 'opacity 0.1s', flexShrink: 0 }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18">
                    <circle cx="9" cy="9" r="9" fill="white" />
                    <line x1="5" y1="9" x2="13" y2="9" stroke="black" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )}
        {recipes.length === 0 && (
          <div style={{ opacity: 0.3, fontSize: '13px', padding: '8px 0' }}>No recipes yet. Click + to add one.</div>
        )}
      </div>
    </div>
  );
}
