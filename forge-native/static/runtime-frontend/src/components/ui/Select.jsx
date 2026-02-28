/**
 * Select Component
 * A dropdown select component with custom styling.
 */

import { forwardRef, useState, useRef, useEffect, useCallback, createContext, useContext } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/design-system';

// Context for sharing select state
const SelectContext = createContext({
  value: '',
  onChange: () => {},
  isOpen: false,
  setIsOpen: () => {},
});

const SIZE_MAP = {
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
};

const Select = forwardRef(({
  value,
  onChange,
  options = [],
  label,
  placeholder = 'Select...',
  helperText,
  error,
  disabled = false,
  required = false,
  clearable = false,
  size = 'md',
  className,
  children,
  id,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  // Find selected option label
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || '';

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        setIsOpen(!isOpen);
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen) setIsOpen(true);
        break;
    }
  }, [disabled, isOpen]);

  const handleSelect = useCallback((optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const handleClear = useCallback((e) => {
    e.stopPropagation();
    onChange?.('');
  }, [onChange]);

  return (
    <SelectContext.Provider value={{ value, onChange: handleSelect, isOpen, setIsOpen }}>
      <div ref={selectRef} className={cn('relative w-full', className)}>
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

        {/* Select Trigger */}
        <button
          ref={ref}
          id={inputId}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-invalid={!!error}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          className={cn(
            'w-full flex items-center justify-between border-2 bg-arena-card text-left rounded-card',
            'transition-colors duration-200 focus-ring-control',
            SIZE_MAP[size],
            error
              ? 'border-error focus:border-error'
              : isOpen
                ? 'border-brand'
                : 'border-arena-border focus:border-brand',
            disabled && 'opacity-50 cursor-not-allowed bg-arena-elevated',
            !disabled && 'cursor-pointer'
          )}
          {...props}
        >
          <span className={cn(
            value ? 'text-text-primary' : 'text-text-muted'
          )}>
            {displayValue || placeholder}
          </span>
          
          <div className="flex items-center gap-1 ml-2">
            {clearable && value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="focus-ring-control p-0.5 hover:bg-arena-elevated rounded"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4 text-text-muted" />
              </button>
            )}
            <ChevronDown className={cn(
              'w-4 h-4 text-text-muted transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          </div>
        </button>

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div
            role="listbox"
            className={cn(
              'absolute z-50 w-full mt-1 bg-arena-card border-2 border-arena-border shadow-lg rounded-card',
              'max-h-60 overflow-auto animate-slide-down'
            )}
          >
            {options.length > 0 ? (
              options.map((option) => (
                <SelectOption
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectOption>
              ))
            ) : children ? (
              children
            ) : (
              <div className="px-3 py-2 text-sm text-text-muted">
                No options available
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="mt-1.5 text-sm text-error">{error}</p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-text-muted">{helperText}</p>
        )}
      </div>
    </SelectContext.Provider>
  );
});

Select.displayName = 'Select';

/**
 * Select.Option - Individual option in dropdown
 */
function SelectOption({ value: optionValue, disabled = false, children, className }) {
  const { value, onChange } = useContext(SelectContext);
  const isSelected = value === optionValue;

  return (
    <button
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={() => !disabled && onChange(optionValue)}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-sm text-left',
        'transition-colors duration-150 focus-ring-control',
        isSelected
          ? 'bg-arena-elevated text-text-primary font-bold'
          : 'text-text-secondary hover:bg-arena-elevated',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
      {isSelected && <Check className="w-4 h-4" />}
    </button>
  );
}

SelectOption.displayName = 'Select.Option';

// Attach sub-component
Select.Option = SelectOption;

/**
 * MultiSelect - Select multiple options
 */
export const MultiSelect = forwardRef(({
  value = [],
  onChange,
  options = [],
  label,
  placeholder = 'Select...',
  helperText,
  error,
  disabled = false,
  required = false,
  size = 'md',
  className,
  id,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);
  const inputId = id || `multiselect-${Math.random().toString(36).substr(2, 9)}`;

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (selectRef.current && !selectRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOption = useCallback((optionValue) => {
    const newValue = value.includes(optionValue)
      ? value.filter(v => v !== optionValue)
      : [...value, optionValue];
    onChange?.(newValue);
  }, [value, onChange]);

  const removeOption = useCallback((optionValue, e) => {
    e.stopPropagation();
    onChange?.(value.filter(v => v !== optionValue));
  }, [value, onChange]);

  const selectedOptions = options.filter(opt => value.includes(opt.value));

  return (
    <div ref={selectRef} className={cn('relative w-full', className)}>
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

      {/* Select Trigger */}
      <button
        ref={ref}
        id={inputId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between border-2 bg-arena-card text-left min-h-[42px] rounded-card',
          'transition-colors duration-200 focus-ring-control',
          SIZE_MAP[size],
          error
            ? 'border-error focus:border-error'
            : isOpen
              ? 'border-brand'
              : 'border-arena-border focus:border-brand',
          disabled && 'opacity-50 cursor-not-allowed bg-arena-elevated'
        )}
        {...props}
      >
        <div className="flex-1 flex flex-wrap gap-1">
          {selectedOptions.length > 0 ? (
            selectedOptions.map(opt => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-arena-elevated text-sm rounded"
              >
                {opt.label}
                <X
                  className="w-3 h-3 cursor-pointer hover:text-error"
                  onClick={(e) => removeOption(opt.value, e)}
                />
              </span>
            ))
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </div>
        
        <ChevronDown className={cn(
          'w-4 h-4 text-text-muted transition-transform duration-200 ml-2 flex-shrink-0',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-arena-card border-2 border-arena-border shadow-lg rounded-card max-h-60 overflow-auto">
          {options.map((option) => {
            const isSelected = value.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleOption(option.value)}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 text-sm text-left',
                  'transition-colors duration-150 focus-ring-control',
                  isSelected
                    ? 'bg-arena-elevated text-text-primary'
                    : 'text-text-secondary hover:bg-arena-elevated'
                )}
              >
                {option.label}
                {isSelected && <Check className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      )}

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

MultiSelect.displayName = 'MultiSelect';

export default Select;
