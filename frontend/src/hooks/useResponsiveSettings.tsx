import { useState, useEffect } from 'react';

export const useResponsiveSettings = () => {
  const [isCompactMode, setIsCompactMode] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsCompactMode(window.innerWidth < 640); // sm breakpoint
    };

    // Initial check
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isCompactMode };
};