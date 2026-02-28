/**
 * Modal Component
 * A dialog/modal component with backdrop, close button, and animation.
 */

import { useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/design-system';
import Button, { IconButton } from './Button';

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full mx-4',
};

function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  panelClassName,
  children,
  ...props
}) {
  const modalRef = useRef(null);
  const previousFocus = useRef(null);
  const onCloseRef = useRef(onClose);
  const closeOnEscapeRef = useRef(closeOnEscape);
  const scrollLockRef = useRef({
    scrollY: 0,
    overflow: '',
    position: '',
    top: '',
    left: '',
    right: '',
    width: '',
  });

  useEffect(() => {
    onCloseRef.current = onClose;
    closeOnEscapeRef.current = closeOnEscape;
  }, [onClose, closeOnEscape]);

  // Handle backdrop click
  const handleBackdropClick = useCallback((e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  }, [closeOnBackdrop, onClose]);

  // Focus management and scroll lock (only when open/close state changes)
  useEffect(() => {
    if (isOpen) {
      // Save current focus
      previousFocus.current = document.activeElement;
      
      // Lock body scroll (iOS-safe) while preserving current scroll position.
      const bodyStyle = document.body.style;
      scrollLockRef.current = {
        scrollY: window.scrollY,
        overflow: bodyStyle.overflow,
        position: bodyStyle.position,
        top: bodyStyle.top,
        left: bodyStyle.left,
        right: bodyStyle.right,
        width: bodyStyle.width,
      };
      bodyStyle.overflow = 'hidden';
      bodyStyle.position = 'fixed';
      bodyStyle.top = `-${scrollLockRef.current.scrollY}px`;
      bodyStyle.left = '0';
      bodyStyle.right = '0';
      bodyStyle.width = '100%';
      
      // Focus modal
      modalRef.current?.focus();
      
      // Add event listener
      const onKeyDown = (e) => {
        if (closeOnEscapeRef.current && e.key === 'Escape') {
          onCloseRef.current?.();
        }
      };
      document.addEventListener('keydown', onKeyDown);

      return () => {
        // Restore body scroll lock styles and original scroll position.
        const bodyStyle = document.body.style;
        const { scrollY, overflow, position, top, left, right, width } = scrollLockRef.current;
        bodyStyle.overflow = overflow;
        bodyStyle.position = position;
        bodyStyle.top = top;
        bodyStyle.left = left;
        bodyStyle.right = right;
        bodyStyle.width = width;
        window.scrollTo(0, scrollY);
        
        // Remove event listener
        document.removeEventListener('keydown', onKeyDown);
        
        // Restore focus
        if (previousFocus.current instanceof HTMLElement) {
          previousFocus.current.focus();
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-modal flex items-start justify-center overflow-y-auto p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-fade-in"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Panel */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className={cn(
          'relative my-6 w-full max-h-[calc(100vh-3rem)] overflow-y-auto',
          panelClassName || 'bg-arena-card border-2 border-arena-border shadow-xl rounded-card',
          'animate-slide-up',
          SIZE_MAP[size],
          className
        )}
        {...props}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between p-4 sm:p-5 border-b border-arena-border">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-bold text-text-primary"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-text-secondary"
                >
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <IconButton
                icon={<X />}
                label="Close modal"
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="-mr-2 -mt-1"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );

  // Render to portal
  return createPortal(modalContent, document.body);
}

/**
 * Modal.Footer - Footer section with action buttons
 */
Modal.Footer = function ModalFooter({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 pt-4 mt-4 border-t border-arena-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Modal.Footer.displayName = 'Modal.Footer';

/**
 * ConfirmModal - Pre-built confirmation dialog
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      {message && (
        <p className="text-sm text-text-secondary">{message}</p>
      )}
      
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={loading}
        >
          {cancelLabel}
        </Button>
        <Button
          variant={variant}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

ConfirmModal.displayName = 'ConfirmModal';

export default Modal;
