import { createContext, useContext } from 'react';
import type { Socket } from 'socket.io-client';
import type { AppState } from './hooks/useSocket.js';
import type { Role } from '@gig-sheets/shared';

export interface AppContextValue {
  socket: React.MutableRefObject<Socket | null>;
  state: AppState;
  join: (name: string, role: Role) => void;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppContext.Provider');
  return ctx;
}
