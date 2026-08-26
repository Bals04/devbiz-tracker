import { createContext, useCallback, useContext, useMemo } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage.js';

const PrivacyContext = createContext(null);

export const HIDE_AMOUNTS_KEY = 'devbiz.hideAmounts';

/**
 * Workspace-wide money visibility. One switch masks every currency figure in
 * the app so the team can screen-share or work in public without exposing
 * client contract values and balances.
 *
 * The preference is per-browser, not per-account: it is a display choice, not a
 * permission, and the amounts are still fetched as normal.
 */
export function PrivacyProvider({ children }) {
  const [hidden, setHidden] = useLocalStorage(HIDE_AMOUNTS_KEY, false);

  const toggle = useCallback(() => setHidden((current) => !current), [setHidden]);

  const value = useMemo(() => ({ hidden, setHidden, toggle }), [hidden, setHidden, toggle]);

  return <PrivacyContext.Provider value={value}>{children}</PrivacyContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const usePrivacy = () => useContext(PrivacyContext);
