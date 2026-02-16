import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import Button from './Button';
import { gsap } from 'gsap';
import { useEffect, useRef } from 'react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  children?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'compact' | 'card';
  className?: string;
  animated?: boolean;
}

const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = 'md',
  variant = 'default',
  className = '',
  animated = true,
}: EmptyStateProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Premium entrance animation
  useEffect(() => {
    if (!animated || !containerRef.current) return;

    const tl = gsap.timeline({ delay: 0.2 });

    // Animate icon with bounce
    if (iconRef.current && Icon) {
      tl.fromTo(iconRef.current,
        { opacity: 0, scale: 0.5, rotation: -10 },
        { 
          opacity: 1, 
          scale: 1, 
          rotation: 0,
          duration: 0.6, 
          ease: 'elastic.out(1, 0.5)' 
        }
      );
    }

    // Animate content
    if (contentRef.current) {
      tl.fromTo(contentRef.current.children,
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.5, 
          stagger: 0.1,
          ease: 'power2.out' 
        },
        '-=0.3'
      );
    }
  }, [animated, Icon]);

  // Size configurations
  const sizeClasses = {
    sm: {
      container: 'py-8 px-4',
      iconWrapper: 'w-14 h-14',
      icon: 'w-7 h-7',
      title: 'text-base',
      description: 'text-sm',
      spacing: 'space-y-3',
    },
    md: {
      container: 'py-12 px-6',
      iconWrapper: 'w-20 h-20',
      icon: 'w-10 h-10',
      title: 'text-xl',
      description: 'text-base',
      spacing: 'space-y-4',
    },
    lg: {
      container: 'py-16 px-8',
      iconWrapper: 'w-24 h-24',
      icon: 'w-12 h-12',
      title: 'text-2xl',
      description: 'text-lg',
      spacing: 'space-y-5',
    },
  };

  // Variant configurations
  const variantClasses = {
    default: 'text-center',
    compact: 'text-left flex items-start gap-5',
    card: 'text-center bg-white rounded-2xl border border-slate-100 p-8 shadow-soft',
  };

  const classes = sizeClasses[size];
  const variantClass = variantClasses[variant];

  return (
    <div 
      ref={containerRef}
      className={`${classes.container} ${variantClass} ${className}`}
    >
      {/* Premium Icon with gradient background */}
      {Icon && (
        <div 
          ref={iconRef}
          className={`
            ${variant === 'compact' ? '' : 'mx-auto'} 
            mb-5
          `}
        >
          <div className={`
            ${classes.iconWrapper} 
            rounded-3xl 
            bg-gradient-to-br from-slate-100 to-slate-50
            flex items-center justify-center
            border border-slate-200/50
            shadow-inner
            relative overflow-hidden
            group
          `}>
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            
            <Icon 
              className={`${classes.icon} text-slate-300`} 
              strokeWidth={1.5}
            />
          </div>
        </div>
      )}
      
      {/* Premium Content */}
      <div 
        ref={contentRef}
        className={`${variant === 'compact' ? 'flex-1' : ''} ${classes.spacing}`}
      >
        <h3 className={`${classes.title} font-bold text-slate-900 tracking-tight`}>
          {title}
        </h3>
        
        {description && (
          <p className={`${classes.description} text-slate-500 max-w-sm mx-auto leading-relaxed`}>
            {description}
          </p>
        )}
        
        {children}
        
        {/* Premium Actions */}
        {(action || secondaryAction) && (
          <div className={`
            flex gap-3 
            ${variant === 'default' ? 'justify-center' : ''} 
            mt-6
          `}>
            {action && (
              <Button
                onClick={action.onClick}
                leftIcon={action.icon ? <action.icon className="w-4 h-4" /> : undefined}
                size={size === 'sm' ? 'sm' : 'md'}
              >
                {action.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                variant="secondary"
                onClick={secondaryAction.onClick}
                size={size === 'sm' ? 'sm' : 'md'}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
