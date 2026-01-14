import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useBreakpoints, useScreenSize, useOrientation } from '../hooks/useMobile';

interface MobileContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoints: {
    xs: boolean;
    sm: boolean;
    md: boolean;
    lg: boolean;
    xl: boolean;
    '2xl': boolean;
    '3xl': boolean;
  };
  screenSize: {
    width: number;
    height: number;
  };
  orientation: 'portrait' | 'landscape';
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  rightPanelOpen: boolean;
  setRightPanelOpen: (open: boolean) => void;
  activePanel: 'sidebar' | 'right' | null;
  setActivePanel: (panel: 'sidebar' | 'right' | null) => void;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

interface MobileProviderProps {
  children: ReactNode;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ children }) => {
  const breakpoints = useBreakpoints();
  const screenSize = useScreenSize();
  const orientation = useOrientation();

  // Derive device types from breakpoints
  const isMobile = !breakpoints.md;
  const isTablet = breakpoints.md && !breakpoints.lg;
  const isDesktop = breakpoints.lg;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<'sidebar' | 'right' | null>(null);

  // Close panels when switching to desktop
  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(false);
      setRightPanelOpen(false);
      setActivePanel(null);
    }
  }, [isDesktop]);

  // Handle panel state coordination
  useEffect(() => {
    if (sidebarOpen) {
      setRightPanelOpen(false);
      setActivePanel('sidebar');
    } else if (rightPanelOpen) {
      setSidebarOpen(false);
      setActivePanel('right');
    } else {
      setActivePanel(null);
    }
  }, [sidebarOpen, rightPanelOpen]);

  // Close panels on orientation change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setRightPanelOpen(false);
      setActivePanel(null);
    }
  }, [orientation, isMobile]);

  const contextValue: MobileContextType = {
    isMobile,
    isTablet,
    isDesktop,
    breakpoints,
    screenSize,
    orientation,
    sidebarOpen,
    setSidebarOpen,
    rightPanelOpen,
    setRightPanelOpen,
    activePanel,
    setActivePanel,
  };

  return (
    <MobileContext.Provider value={contextValue}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobileContext = (): MobileContextType => {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobileContext must be used within a MobileProvider');
  }
  return context;
};