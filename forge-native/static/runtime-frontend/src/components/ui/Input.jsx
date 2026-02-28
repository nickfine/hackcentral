/**
 * Input Component
 * A flexible input component supporting text, textarea, and search variants.
 */

import { forwardRef, useState } from 'react';
import { Search, Eye, EyeOff, X } from 'lucide-react';
import { cn } from '../../lib/design-system';

const SIZE_MAP = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const ICON_SIZE_MAP = {
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

const Input = forwardRef(({
  type = 'text',
  size = 'md',
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  clearable = false,
  onClear,
  disabled = false,
  required = false,
  className,
  inputClassName,
  leftIconClassName,
  id,
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const hasValue = props.value !== undefined && props.value !== '';

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-bold text-text-secondary mb-1.5"
        >
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon */}
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={cn(ICON_SIZE_MAP[size], 'text-text-muted', leftIconClassName)}>
              {leftIcon}
            </span>
          </div>
        )}

        {/* Input Element */}
        <input
          ref={ref}
          id={inputId}
          type={inputType}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          className={cn(
            // Base styles
            'w-full border-2 bg-arena-bg text-text-primary placeholder-text-muted rounded-card',
            'transition-colors duration-200',
            'focus-ring-control',
            // Size
            SIZE_MAP[size],
            // States
            error
              ? 'border-error focus:border-error'
              : 'border-arena-border focus:border-brand',
            disabled && 'opacity-50 cursor-not-allowed',
            // Icon padding
            leftIcon && 'pl-10',
            (rightIcon || isPassword || (clearable && hasValue)) && 'pr-10',
            inputClassName
          )}
          {...props}
        />

        {/* Right Side Icons */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {/* Clearable X button */}
          {clearable && hasValue && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="focus-ring-control rounded text-text-muted hover:text-text-primary transition-colors"
              aria-label="Clear input"
            >
              <X className={ICON_SIZE_MAP[size]} />
            </button>
          )}

          {/* Password Toggle */}
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="focus-ring-control rounded text-text-muted hover:text-text-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className={ICON_SIZE_MAP[size]} />
              ) : (
                <Eye className={ICON_SIZE_MAP[size]} />
              )}
            </button>
          )}

          {/* Custom Right Icon */}
          {rightIcon && !isPassword && (
            <span className={cn(ICON_SIZE_MAP[size], 'text-text-muted')}>
              {rightIcon}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * SearchInput - Specialized input for search functionality
 */
export const SearchInput = forwardRef(({
  onClear,
  className,
  ...props
}, ref) => {
  const hasValue = props.value !== undefined && props.value !== '';

  return (
    <Input
      ref={ref}
      type="search"
      leftIcon={<Search />}
      clearable={hasValue}
      onClear={onClear}
      placeholder="Search..."
      className={className}
      {...props}
    />
  );
});

SearchInput.displayName = 'SearchInput';

/**
 * TextArea - Multi-line text input
 */
export const TextArea = forwardRef(({
  label,
  helperText,
  error,
  rows = 3,
  resize = 'vertical',
  disabled = false,
  required = false,
  className,
  id,
  ...props
}, ref) => {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  const resizeClass = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-bold text-text-secondary mb-1.5"
        >
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      {/* TextArea Element */}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
        className={cn(
          // Base styles
          'w-full px-3 py-2 border-2 bg-arena-bg text-text-primary placeholder-text-muted text-sm rounded-card',
          'transition-colors duration-200',
          'focus-ring-control',
          // Resize
          resizeClass[resize],
          // States
          error
            ? 'border-error focus:border-error'
            : 'border-arena-border focus:border-brand',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        {...props}
      />

      {/* Error Message */}
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-error">
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';

/**
 * FormField - Wrapper for form inputs with consistent layout
 */
export const FormField = forwardRef(({
  label,
  helperText,
  error,
  required = false,
  className,
  children,
  id,
}, ref) => {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-bold text-text-secondary mb-1.5"
        >
          {label}
          {required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}

      {/* Field Content */}
      {children}

      {/* Error Message */}
      {error && (
        <p className="mt-1.5 text-sm text-error">{error}</p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';

export default Input;
