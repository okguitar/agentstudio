import React from 'react';
import { Outlet } from 'react-router-dom';

export const SettingsLayout: React.FC = () => {
  return (
    <div className="p-8">
      {/* Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
};