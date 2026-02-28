/**
 * Tabs Component
 * A tabbed interface component with multiple styling variants.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import { cn } from '../../lib/design-system';

// Context for sharing tab state
const TabsContext = createContext({
  activeTab: '',
  setActiveTab: () => {},
  variant: 'default',
});

function Tabs({
  defaultValue,
  value,
  onChange,
  variant = 'default',
  className,
  children,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  
  const activeTab = value !== undefined ? value : internalValue;
  
  const setActiveTab = useCallback((newValue) => {
    if (value === undefined) {
      setInternalValue(newValue);
    }
    onChange?.(newValue);
  }, [value, onChange]);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, variant }}>
      <div className={cn('w-full', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/**
 * Tabs.List - Container for tab buttons
 */
function TabsList({ className, children, ...props }) {
  const { variant } = useContext(TabsContext);

  const variantStyles = {
    default: 'border-b-2 border-arena-border gap-0',
    teal: 'border-b-2 border-gray-200 dark:border-gray-700 gap-0',
    pills: 'bg-arena-elevated p-1 rounded-lg gap-1',
    underline: 'border-b border-arena-border gap-4',
    enclosed: 'border-b-2 border-arena-border gap-0',
  };

  return (
    <div
      role="tablist"
      className={cn(
        'flex',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

TabsList.displayName = 'Tabs.List';

/**
 * Tabs.Tab - Individual tab button
 */
function TabsTab({
  value,
  disabled = false,
  icon,
  count,
  className,
  children,
  ...props
}) {
  const { activeTab, setActiveTab, variant } = useContext(TabsContext);
  const isActive = activeTab === value;

  const baseStyles = 'flex items-center gap-2 font-bold transition-all duration-200 focus-ring-control';

  const variantStyles = {
    default: cn(
      'px-4 py-2.5 text-sm border-b-2 -mb-[2px]',
      isActive
        ? 'border-brand text-text-primary'
        : 'border-transparent text-text-secondary hover:text-text-primary hover:border-arena-border',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    teal: cn(
      'px-4 py-2.5 text-sm border-b-2 -mb-[2px]',
      isActive
        ? 'border-teal-500 text-teal-500 font-semibold'
        : 'border-transparent text-gray-500 dark:text-gray-400 font-normal hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    pills: cn(
      'px-3 py-1.5 text-sm rounded-md',
      isActive
        ? 'bg-arena-card text-text-primary shadow-sm'
        : 'text-text-secondary hover:text-text-primary hover:bg-arena-card/50',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    underline: cn(
      'pb-2.5 text-sm border-b-2 -mb-[1px]',
      isActive
        ? 'border-brand text-text-primary'
        : 'border-transparent text-text-secondary hover:text-text-primary',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
    enclosed: cn(
      'px-4 py-2.5 text-sm border-2 border-b-0 -mb-[2px] rounded-t-lg',
      isActive
        ? 'border-arena-border border-b-arena-card bg-arena-card text-text-primary'
        : 'border-transparent text-text-secondary hover:text-text-primary',
      disabled && 'opacity-50 cursor-not-allowed'
    ),
  };

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      tabIndex={isActive ? 0 : -1}
      onClick={() => !disabled && setActiveTab(value)}
      className={cn(baseStyles, variantStyles[variant], className)}
      {...props}
    >
      {icon && <span className="w-4 h-4">{icon}</span>}
      {children}
      {count !== undefined && (
        variant === 'teal'
          ? <span className="text-xs ml-1">{count}</span>
          : (
              <span className={cn(
                'px-1.5 py-0.5 text-xs rounded-lg',
                isActive
                  ? 'bg-arena-elevated text-text-primary'
                  : 'bg-arena-card text-text-secondary'
              )}>
                {count}
              </span>
            )
      )}
    </button>
  );
}

TabsTab.displayName = 'Tabs.Tab';

/**
 * Tabs.Panel - Content panel for a tab
 */
function TabsPanel({ value, className, children, ...props }) {
  const { activeTab } = useContext(TabsContext);
  const isActive = activeTab === value;

  if (!isActive) return null;

  return (
    <div
      role="tabpanel"
      tabIndex={0}
      className={cn('pt-4 animate-fade-in', className)}
      {...props}
    >
      {children}
    </div>
  );
}

TabsPanel.displayName = 'Tabs.Panel';

// Attach sub-components
Tabs.List = TabsList;
Tabs.Tab = TabsTab;
Tabs.Panel = TabsPanel;

// Export hook for accessing tab context
export const useTabs = () => useContext(TabsContext);

export default Tabs;
