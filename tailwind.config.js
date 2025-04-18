/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'background-primary': 'var(--background-primary)',
        'background-secondary': 'var(--background-secondary)',
        'background-tertiary': 'var(--background-tertiary)',
        'card-background': 'var(--card-background)',
        'input-background': 'var(--input-background)',
        'code-background': 'var(--code-background)',
        'bg-hover': 'var(--bg-hover)', // Used in nav/lists
        'bg-accent': 'var(--bg-accent)', // Active nav item
        'bg-light': 'var(--bg-light)', // General light bg, e.g., buttons, avatars

        // Text
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-accent-contrast': 'var(--text-accent-contrast)', // Text on primary/accent backgrounds
        'link': 'var(--link-color)', // Default link color
        'link-hover': 'var(--link-hover-color)', // Link hover color
        'input-text': 'var(--input-text)',
        'code-text': 'var(--code-text)',

        // Borders & Rings
        'border-color': 'var(--border-color)',
        'card-border': 'var(--card-border)', // Potentially same as border-color
        'input-border': 'var(--input-border)',
        'focus-ring': 'var(--focus-ring-color)', // For focus rings

        // Primary & Accents
        'primary': 'var(--primary)',
        'primary-accent': 'var(--primary-accent)',
        'primary-accent-dark': 'var(--primary-accent-dark)',
        'primary-accent-light': 'var(--primary-accent-light)',

        // Semantic Colors (Success, Info, Warning, Danger)
        'success': 'var(--success-color)', // Base success color (icons, etc.)
        'success-text': 'var(--success-text)', // Text for success messages
        'info': 'var(--info-color)', // Base info color (icons, etc.)
        'info-bg-light': 'var(--info-background-light)',
        'info-border': 'var(--info-border)',
        'info-text': 'var(--info-text)', // General info text
        'info-text-dark': 'var(--info-color-dark)', // Darker info text (e.g., headers)
        'warning': 'var(--warning-color)', // Base warning color
        'warning-bg-light': 'var(--warning-background-light)',
        'warning-border': 'var(--warning-border)',
        'warning-icon': 'var(--warning-icon)',
        'warning-text': 'var(--warning-text)',
        'warning-text-dark': 'var(--warning-text-dark)',
        'danger': 'var(--danger-color)', // Base danger color
        'danger-bg-light': 'var(--danger-background-light)',
        'danger-border': 'var(--danger-border)',
        'danger-icon': 'var(--danger-icon)',
        'danger-text': 'var(--danger-text)',
        'danger-text-dark': 'var(--danger-text-dark)',

        // Other
        'skeleton': 'var(--skeleton-background)', // For loading skeletons
      }
    },
  },
  plugins: [
    // Add Tailwind Forms plugin if needed for better form styling control
     require('@tailwindcss/forms'),
  ],
}

