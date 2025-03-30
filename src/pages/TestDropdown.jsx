import React from 'react';
import { ActionButtons } from '../components/common/Button';

const TestDropdown = () => {
  const testActions = [
    { label: "Action 1", onClick: () => alert("Action 1 clicked") },
    { label: "Action 2", onClick: () => alert("Action 2 clicked") },
    { label: "Action 3", onClick: () => alert("Action 3 clicked") }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h1>Dropdown Test Page</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #ccc', padding: '10px 0' }}>
        <h2>Page Title</h2>
        <ActionButtons actions={testActions} />
      </div>
      <p>Resize your browser window to test the responsive dropdown behavior.</p>
      <p>The dropdown should appear when you click the "Actions" button on smaller screens.</p>
    </div>
  );
};

export default TestDropdown; 