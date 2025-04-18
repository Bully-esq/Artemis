import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeAwareLogo from './ThemeAwareLogo';
import { useTheme } from '../../context/ThemeContext';
import NetworkStatus from '../common/NetworkStatus';
import ActionButtonContainer from '../common/ActionButtonContainer';
import { ArrowLeftOnRectangleIcon, Bars3BottomLeftIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

/**
 * Main page layout component with sidebar navigation
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {React.ReactNode} props.children - Page content
 * @param {React.ReactNode} props.actions - Additional action buttons to display in header
 */
const PageLayout = ({ title, children, actions, isLoading }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isDarkMode } = useTheme();
  
  // Navigation items
  const navigation = [
    { name: 'Dashboard', href: '/', icon: 'home' },
    { name: 'Quotes', href: '/quotes', icon: 'document-text' },
    { name: 'Invoices', href: '/invoices', icon: 'document' },
    { name: 'Contacts', href: '/contacts', icon: 'users' },
    { name: 'Suppliers', href: '/suppliers', icon: 'truck' },
    { name: 'Users', href: '/users', icon: 'user-group' },
    { name: 'Settings', href: '/settings', icon: 'cog' },
  ];
  
  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Check if a navigation item is active
  const isActive = (href) => {
    if (href === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(href);
  };
  
  // Render icon based on name - Using Tailwind size classes
  const renderIcon = (iconName, customClasses = "h-6 w-6") => {
    switch (iconName) {
      case 'home':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'document-text':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'users':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'truck':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        );
      case 'user-group':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'cog':
        return (
          <svg className={customClasses} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  // Common classes for nav items
  const navItemBaseClasses = "flex items-center px-4 py-3 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out";
  const navItemInactiveClasses = "text-text-secondary hover:bg-bg-hover hover:text-text-primary";
  const navItemActiveClasses = "bg-bg-accent text-text-accent-contrast";
  const navIconBaseClasses = "mr-3 flex-shrink-0 h-6 w-6";
  const navIconInactiveClasses = "text-text-secondary group-hover:text-text-primary";
  const navIconActiveClasses = "text-text-accent-contrast";

  return (
    <div className={`flex h-screen overflow-hidden bg-background-primary ${isDarkMode ? 'dark' : ''}`}>
      {/* Mobile Sidebar */}
      <Transition.Root show={isSidebarOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40 lg:hidden" onClose={setIsSidebarOpen}>
          <Transition.Child
            as={Fragment}
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-50" />
          </Transition.Child>
          <div className="fixed inset-0 flex z-40">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-in-out duration-300"
              enterFrom="-translate-x-full"
              enterTo="translate-x-0"
              leave="transform transition ease-in-out duration-300"
              leaveFrom="translate-x-0"
              leaveTo="-translate-x-full"
            >
              <Dialog.Panel className={`relative flex w-full max-w-xs flex-1 flex-col border-r border-border-color bg-background-secondary pt-5 pb-4`}>
                <Transition.Child
                  as={Fragment}
                  enter="ease-in-out duration-300"
                  enterFrom="opacity-0"
                  enterTo="opacity-100"
                  leave="ease-in-out duration-300"
                  leaveFrom="opacity-100"
                  leaveTo="opacity-0"
                >
                  <div className="absolute top-0 right-0 -mr-12 pt-2">
                    <button
                      type="button"
                      className="ml-1 flex h-10 w-10 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus-ring"
                      onClick={() => setIsSidebarOpen(false)}
                    >
                      <span className="sr-only">Close sidebar</span>
                      <XMarkIcon className="h-6 w-6 text-text-primary" aria-hidden="true" />
                    </button>
                  </div>
                </Transition.Child>
                <div className="flex flex-shrink-0 items-center px-4">
                  <ThemeAwareLogo className="h-8 w-auto" />
                </div>
                <div className="mt-5 h-0 flex-1 overflow-y-auto">
                  <nav className="space-y-1 px-2">
                    {navigation.map((item) => (
                      <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'}
                        className={({ isActive }) =>
                          clsx(
                            isActive ? navItemActiveClasses : navItemInactiveClasses,
                            'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {renderIcon(item.icon, clsx(
                              isActive ? navIconActiveClasses : navIconInactiveClasses,
                              'mr-3 flex-shrink-0 h-6 w-6'
                            ))}
                            {item.name}
                          </>
                        )}
                      </NavLink>
                    ))}
                  </nav>
                </div>
                <div className="flex-shrink-0 border-t border-border-color p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 mr-3 h-8 w-8 rounded-full bg-bg-light flex items-center justify-center text-text-secondary">
                      <UserCircleIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="block text-sm font-medium text-text-primary truncate">{user?.name || 'User'}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full flex items-center justify-start px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors duration-150 ease-in-out"
                  >
                    <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
                    Logout
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
            <div className="w-14 flex-shrink-0" aria-hidden="true">
              {/* Dummy element to force sidebar to shrink to fit close icon */}
            </div>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Static sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex w-64 flex-col">
          {/* Sidebar component, swap this element with another sidebar if you like */}
          <div className="flex flex-grow flex-col overflow-y-auto border-r border-border-color bg-background-secondary pt-5 pb-4">
            <div className="flex flex-shrink-0 items-center px-4">
              <ThemeAwareLogo className="h-8 w-auto" />
            </div>
            <div className="mt-5 flex flex-grow flex-col">
              <nav className="flex-1 space-y-1 px-2">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    end={item.href === '/'}
                    className={({ isActive }) =>
                      clsx(
                        isActive ? navItemActiveClasses : navItemInactiveClasses,
                        'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {renderIcon(item.icon, clsx(
                          isActive ? navIconActiveClasses : navIconInactiveClasses,
                          'mr-3 flex-shrink-0 h-6 w-6'
                        ))}
                        {item.name}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="flex-shrink-0 border-t border-border-color p-4 mt-auto">
              <div className="flex items-center group">
                <div className="flex-shrink-0 mr-3 h-8 w-8 rounded-full bg-bg-light flex items-center justify-center text-text-secondary group-hover:text-text-primary">
                  <UserCircleIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <span className="block text-sm font-medium text-text-primary truncate">{user?.name || 'User'}</span>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="mt-3 w-full flex items-center justify-start px-3 py-2 rounded-md text-sm font-medium text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors duration-150 ease-in-out"
              >
                <ArrowLeftOnRectangleIcon className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 flex h-16 flex-shrink-0 border-b border-border-color bg-background-primary shadow-sm">
          {/* Mobile Menu Button */}
          <button
            type="button"
            className="border-r border-border-color px-4 text-text-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-focus-ring lg:hidden"
            onClick={() => setIsSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3BottomLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          {/* Header Content */}
          <div className="flex flex-1 items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Empty div for spacing on desktop when sidebar is static */}
            <div className="lg:hidden flex-shrink-0 w-0">&nbsp;</div> 
            
            {/* Title Section - Make text smaller and center it */}
            <div className="flex-1 text-center"> 
              <h1 className="text-xl font-semibold text-text-primary truncate">{title}</h1>
            </div>
            
            {/* Action Buttons */}
            <div className="ml-4 flex flex-shrink-0 items-center">
              {/* Conditionally render actions only if not loading */} 
              {!isLoading && actions && (
                <ActionButtonContainer>
                  {actions}
                </ActionButtonContainer>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto focus:outline-none" tabIndex={-1}>
          <div className="py-6">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default PageLayout;