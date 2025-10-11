import React from 'react';
import { Outlet } from 'react-router-dom';
import { useMobileContext } from '../contexts/MobileContext';

export const SettingsLayout: React.FC = () => {
  const { isMobile } = useMobileContext();

  return (
    <div className={isMobile ? 'p-4' : 'p-8'}>
      {/* Content */}
      <div>
        <Outlet />
      </div>
    </div>
  );
};