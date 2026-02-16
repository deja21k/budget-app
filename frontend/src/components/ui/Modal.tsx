import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  preventClose?: boolean;
  showOverlay?: boolean;
  className?: string;
}

const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  showCloseButton = true,
  closeOnOverlayClick = true,
  preventClose = false,
  showOverlay = true,
  className = '',
}: ModalProps) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isAnimatingRef = useRef(false);
  const isMountedRef = useRef(true);
  const onCloseRef = useRef(onClose);
  const preventCloseRef = useRef(preventClose);

  // Keep refs in sync
  useEffect(() => {
    onCloseRef.current = onClose;
    preventCloseRef.current = preventClose;
  }, [onClose, preventClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-6xl',
    full: 'max-w-[95vw]',
  };

  const handleClose = useCallback(() => {
    if (preventCloseRef.current || isAnimatingRef.current || !isMountedRef.current) return;
    onCloseRef.current();
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && closeOnOverlayClick && !preventCloseRef.current) {
      handleClose();
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !preventCloseRef.current && isMountedRef.current) {
        handleClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleEscape);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 overflow-y-auto">
      {showOverlay && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity duration-200"
        />
      )}

      <div
        ref={contentRef}
        className={`
          relative w-full ${sizes[size]}
          bg-white rounded-2xl overflow-hidden
          shadow-2xl
          transition-all duration-200 ease-out
          max-h-[calc(100vh-4rem)]
          flex flex-col
          ${className}
        `}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">{description}</p>
            )}
          </div>
          {showCloseButton && !preventClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="!p-2 rounded-xl hover:bg-slate-100"
            >
              <X className="w-5 h-5 text-slate-400 hover:text-slate-600 transition-colors" />
            </Button>
          )}
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          {children}
        </div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default Modal;
