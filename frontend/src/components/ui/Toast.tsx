import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Loader2
} from 'lucide-react';
import Button from './Button';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType, options?: Omit<Toast, 'id' | 'message' | 'type'>) => string;
  hideToast: (id: string) => void;
  updateToast: (id: string, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast Provider Component
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType, options = {}) => {
    const id = Math.random().toString(36).substring(2, 9);
    const toast: Toast = {
      id,
      message,
      type,
      duration: type === 'loading' ? undefined : 5000,
      ...options,
    };
    
    setToasts(prev => [...prev, toast]);
    return id;
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      toast?.onClose?.();
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<Toast>) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, updateToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </ToastContext.Provider>
  );
};

// Individual Toast Item
const ToastItem: React.FC<{ 
  toast: Toast; 
  onClose: (id: string) => void;
  index: number;
}> = ({ toast, onClose, index }) => {
  const itemRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (itemRef.current && isMountedRef.current) {
      gsap.fromTo(
        itemRef.current,
        { x: 100, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: 'power3.out', delay: index * 0.05 }
      );
    }
  }, [index]);

  useEffect(() => {
    if (toast.duration && toast.type !== 'loading' && isMountedRef.current) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          onClose(toast.id);
        }
      }, toast.duration);
    }
  }, [toast.id, toast.duration, toast.type, onClose]);

  const handleClose = () => {
    if (itemRef.current && isMountedRef.current) {
      gsap.to(itemRef.current, {
        x: 100,
        opacity: 0,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => {
          if (isMountedRef.current) {
            onClose(toast.id);
          }
        },
      });
    } else {
      onClose(toast.id);
    }
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-success-600" />,
    error: <XCircle className="w-5 h-5 text-danger-600" />,
    warning: <AlertTriangle className="w-5 h-5 text-warning-600" />,
    info: <Info className="w-5 h-5 text-primary-600" />,
    loading: <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />,
  };

  const styles = {
    success: 'bg-success-50 border-success-200 text-success-800',
    error: 'bg-danger-50 border-danger-200 text-danger-800',
    warning: 'bg-warning-50 border-warning-200 text-warning-800',
    info: 'bg-primary-50 border-primary-200 text-primary-800',
    loading: 'bg-primary-50 border-primary-200 text-primary-800',
  };

  return (
    <div
      ref={itemRef}
      className={`
        relative flex items-start gap-3 p-4 rounded-xl border shadow-lg min-w-[320px] max-w-md
        ${styles[toast.type]}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {icons[toast.type]}
      </div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.message}</p>
        
        {toast.action && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              toast.action?.onClick();
              handleClose();
            }}
            className="mt-2 !p-0 !h-auto text-sm font-medium hover:underline"
          >
            {toast.action.label}
          </Button>
        )}
      </div>

      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4 opacity-60 hover:opacity-100" />
      </button>

      {/* Progress bar for auto-dismiss */}
      {toast.duration && toast.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 rounded-b-xl overflow-hidden">
          <div 
            className="h-full bg-current opacity-30"
            style={{
              animation: `shrink ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

// Toast Container
const ToastContainer: React.FC<{ 
  toasts: Toast[]; 
  onClose: (id: string) => void;
}> = ({ toasts, onClose }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast, index) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onClose={onClose} index={index} />
        </div>
      ))}
    </div>
  );
};

// Convenience hooks
export const useSuccessToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Omit<Toast, 'id' | 'message' | 'type'>) => {
    return showToast(message, 'success', options);
  }, [showToast]);
};

export const useErrorToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Omit<Toast, 'id' | 'message' | 'type'>) => {
    return showToast(message, 'error', { duration: 8000, ...options });
  }, [showToast]);
};

export const useWarningToast = () => {
  const { showToast } = useToast();
  return useCallback((message: string, options?: Omit<Toast, 'id' | 'message' | 'type'>) => {
    return showToast(message, 'warning', options);
  }, [showToast]);
};

export const useLoadingToast = () => {
  const { showToast, updateToast, hideToast } = useToast();
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    return () => {
      // Clear all pending timeouts on unmount
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, []);
  
  return useCallback((message: string) => {
    const id = showToast(message, 'loading');
    
    return {
      id,
      success: (successMessage: string) => {
        updateToast(id, { type: 'success', message: successMessage, duration: 5000 });
        const timeoutId = setTimeout(() => hideToast(id), 5000);
        timeoutRefs.current.push(timeoutId);
      },
      error: (errorMessage: string) => {
        updateToast(id, { type: 'error', message: errorMessage, duration: 8000 });
        const timeoutId = setTimeout(() => hideToast(id), 8000);
        timeoutRefs.current.push(timeoutId);
      },
      dismiss: () => hideToast(id),
    };
  }, [showToast, updateToast, hideToast]);
};

export default ToastProvider;
