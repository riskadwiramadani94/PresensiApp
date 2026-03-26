import React, { createContext, useContext, useState } from 'react';

interface PresensiCardContextType {
  isCardCollapsed: boolean;
  setIsCardCollapsed: (v: boolean) => void;
  openTrigger: number;
  triggerOpen: () => void;
}

const PresensiCardContext = createContext<PresensiCardContextType>({
  isCardCollapsed: false,
  setIsCardCollapsed: () => {},
  openTrigger: 0,
  triggerOpen: () => {},
});

export const PresensiCardProvider = ({ children }: { children: React.ReactNode }) => {
  const [isCardCollapsed, setIsCardCollapsed] = useState(false);
  const [openTrigger, setOpenTrigger] = useState(0);
  const triggerOpen = () => setOpenTrigger(v => v + 1);
  return (
    <PresensiCardContext.Provider value={{ isCardCollapsed, setIsCardCollapsed, openTrigger, triggerOpen }}>
      {children}
    </PresensiCardContext.Provider>
  );
};

export const usePresensiCard = () => useContext(PresensiCardContext);
