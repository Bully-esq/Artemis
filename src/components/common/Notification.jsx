import React, { useEffect, useState } from 'react';
import { Transition } from '@headlessui/react'; // Import Transition for smooth animations

/**
 * Notification component to show success, error, info, and warning messages
 * Converted to use Tailwind CSS and Headless UI for transitions.
 */
const Notification = ({ id, type = 'info', message, duration = 5000, onClose }) => { // Increased default duration
  const [show, setShow] = useState(true);

  // Auto-dismiss after specified duration
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(() => {
        setShow(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  // Callback after the transition ends
  const handleAfterLeave = () => {
    onClose(id);
  };

  // Handle manual close
  const handleClose = () => {
    setShow(false);
  };

  // Determine Tailwind classes based on notification type
  const baseClasses = "max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden";
  let typeClasses = "";
  let iconClasses = "";
  let textClasses = "";
  let iconPath = null;

  switch (type) {
    case 'success':
      typeClasses = "bg-green-50 border border-green-200"; // Example: Optional border
      iconClasses = "text-green-400";
      textClasses = "text-green-800";
      iconPath = (
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      );
      break;
    case 'error':
      typeClasses = "bg-red-50 border border-red-200";
      iconClasses = "text-red-400";
      textClasses = "text-red-800";
      iconPath = (
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      );
      break;
    case 'warning':
      typeClasses = "bg-yellow-50 border border-yellow-200";
      iconClasses = "text-yellow-400";
      textClasses = "text-yellow-800";
      iconPath = (
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      );
      break;
    case 'info':
    default:
      typeClasses = "bg-blue-50 border border-blue-200";
      iconClasses = "text-blue-400";
      textClasses = "text-blue-800";
      iconPath = (
         <> 
           <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h.01a1 1 0 000-2H9z" clipRule="evenodd" />
           {/* Note: Original info icon had a second path, ensure it's included if needed */}
           {/* <path d="M9 13a1 1 0 102 0v-3a1 1 0 10-2 0v3z" /> */}
         </>
      );
      break;
  }

  return (
    <Transition
      show={show}
      as={React.Fragment} // Use Fragment to avoid adding extra div
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
      enterTo="translate-y-0 opacity-100 sm:translate-x-0"
      leave="transition ease-in duration-100"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      afterLeave={handleAfterLeave} // Call onClose after transition ends
    >
      <div className={`${baseClasses} ${typeClasses}`}>
        <div className="p-4">
          <div className="flex items-start">
            {/* Icon */}
            <div className="flex-shrink-0">
              <svg className={`h-6 w-6 ${iconClasses}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                {iconPath}
              </svg>
            </div>
            {/* Message */}
            <div className="ml-3 w-0 flex-1 pt-0.5">
              <p className={`text-sm font-medium ${textClasses}`}>{message}</p>
              {/* Optional: Add description here if needed */}
              {/* <p className="mt-1 text-sm text-gray-500">Anyone with a link can view this file.</p> */}
            </div>
            {/* Close Button */}
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={handleClose}
                className={`bg-transparent rounded-md inline-flex ${textClasses} hover:text-opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${typeClasses.includes('bg-opacity') ? 'focus:ring-offset-opacity-0' : ''}`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  );
};

/**
 * Container component to manage and display multiple notifications
 * Uses Tailwind for positioning and spacing.
 */
export const Notifications = ({ notifications = [], onRemove }) => {
  if (!notifications || notifications.length === 0) return null;

  return (
    // Position the container (e.g., top-right corner)
    <div 
      aria-live="assertive" 
      className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-end sm:justify-end z-50 space-y-4"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          id={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onClose={onRemove}
        />
      ))}
    </div>
  );
};

export default Notification;