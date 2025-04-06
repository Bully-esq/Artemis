import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ThemeAwareLogo from './ThemeAwareLogo';
import '../../styles/components/common/pageLayout.css';

/**
 * Main page layout component with sidebar navigation
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Page title
 * @param {React.ReactNode} props.children - Page content
 * @param {React.ReactNode} props.actions - Additional action buttons to display in header
 */
const PageLayout = ({ title, children, actions }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  
  // Render icon based on name
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'home':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        );
      case 'document-text':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'document':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case 'users':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        );
      case 'truck':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
        );
      case 'cog':
        return (
          <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="layout-container">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="mobile-sidebar-overlay">
          <div 
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          ></div>
          
          {/* Mobile sidebar */}
          <div className="mobile-sidebar">
            <div className="sidebar-header">
              <div className="sidebar-title">
                <h1>Axton's Staircases</h1>
              </div>
              <button
                className="close-button"
                onClick={() => setSidebarOpen(false)}
              >
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="sidebar-content">
              <nav className="sidebar-nav">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div className={`nav-icon ${isActive(item.href) ? 'active' : ''}`}>
                      {renderIcon(item.icon)}
                    </div>
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            
            {/* Mobile sidebar footer with logout */}
            <div className="sidebar-footer">
              <div className="user-info">
                <div className="user-avatar">
                  <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="user-details">
                  <span className="user-name">{user?.name || 'User'}</span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="logout-button"
              >
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Sidebar for desktop */}
      <div className="desktop-sidebar">
        <div className="sidebar-inner">
          <div className="sidebar-header">
            <div className="sidebar-title">
              <h1>Axton's Staircases</h1>
            </div>
          </div>
          <div className="sidebar-content">
            <nav className="sidebar-nav">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
                >
                  <div className={`nav-icon ${isActive(item.href) ? 'active' : ''}`}>
                    {renderIcon(item.icon)}
                  </div>
                  <span className="nav-text">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>
          <div className="sidebar-footer">
            <div className="user-info">
              <div className="user-avatar">
                <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="user-details">
                <span className="user-name">{user?.name || 'User'}</span>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="logout-button"
            >
              <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="content-area">
        {/* Top header */}
        <div className="header">
          {/* Left section - Menu button */}
          <div className="header-left">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg className="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>
          </div>
          
          {/* Center section - Title */}
          <div className="header-center">
            <h1 className="page-title">{title}</h1>
          </div>
          
          {/* Right section - Actions and Logo */}
          <div className="header-right">
            {actions && <div className="action-buttons">{actions}</div>}
            <div className="header-logo-wrapper">
              <ThemeAwareLogo className="header-logo" alt="Axton's Staircases Logo" isTransparent={true} />
            </div>
          </div>
        </div>
        
        {/* Main content area */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default PageLayout;