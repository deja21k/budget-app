import type { ButtonHTMLAttributes } from 'react';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'soft';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
  disabledTooltip?: string;
  showSuccessFeedback?: boolean;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false, 
    leftIcon, 
    rightIcon,
    children,
    className = '',
    disabled,
    loadingText,
    disabledTooltip,
    fullWidth = false,
    ...props 
  }, ref) => {
    const baseStyles = `
      relative inline-flex items-center justify-center gap-2 font-medium
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
      rounded-xl overflow-hidden
      ${fullWidth ? 'w-full' : ''}
    `;
    
    const variants = {
      primary: `
        bg-primary-600 text-white
        hover:bg-primary-700
        focus:ring-primary-500/30
        shadow-md hover:shadow-lg
        border border-transparent
        active:scale-[0.98]
      `,
      secondary: `
        bg-white text-slate-700
        hover:bg-slate-50
        focus:ring-slate-500/20
        shadow-sm hover:shadow-md
        border border-slate-200 hover:border-slate-300
        active:scale-[0.98]
      `,
      danger: `
        bg-danger-600 text-white
        hover:bg-danger-700
        focus:ring-danger-500/30
        shadow-md hover:shadow-lg
        border border-transparent
        active:scale-[0.98]
      `,
      ghost: `
        text-slate-500 hover:text-slate-900
        hover:bg-slate-100
        focus:ring-slate-500/20
        border border-transparent
        active:scale-[0.98]
      `,
      outline: `
        bg-transparent text-slate-700
        border-2 border-slate-200
        hover:border-primary-500 hover:text-primary-600
        focus:ring-primary-500/20
        active:scale-[0.98]
      `,
      soft: `
        bg-primary-50 text-primary-700
        hover:bg-primary-100
        focus:ring-primary-500/20
        border border-transparent
        active:scale-[0.98]
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-base h-10',
      lg: 'px-5 py-2.5 text-base h-11',
      xl: 'px-6 py-3 text-lg h-12',
    };

    const classes = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <div className={`relative inline-block ${fullWidth ? 'w-full' : ''}`}>
        <button
          ref={ref}
          className={classes}
          disabled={disabled || isLoading}
          {...props}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {loadingText && <span>{loadingText}</span>}
              {!loadingText && children}
            </>
          ) : (
            <>
              {leftIcon}
              <span className="relative z-10">{children}</span>
              {rightIcon}
            </>
          )}
        </button>

        {disabled && disabledTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 
                          bg-slate-800 text-white text-xs font-medium rounded-lg shadow-lg
                          opacity-0 group-hover:opacity-100 transition-opacity
                          pointer-events-none whitespace-nowrap z-50">
            {disabledTooltip}
          </div>
        )}
      </div>
    );
  }
);

Button.displayName = 'Button';

export default Button;
