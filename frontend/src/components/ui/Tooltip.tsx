import { useState, useRef, useEffect } from 'react';
import { gsap } from 'gsap';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';
type TooltipSize = 'sm' | 'md' | 'lg';

interface TooltipProps {
  /** Content to show in tooltip */
  content: React.ReactNode;
  /** Element that triggers the tooltip */
  children: React.ReactElement;
  /** Position of tooltip relative to trigger */
  position?: TooltipPosition;
  /** Size variant */
  size?: TooltipSize;
  /** Delay before showing (in ms) */
  delay?: number;
  /** Show tooltip immediately (for disabled button explanations) */
  showOnDisabled?: boolean;
  /** Don't wrap children in span (use when children already accept ref) */
  disableWrapper?: boolean;
  /** Additional className */
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  size = 'md',
  delay = 200,
  showOnDisabled = false,
  disableWrapper = false,
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sizes = {
    sm: 'px-2 py-1 text-xs max-w-[150px]',
    md: 'px-3 py-2 text-sm max-w-[250px]',
    lg: 'px-4 py-3 text-base max-w-[350px]',
  };

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowPositions = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-900',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-900',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-900',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-900',
  };

  useEffect(() => {
    if (tooltipRef && isVisible) {
      gsap.fromTo(
        tooltipRef,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.15, ease: 'power2.out' }
      );
    }
  }, [tooltipRef, isVisible]);

  const handleMouseEnter = () => {
    // Check if target is disabled
    const isDisabled = triggerRef.current?.hasAttribute('disabled') ||
                      triggerRef.current?.getAttribute('aria-disabled') === 'true';
    
    if (isDisabled && !showOnDisabled) return;

    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  // Clone child element with ref and event handlers
  const childElement = disableWrapper
    ? children
    : (
        <span 
          className="inline-flex"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children}
        </span>
      );

  return (
    <div className="relative inline-flex">
      {disableWrapper ? (
        <div
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onFocus={handleFocus}
          onBlur={handleBlur}
        >
          {children}
        </div>
      ) : (
        childElement
      )}

      {isVisible && (
        <div
          ref={(el) => { tooltipRef.current = el; }}
          className={`
            absolute z-50 ${positions[position]}
            ${sizes[size]}
            bg-gray-900 text-white rounded-lg shadow-lg
            pointer-events-none
            ${className}
          `}
          role="tooltip"
        >
          {content}
          
          {/* Arrow */}
          <div 
            className={`
              absolute w-0 h-0 
              border-4 border-transparent
              ${arrowPositions[position]}
            `}
          />
        </div>
      )}
    </div>
  );
};

// Info tooltip with icon
export const InfoTooltip: React.FC<{
  content: React.ReactNode;
  position?: TooltipPosition;
  className?: string;
}> = ({ content, position = 'top', className = '' }) => (
  <Tooltip content={content} position={position} className={className}>
    <button 
      type="button"
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="More information"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </button>
  </Tooltip>
);

// Help text with tooltip
export const HelpText: React.FC<{
  children: React.ReactNode;
  tooltip: React.ReactNode;
  className?: string;
}> = ({ children, tooltip, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <span>{children}</span>
    <InfoTooltip content={tooltip} />
  </div>
);

export default Tooltip;
