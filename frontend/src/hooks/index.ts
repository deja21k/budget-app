import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

type AsyncFunction<T, Args extends unknown[]> = (...args: Args) => Promise<T>;

export function useAsync<T, Args extends unknown[]>(
  asyncFunction: AsyncFunction<T, Args>,
  immediate = false
) {
  const [state, setState] = useState<UseAsyncState<T>>({
    data: null,
    loading: immediate,
    error: null,
  });

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      if (!isMountedRef.current) return null;

      setState({ data: null, loading: true, error: null });
      
      try {
        const data = await asyncFunction(...args);
        if (isMountedRef.current) {
          setState({ data, loading: false, error: null });
        }
        return data;
      } catch (error) {
        if (isMountedRef.current) {
          const errorObj = error instanceof Error ? error : new Error(String(error));
          setState({ data: null, loading: false, error: errorObj });
        }
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setState({ data: null, loading: false, error: null });
    }
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export { useAccount } from './useAccount';
export { useCameraCapture } from './useCameraCapture';
export { useSpeechRecognition } from './useSpeechRecognition';
