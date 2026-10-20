import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const TitlebarActionsContext = createContext(null);

export function TitlebarActionsProvider({ children }) {
  const [actions, setActions] = useState(null);
  const activeRegistration = useRef(null);

  const register = useCallback((nextActions) => {
    const registration = Symbol('titlebar-actions');
    activeRegistration.current = registration;
    setActions(nextActions);

    return () => {
      if (activeRegistration.current !== registration) return;
      activeRegistration.current = null;
      setActions(null);
    };
  }, []);

  return (
    <TitlebarActionsContext.Provider value={{ actions, register }}>
      {children}
    </TitlebarActionsContext.Provider>
  );
}

export function useCurrentTitlebarActions() {
  return useContext(TitlebarActionsContext)?.actions ?? null;
}

export function useTitlebarActions({ active, enabled = true, search, onSearchChange, onAdd, buttons }) {
  const register = useContext(TitlebarActionsContext)?.register;
  const searchChangeRef = useRef(onSearchChange);
  const addRef = useRef(onAdd);
  const buttonsRef = useRef(buttons);
  searchChangeRef.current = onSearchChange;
  addRef.current = onAdd;
  buttonsRef.current = buttons;

  const buttonPresentation = buttons?.map(({ onClick: _onClick, ...button }) => button) ?? [];
  const buttonPresentationKey = JSON.stringify(buttonPresentation);

  useEffect(() => {
    if (!register || !active || !enabled) return undefined;
    return register({
      search,
      onSearchChange: value => searchChangeRef.current?.(value),
      onAdd: () => addRef.current?.(),
      buttons: buttonPresentation.map(button => ({
        ...button,
        onClick: () => buttonsRef.current?.find(candidate => candidate.id === button.id)?.onClick?.(),
      })),
    });
  }, [active, buttonPresentationKey, enabled, register, search]);
}
