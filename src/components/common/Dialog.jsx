import React, { useEffect, useRef, Fragment } from 'react';
import Button from './Button';
import { Dialog as HeadlessDialog, Transition } from '@headlessui/react';

/**
 * Modal dialog component using Headless UI and Tailwind CSS
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether the dialog is open 
 * @param {Function} props.onClose - Function to call when dialog is closed
 * @param {string} [props.title] - Dialog title
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} [props.footer] - Custom footer content (replaces default close button)
 * @param {'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl'} [props.size='md'] - Dialog size
 * @param {string} [props.panelClassName] - Additional classes for dialog panel
 * @param {boolean} [props.showCloseButton=true] - Whether to show the default top-right close button
 * @param {React.MutableRefObject} [props.initialFocusRef] - Ref for the element to focus on open
 */
const Dialog = ({
  isOpen = false,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  panelClassName = '',
  showCloseButton = true,
  initialFocusRef
}) => {

  // Map size prop to Tailwind max-width classes
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <HeadlessDialog 
        as="div" 
        className="relative z-50"
        onClose={onClose}
        initialFocus={initialFocusRef}
       >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <HeadlessDialog.Panel 
                 className={`w-full ${sizeClasses[size] || sizeClasses.md} transform overflow-hidden rounded-lg bg-[var(--card-background)] text-left align-middle shadow-xl transition-all ${panelClassName}`}
              >
                {(title || showCloseButton) && (
                  <div className="flex justify-between items-center px-4 py-3 sm:px-6 border-b border-[var(--border-color)]">
                    {title && (
                      <HeadlessDialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-[var(--text-primary)]"
                      >
                        {title}
                      </HeadlessDialog.Title>
                    )}

                    {!title && showCloseButton && <span></span>}

                    {showCloseButton && (
                      <button
                         type="button"
                         className={`p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary)]`}
                         onClick={onClose}
                         aria-label="Close"
                      >
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                )}
                
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  {children}
                </div>

                {(footer || (!footer && !showCloseButton)) && (
                  <div className="px-4 py-3 sm:px-6 border-t border-[var(--border-color)] flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                    {footer ? footer : (
                      <Button variant="secondary" onClick={onClose}>
                        Close
                      </Button>
                    )}
                  </div>
                )}
              </HeadlessDialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </HeadlessDialog>
    </Transition>
  );
};

export default Dialog;