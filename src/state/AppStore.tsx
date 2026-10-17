import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { INITIAL_DATA, reducer, type Action } from '@/domain/state';
import { STORAGE_KEY, StorageError, deserialize, serialize } from '@/domain/storage';
import type { AppData } from '@/domain/types';

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

interface AppStore {
  load: LoadState;
  data: AppData;
  dispatch: (action: Action) => void;
  /** True when the most recent write to device storage failed. */
  saveFailed: boolean;
  retryLoad: () => void;
  /** Deletes all on-device data. Only offered after an explicit confirmation. */
  eraseAll: () => Promise<void>;
}

const StoreContext = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [data, dispatch] = useReducer(reducer, INITIAL_DATA);
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [saveFailed, setSaveFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    let cancelled = false;
    hydrated.current = false;
    (async () => {
      try {
        const text = await AsyncStorage.getItem(STORAGE_KEY);
        const stored = deserialize(text);
        if (!cancelled) {
          dispatch({ type: 'hydrate', data: stored });
          hydrated.current = true;
          setLoad({ status: 'ready' });
        }
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof StorageError ? error.message : 'Your data could not be loaded from this device.';
          setLoad({ status: 'error', message });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  useEffect(() => {
    if (!hydrated.current) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, serialize(data))
      .then(() => setSaveFailed(false))
      .catch(() => setSaveFailed(true));
  }, [data]);

  const retryLoad = useCallback(() => {
    setLoad({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const eraseAll = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'resetAll' });
    hydrated.current = true;
    setLoad({ status: 'ready' });
  }, []);

  const value = useMemo(
    () => ({ load, data, dispatch, saveFailed, retryLoad, eraseAll }),
    [load, data, saveFailed, retryLoad, eraseAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): AppStore {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error('useStore must be used inside AppStoreProvider');
  }
  return store;
}

/** Re-renders every `intervalMs` while `active`; returns the current time. */
export function useNow(intervalMs = 1000, active = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!active) {
      return;
    }
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, active]);
  return now;
}
