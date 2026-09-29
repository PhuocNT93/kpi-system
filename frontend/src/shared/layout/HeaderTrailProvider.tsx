import React, { useState } from 'react';
import { HeaderTrailSetterContext, HeaderTrailValueContext } from './header-trail';

export const HeaderTrailProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [trail, setTrail] = useState<string | null>(null);
  return (
    <HeaderTrailSetterContext.Provider value={setTrail}>
      <HeaderTrailValueContext.Provider value={trail}>{children}</HeaderTrailValueContext.Provider>
    </HeaderTrailSetterContext.Provider>
  );
};
