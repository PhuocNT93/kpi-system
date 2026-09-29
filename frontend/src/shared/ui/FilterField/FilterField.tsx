import React from 'react';
import { useFilterControlStyle } from './use-filter-control-style';

interface FilterFieldProps {
  id: string;
  label: string;
  children: React.ReactNode;
  // CSS flex shorthand for the field inside a wrapping filter row. Selects default to a compact
  // fixed width; the search field grows up to maxWidth.
  flex?: string;
  maxWidth?: string;
}

// Label above, control below — the layout of the Audit Logs filter bar.
export const FilterField: React.FC<FilterFieldProps> = ({ id, label, children, flex = '0 0 250px', maxWidth }) => {
  const { labelStyle } = useFilterControlStyle();
  return (
    <div style={{ flex, minWidth: 0, maxWidth }}>
      <label htmlFor={id} style={labelStyle}>
        {label}
      </label>
      {children}
    </div>
  );
};
