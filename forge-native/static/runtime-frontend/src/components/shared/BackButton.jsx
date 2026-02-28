/**
 * BackButton Component
 * Provides context-aware back navigation for deep views
 */

import { ChevronLeft } from 'lucide-react';
import { Button } from '../ui';

function BackButton({ 
  label = 'Back', 
  onClick = null,
  className = '',
}) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      leftIcon={<ChevronLeft className="w-4 h-4" />}
      className={className}
    >
      {label}
    </Button>
  );
}

export default BackButton;
