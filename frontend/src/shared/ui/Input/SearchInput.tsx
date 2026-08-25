import React, { useState } from 'react';
import { COLORS } from '@/lib/theme';
import { RADII, TYPOGRAPHY } from '@/shared/theme';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
  wrapperStyle?: React.CSSProperties;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = 'Search',
  value,
  onChange,
  onSearch,
  disabled,
  wrapperStyle,
  style,
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [internalValue, setInternalValue] = useState(value ?? '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInternalValue(e.target.value);
    onChange?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearch?.(String(internalValue));
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        maxWidth: '380px',
        backgroundColor: COLORS.neutral.white,
        borderRadius: RADII.md,
        border: `1.5px solid ${isFocused ? COLORS.primary.DEFAULT : COLORS.neutral.border}`,
        boxShadow: isFocused ? `0 0 0 3px ${COLORS.primary[100]}` : 'none',
        transition: 'all 0.18s ease-in-out',
        padding: '8px 14px',
        gap: '10px',
        ...wrapperStyle
      }}
    >
      {/* Search SVG Icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke={isFocused ? COLORS.primary.DEFAULT : COLORS.neutral.textSecondary}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, transition: 'stroke 0.18s ease' }}
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? internalValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          border: 'none',
          outline: 'none',
          backgroundColor: 'transparent',
          width: '100%',
          fontFamily: TYPOGRAPHY.fontFamily.body,
          fontSize: TYPOGRAPHY.fontSize.sm,
          color: COLORS.neutral.textPrimary,
          ...style
        }}
        {...rest}
      />
    </div>
  );
};
