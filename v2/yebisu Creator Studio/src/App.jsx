import React, { useEffect } from 'react';
import WindowFrame from './components/WindowFrame/WindowFrame';
import PreferencesPage from './components/PreferencesPage';

function App() {
  useEffect(() => {
    const applyTheme = () => {
      const accent = localStorage.getItem('ycs-accent') || '#323233';
      const bg = localStorage.getItem('ycs-bg') || '#252526';
      const fg = localStorage.getItem('ycs-foreground') || '#444444';
      const text = localStorage.getItem('ycs-text') || '#ffffff';
      const highlight = localStorage.getItem('ycs-highlight') || '#0078d7';
      const font = localStorage.getItem('ycs-font') || "'Inter', system-ui, sans-serif";
      document.documentElement.style.setProperty('--ycs-accent', accent);
      document.documentElement.style.setProperty('--ycs-bg', bg);
      document.documentElement.style.setProperty('--ycs-foreground', fg);
      document.documentElement.style.setProperty('--ycs-text', text);
      document.documentElement.style.setProperty('--ycs-highlight', highlight);
      document.documentElement.style.setProperty('--ycs-font', font);
      window.electronAPI?.updateTheme({ accent });
    };
    applyTheme();
    window.addEventListener('storage', applyTheme);
    return () => window.removeEventListener('storage', applyTheme);
  }, []);

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('page') === 'preferences') {
    return <PreferencesPage />;
  }

  return (
    <WindowFrame>
      <div style={{ textAlign: 'center' }}>
        {/* Workspace content goes here */}
      </div>
    </WindowFrame>
  );
}

export default App;
