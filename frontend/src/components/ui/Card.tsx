import type { HTMLAttributes } from 'react';
import { forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'elevated' | 'premium' | 'outline';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hover?: boolean;
  hoverScale?: boolean;
  glow?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    variant = 'default', 
    padding = 'md', 
    hover = false,
    hoverScale = false,
    glow = false,
    children,
    className = '',
    ...props 
  }, ref) => {
    const baseStyles = `
      rounded-2xl overflow-hidden
      transition-all duration-200 ease-out
      ${glow ? 'hover:shadow-glow' : ''}
    `;
    
    const variants = {
      default: `
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        shadow-sm
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5' : ''}
      `,
      glass: `
        bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/30
        shadow-sm
        ${hover ? 'hover:shadow-md' : ''}
      `,
      elevated: `
        bg-white dark:bg-slate-800
        shadow-md
        ${hover ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
      `,
      premium: `
        bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
        shadow-md
        ${hover ? 'hover:shadow-lg' : ''}
      `,
      outline: `
        bg-transparent dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700
        ${hover ? 'hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-900/20' : ''}
      `,
    };

    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
      xl: 'p-10',
    };

    const hoverScaleStyles = hoverScale ? 'hover:scale-[1.01]' : '';

    const classes = `${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverScaleStyles} ${className}`;

    return (
      <div ref={ref} className={classes} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

// Card Header
export const CardHeader = ({ 
  children, 
  className = '',
  action,
  title,
}: { 
  children?: React.ReactNode; 
  className?: string;
  action?: React.ReactNode;
  title?: React.ReactNode;
}) => (
  <div className={`flex items-center justify-between mb-6 ${className}`}>
    <div className="flex-1">{title || children}</div>
    {action && <div className="ml-4 flex-shrink-0">{action}</div>}
  </div>
);

// Card Title
export const CardTitle = ({ 
  children, 
  className = '',
  subtitle,
}: { 
  children: React.ReactNode; 
  className?: string;
  subtitle?: string;
}) => (
  <div className={className}>
    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{children}</h3>
    {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
  </div>
);

// Card Description
export const CardDescription = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <p className={`mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed ${className}`}>{children}</p>
);

// Card Content
export const CardContent = ({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => (
  <div className={className}>{children}</div>
);

// Card Footer
export const CardFooter = ({ 
  children, 
  className = '',
  divider = true,
}: { 
  children: React.ReactNode; 
  className?: string;
  divider?: boolean;
}) => (
  <div className={`mt-6 pt-6 ${divider ? 'border-t border-slate-100 dark:border-slate-700' : ''} flex items-center gap-3 ${className}`}>
    {children}
  </div>
);

// Card Badge
export const CardBadge = ({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'warning';
  className?: string;
}) => {
  const variants = {
    default: 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300',
    primary: 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800',
    success: 'bg-success-50 dark:bg-success-900/30 text-success-700 dark:text-success-300 border border-success-200 dark:border-success-800',
    danger: 'bg-danger-50 dark:bg-danger-900/30 text-danger-700 dark:text-danger-300 border border-danger-200 dark:border-danger-800',
    warning: 'bg-warning-50 dark:bg-warning-900/30 text-warning-700 dark:text-warning-300 border border-warning-200 dark:border-warning-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Card;
