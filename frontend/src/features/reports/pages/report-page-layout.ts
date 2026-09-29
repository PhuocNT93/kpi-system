import type React from 'react';

// Inside the hub the tab spans the banner width and fills the panel height so its main table can
// scroll on its own; standalone routes keep the centred page layout and the page scroll.
export const reportPageStyle = (isEmbedded: boolean): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
  ...(isEmbedded ? { flex: 1 } : { padding: '32px', maxWidth: '1200px', margin: '0 auto' }),
});

