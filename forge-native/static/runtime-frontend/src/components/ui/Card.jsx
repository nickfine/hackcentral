/**
 * Card Component
 * A flexible container component with multiple variants
 */

import { forwardRef, createContext, useContext } from 'react';
import { cn, CARD_VARIANTS } from '../../lib/design-system';

const CardContext = createContext({ variant: 'default' });

const PADDING_MAP = {
  none: '',
  sm: 'p-4',
  md: 'p-5 sm:p-6',
  lg: 'p-6 sm:p-10',
};

const Card = forwardRef(({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  clickable = false,
  as: Component = 'div',
  className,
  children,
  ...props
}, ref) => {
  const variantStyles = CARD_VARIANTS[variant] || CARD_VARIANTS.default;
  const paddingStyles = PADDING_MAP[padding];

  const getHoverClass = () => {
    if (!hoverable && !clickable) return '';
    return 'hover:shadow-card-hover hover:-translate-y-0.5';
  };

  return (
    <CardContext.Provider value={{ variant }}>
      <Component
        ref={ref}
        className={cn(
          'transition-all duration-200',
          variantStyles,
          paddingStyles,
          (hoverable || clickable) && getHoverClass(),
          clickable && 'cursor-pointer active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </Component>
    </CardContext.Provider>
  );
});

Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-b border-arena-border pb-3 mb-4', className)}
    {...props}
  >
    {children}
  </div>
));

CardHeader.displayName = 'Card.Header';

const CardTitle = forwardRef(({
  as: Component = 'h3',
  className,
  children,
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={cn('text-lg font-bold text-text-primary font-heading', className)}
    {...props}
  >
    {children}
  </Component>
));

CardTitle.displayName = 'Card.Title';

const CardSubtitle = forwardRef(({ className, children, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary mt-1', className)}
    {...props}
  >
    {children}
  </p>
));

CardSubtitle.displayName = 'Card.Subtitle';

const CardBody = forwardRef(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props}>
    {children}
  </div>
));

CardBody.displayName = 'Card.Body';

const CardFooter = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('border-t border-arena-border pt-3 mt-4', className)}
    {...props}
  >
    {children}
  </div>
));

CardFooter.displayName = 'Card.Footer';

const CardLabel = forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('text-xs font-bold uppercase tracking-wide text-text-muted mb-2', className)}
    {...props}
  >
    {children}
  </div>
));

CardLabel.displayName = 'Card.Label';

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Subtitle = CardSubtitle;
Card.Body = CardBody;
Card.Footer = CardFooter;
Card.Label = CardLabel;

export const useCardContext = () => useContext(CardContext);

export default Card;
