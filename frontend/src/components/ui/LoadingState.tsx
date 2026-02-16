import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface LoadingStateProps {
  /** Current loading state */
  isLoading: boolean;
  /** Error message if loading failed */
  error?: string | null;
  /** Callback to retry loading */
  onRetry?: () => void;
  /** Content to display when loaded */
  children: React.ReactNode;
  /** Custom loading message */
  loadingMessage?: string;
  /** Timeout before showing "taking longer than expected" message (in ms) */
  timeout?: number;
  /** Show skeleton loader instead of spinner */
  useSkeleton?: boolean;
  /** Skeleton component to render */
  skeleton?: React.ReactNode;
  /** Minimum loading duration to prevent flash (in ms) */
  minDuration?: number;
  /** Empty state message when no data */
  emptyMessage?: string;
  /** Whether data is empty */
  isEmpty?: boolean;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  isLoading,
  error,
  onRetry,
  children,
  loadingMessage = 'Loading...',
  timeout = 10000,
  useSkeleton = false,
  skeleton,
  minDuration = 300,
  emptyMessage,
  isEmpty = false,
}) => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(!isLoading);
  const [contentRef, setContentRef] = useState<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const durationRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timeout message and minimum duration
  useEffect(() => {
    if (isLoading) {
      // Use queueMicrotask to avoid synchronous setState warning
      queueMicrotask(() => {
        setShowTimeout(false);
        setMinTimeElapsed(false);
      });
      
      timeoutRef.current = setTimeout(() => setShowTimeout(true), timeout);
      durationRef.current = setTimeout(() => setMinTimeElapsed(true), minDuration);
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (durationRef.current) clearTimeout(durationRef.current);
    };
  }, [isLoading, timeout, minDuration]);

  // Animate content in when loaded
  useEffect(() => {
    if (!isLoading && minTimeElapsed && contentRef) {
      gsap.fromTo(
        contentRef,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [isLoading, minTimeElapsed, contentRef]);

  // Loading state
  if (isLoading || !minTimeElapsed) {
    if (useSkeleton && skeleton) {
      return <>{skeleton}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="relative">
          <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
          
          {/* Pulsing ring */}
          <div className="absolute inset-0 -m-2">
            <div className="w-14 h-14 rounded-full border-2 border-primary-200 animate-ping opacity-20" />
          </div>
        </div>
        
        <p className="mt-4 text-gray-600 font-medium">{loadingMessage}</p>
        
        {showTimeout && (
          <div className="mt-4 text-center animate-enter">
            <p className="text-sm text-gray-500 mb-2">
              This is taking longer than expected...
            </p>
            {onRetry && (
              <Button 
                variant="secondary" 
                size="sm"
                onClick={onRetry}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-danger-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-danger-600" />
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Something went wrong
        </h3>
        
        <p className="text-gray-600 max-w-sm mb-6">
          {error}
        </p>
        
        {onRetry && (
          <Button 
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Empty state
  if (isEmpty && emptyMessage) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1.5} 
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
            />
          </svg>
        </div>
        
        <p className="text-gray-600">{emptyMessage}</p>
      </div>
    );
  }

  // Success - render children
  return (
    <div ref={setContentRef}>
      {children}
    </div>
  );
};

// Full page loading overlay
export const FullPageLoader: React.FC<{
  isLoading: boolean;
  message?: string;
}> = ({ isLoading, message = 'Loading...' }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center">
        <div className="relative">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
          <div className="absolute inset-0 -m-3">
            <div className="w-18 h-18 rounded-full border-2 border-primary-200 animate-ping opacity-20" />
          </div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

// Inline loading indicator for buttons/actions
export const InlineLoader: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <Loader2 className={`${sizes[size]} animate-spin text-current ${className}`} />
  );
};

// Progress bar loader
export const ProgressLoader: React.FC<{
  progress: number;
  label?: string;
  className?: string;
}> = ({ progress, label, className = '' }) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-900 font-medium">{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

export default LoadingState;
