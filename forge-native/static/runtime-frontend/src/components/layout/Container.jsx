/**
 * Container Component
 * A centered, max-width container with responsive padding.
 */

import { forwardRef } from 'react';
import { cn } from '../../lib/design-system';

const SIZE_MAP = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-[1280px] 2xl:max-w-[1440px]',
  '2xl': 'max-w-[1440px]',
  full: 'max-w-full',
};

const PADDING_MAP = {
  none: '',
  sm: 'px-3 sm:px-4',
  md: 'px-4 sm:px-6',
  lg: 'px-4 sm:px-6 lg:px-8',
};

const Container = forwardRef(({
  size = 'xl',
  padding = 'md',
  centered = true,
  as: Component = 'div',
  className,
  children,
  ...props
}, ref) => {
  return (
    <Component
      ref={ref}
      className={cn(
        'w-full',
        SIZE_MAP[size],
        PADDING_MAP[padding],
        centered && 'mx-auto',
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
});

Container.displayName = 'Container';

/**
 * Section - A semantic section with vertical padding
 */
export const Section = forwardRef(({
  size = 'xl',
  padding = 'md',
  spacing = 'md',
  className,
  children,
  ...props
}, ref) => {
  const spacingMap = {
    none: '',
    sm: 'py-4 sm:py-6',
    md: 'py-6 sm:py-8',
    lg: 'py-8 sm:py-12',
    xl: 'py-12 sm:py-16',
  };

  return (
    <section
      ref={ref}
      className={cn(spacingMap[spacing], className)}
      {...props}
    >
      <Container size={size} padding={padding}>
        {children}
      </Container>
    </section>
  );
});

Section.displayName = 'Section';

/**
 * PageHeader - Standard page header with title and optional actions
 */
export const PageHeader = forwardRef(({
  title,
  subtitle,
  actions,
  backButton,
  className,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn('mb-6', className)}
      {...props}
    >
      {backButton && (
        <div className="mb-4">
          {backButton}
        </div>
      )}
      
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm sm:text-base text-text-secondary">
              {subtitle}
            </p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
});

PageHeader.displayName = 'PageHeader';

export default Container;
