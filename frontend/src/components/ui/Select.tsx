import { forwardRef, useState, useRef, useEffect } from 'react';
import { ChevronDown, AlertCircle, Check, Loader2 } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  success?: boolean;
  helperText?: string;
  /** Options for the select dropdown */
  options: SelectOption[];
  /** Loading state for async options */
  isLoading?: boolean;
  /** Empty state message when no options available */
  emptyMessage?: string;
  /** Custom placeholder */
  placeholder?: string;
  /** Callback when selection changes */
  onChange?: (value: string) => void;
  /** Display grouped options */
  groups?: { label: string; options: SelectOption[] }[];
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({
    label,
    error,
    success = false,
    helperText,
    options,
    isLoading,
    emptyMessage = 'No options available',
    placeholder = 'Select an option',
    onChange,
    groups,
    className = '',
    disabled,
    value,
    ...props
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);

    // Combine refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(selectRef.current);
        } else {
          ref.current = selectRef.current;
        }
      }
    }, [ref]);

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange?.(e.target.value);
    };

    // Build CSS classes
    const selectClasses = `
      w-full appearance-none rounded-lg border bg-white px-4 py-2.5 pr-10 text-gray-900
      transition-all duration-200 outline-none cursor-pointer
      disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
      ${error 
        ? 'border-danger-300 focus:border-danger-500 focus:ring-2 focus:ring-danger-500/20' 
        : success 
          ? 'border-success-300 focus:border-success-500 focus:ring-2 focus:ring-success-500/20'
          : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20'
      }
      ${isFocused ? 'shadow-sm' : ''}
      ${className}
    `;

    const hasOptions = options.length > 0 || (groups && groups.some(g => g.options.length > 0));

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {label}
            {props.required && <span className="text-danger-500 ml-1">*</span>}
          </label>
        )}

        {/* Select container */}
        <div className="relative group">
          <select
            ref={selectRef}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            disabled={disabled || isLoading || !hasOptions}
            className={selectClasses}
            aria-invalid={!!error}
            aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
            {...props}
          >
            {/* Placeholder option */}
            <option value="" disabled>
              {isLoading ? 'Loading...' : placeholder}
            </option>

            {/* Render grouped options */}
            {groups ? (
              groups.map((group, groupIndex) => (
                <optgroup key={groupIndex} label={group.label}>
                  {group.options.map((option) => (
                    <option 
                      key={option.value} 
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                      {option.description && ` - ${option.description}`}
                    </option>
                  ))}
                </optgroup>
              ))
            ) : (
              /* Render flat options */
              options.map((option) => (
                <option 
                  key={option.value} 
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                  {option.description && ` - ${option.description}`}
                </option>
              ))
            )}
          </select>

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
            {/* Loading spinner */}
            {isLoading && (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            )}

            {/* Success checkmark */}
            {!isLoading && success && !error && value && (
              <Check className="w-4 h-4 text-success-500" />
            )}

            {/* Dropdown arrow */}
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isFocused ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Focus indicator */}
          {isFocused && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-primary-500/20 pointer-events-none" />
          )}
        </div>

        {/* Error or helper text */}
        <div className="flex items-start justify-between mt-1.5 min-h-[1.25rem]">
          <div className="flex-1">
            {error ? (
              <p 
                id={`${props.id}-error`}
                className="text-sm text-danger-600 flex items-center gap-1 animate-enter"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </p>
            ) : helperText ? (
              <p 
                id={`${props.id}-helper`}
                className="text-sm text-gray-500"
              >
                {helperText}
              </p>
            ) : !hasOptions && !isLoading ? (
              <p className="text-sm text-warning-600">
                {emptyMessage}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
