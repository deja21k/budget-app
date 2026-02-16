import { forwardRef, useState, useCallback } from 'react';
import { AlertCircle, Check, Eye, EyeOff, Loader2 } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  maxLength?: number;
  showCharCount?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    label,
    error,
    success = false,
    helperText,
    leftIcon,
    rightIcon,
    isLoading,
    maxLength,
    showCharCount = false,
    className = '',
    disabled,
    type = 'text',
    value,
    onChange,
    onFocus,
    onBlur,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [charCount, setCharCount] = useState(String(value || '').length);

    const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    }, [onFocus]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    }, [onBlur]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setCharCount(newValue.length);
      onChange?.(e);
    }, [onChange]);

    const inputType = type === 'password' && isPasswordVisible ? 'text' : type;

    const inputClasses = `
      w-full rounded-xl border bg-white px-4 py-3 text-slate-900
      transition-all duration-200 ease-out outline-none
      placeholder:text-slate-400
      disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
      ${error
        ? 'border-danger-300 focus:border-danger-500 focus:ring-4 focus:ring-danger-500/10' 
        : success
          ? 'border-success-300 focus:border-success-500 focus:ring-4 focus:ring-success-500/10'
          : 'border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10'
      }
      hover:border-slate-300
      ${leftIcon ? 'pl-11' : ''}
      ${(rightIcon || isLoading || type === 'password') ? 'pr-11' : ''}
      ${isFocused ? 'shadow-sm' : ''}
      ${className}
    `;

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative group">
          {leftIcon && (
            <div className={`
              absolute left-3.5 top-1/2 -translate-y-1/2 
              text-slate-400 pointer-events-none 
              transition-colors duration-200
              ${isFocused ? 'text-primary-500' : 'group-hover:text-slate-500'}
            `}>
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled || isLoading}
            maxLength={maxLength}
            className={inputClasses}
            aria-invalid={!!error}
            {...props}
          />

          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isLoading && (
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
            )}

            {!isLoading && success && !error && (
              <div className="text-success-500">
                <Check className="w-4 h-4" strokeWidth={2.5} />
              </div>
            )}

            {type === 'password' && (
              <button
                type="button"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                className="
                  text-slate-400 hover:text-slate-600 
                  focus:outline-none focus:text-primary-500 
                  transition-colors duration-200
                "
                tabIndex={-1}
              >
                {isPasswordVisible ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {rightIcon && !isLoading && type !== 'password' && (
              <span className="text-slate-400">{rightIcon}</span>
            )}
          </div>
        </div>

        <div className="flex items-start justify-between mt-2 min-h-[1.25rem]">
          <div className="flex-1">
            {error ? (
              <div className="text-sm text-danger-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            ) : helperText ? (
              <p className="text-sm text-slate-500">
                {helperText}
              </p>
            ) : null}
          </div>

          {(showCharCount || maxLength) && (
            <span className={`text-xs ml-3 flex-shrink-0 font-medium ${
              maxLength && charCount > maxLength * 0.9 
                ? 'text-warning-600' 
                : 'text-slate-400'
            }`}>
              {charCount}
              {maxLength && <span className="text-slate-300">/{maxLength}</span>}
            </span>
          )}
        </div>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
