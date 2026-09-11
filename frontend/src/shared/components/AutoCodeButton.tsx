interface AutoCodeButtonProps {
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export function AutoCodeButton({
  onClick,
  title = 'Auto-generate code',
  disabled = false,
}: AutoCodeButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0.4rem 0.65rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        color: '#2563eb',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#dbeafe';
          e.currentTarget.style.borderColor = '#93c5fd';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = '#eff6ff';
          e.currentTarget.style.borderColor = '#bfdbfe';
        }
      }}
    >
      <span>⚡</span>
      <span>Auto Gen</span>
    </button>
  );
}
