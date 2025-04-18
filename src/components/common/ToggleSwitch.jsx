import React from 'react';
import '../../styles/components/common/toggleSwitch.css';

const ToggleSwitch = ({ label, checked, onChange, helpText, name, className = '' }) => {
  // Create direct click handler to bypass potential event issues
  const handleClick = () => {
    console.log(`ToggleSwitch clicked - current checked state: ${checked}`);
    // Directly toggle the current value when clicked
    onChange(!checked);
  };

  // Also keep the original handler for when the checkbox receives native events
  const handleChange = (event) => {
    console.log(`ToggleSwitch native onChange - new checked state: ${event.target.checked}`);
    onChange(event.target.checked);
  };

  // Ensure we have a unique and consistent ID
  const switchId = name || `toggle-switch-${label?.replace(/\s+/g, '-').toLowerCase() || 'switch'}`;
  
  console.log(`Rendering ToggleSwitch: ${label}, checked=${checked}, id=${switchId}`);

  // Render ONLY the container and apply className directly to it
  return (
    <div className={`toggle-switch-container ${className}`} onClick={handleClick}>
      <input
        type="checkbox"
        id={switchId}
        className="toggle-switch-checkbox"
        checked={Boolean(checked)}
        onChange={handleChange}
        name={name}
      />
      <span className="toggle-switch-slider"></span>
    </div>
  );
};

export default ToggleSwitch;
