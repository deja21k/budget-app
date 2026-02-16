import { forwardRef } from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (can be number for pixels or string for CSS values) */
  width?: number | string;
  /** Height of the skeleton */
  height?: number | string;
  /** Border radius */
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Animation style */
  animation?: 'pulse' | 'wave' | 'none';
  /** Custom className */
  className?: string;
}

const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    width, 
    height, 
    radius = 'md', 
    animation = 'pulse', 
    className = '',
    style,
    ...props 
  }, ref) => {
    const radiusClasses = {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      xl: 'rounded-xl',
      full: 'rounded-full',
    };

    const animationClasses = {
      pulse: 'animate-pulse',
      wave: 'skeleton-wave',
      none: '',
    };

    const widthStyle = typeof width === 'number' ? `${width}px` : width;
    const heightStyle = typeof height === 'number' ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={`
          bg-gray-200 ${radiusClasses[radius]} ${animationClasses[animation]}
          ${className}
        `}
        style={{
          width: widthStyle,
          height: heightStyle,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

// Skeleton for text lines
export const SkeletonText: React.FC<{
  lines?: number;
  lineHeight?: number;
  className?: string;
}> = ({ lines = 3, lineHeight = 16, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={lineHeight}
          width={i === lines - 1 ? '75%' : '100%'}
          radius="sm"
        />
      ))}
    </div>
  );
};

// Skeleton for cards
export const SkeletonCard: React.FC<{
  hasImage?: boolean;
  hasActions?: boolean;
  className?: string;
}> = ({ hasImage = true, hasActions = true, className = '' }) => {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-6 space-y-4 ${className}`}>
      {hasImage && (
        <Skeleton height={160} radius="lg" className="w-full" />
      )}
      <SkeletonText lines={2} />
      {hasActions && (
        <div className="flex gap-3 pt-2">
          <Skeleton width={100} height={36} radius="md" />
          <Skeleton width={100} height={36} radius="md" />
        </div>
      )}
    </div>
  );
};

// Skeleton for transaction items
export const SkeletonTransaction: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-100 ${className}`}>
      <Skeleton width={40} height={40} radius="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton width={120} height={16} radius="sm" />
        <Skeleton width={80} height={14} radius="sm" />
      </div>
      <Skeleton width={80} height={20} radius="sm" />
    </div>
  );
};

// Skeleton for list with multiple items
export const SkeletonList: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 5, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonTransaction key={i} />
      ))}
    </div>
  );
};

// Skeleton for stats/dashboard
export const SkeletonStats: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <Skeleton width={80} height={14} radius="sm" />
          <Skeleton width={100} height={28} radius="sm" />
          <Skeleton width={60} height={14} radius="sm" />
        </div>
      ))}
    </div>
  );
};

// Skeleton for form fields
export const SkeletonForm: React.FC<{
  fields?: number;
  className?: string;
}> = ({ fields = 4, className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton width={100} height={16} radius="sm" />
          <Skeleton height={44} radius="md" className="w-full" />
        </div>
      ))}
      <Skeleton width={120} height={44} radius="md" />
    </div>
  );
};

// Add wave animation style
export const SkeletonStyles = () => (
  <style>{`
    @keyframes skeleton-wave {
      0% {
        background-position: 200% 0;
      }
      100% {
        background-position: -200% 0;
      }
    }
    
    .skeleton-wave {
      background: linear-gradient(
        90deg,
        #e5e7eb 25%,
        #f3f4f6 50%,
        #e5e7eb 75%
      );
      background-size: 200% 100%;
      animation: skeleton-wave 1.5s ease-in-out infinite;
    }
  `}</style>
);

export default Skeleton;
