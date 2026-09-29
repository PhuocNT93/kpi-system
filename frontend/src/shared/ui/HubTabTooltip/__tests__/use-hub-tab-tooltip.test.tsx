/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useHubTabTooltip } from '../use-hub-tab-tooltip';

const DESCRIPTION = 'Department tree and job catalogues';

function Tabs() {
  const { tabHintProps, renderHintIcon, tooltip } = useHubTabTooltip();
  return (
    <div>
      <button type="button" {...tabHintProps(DESCRIPTION)}>
        Organization
        {renderHintIcon(DESCRIPTION)}
      </button>
      {tooltip}
    </div>
  );
}

describe('useHubTabTooltip', () => {
  afterEach(() => cleanup());

  it('opens the tooltip only while the pointer is on the info icon', () => {
    render(<Tabs />);
    const tab = screen.getByRole('button', { name: 'Organization' });

    fireEvent.mouseEnter(tab);
    fireEvent.focus(tab);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    const icon = screen.getByTestId('hub-tab-hint-icon');
    fireEvent.mouseEnter(icon);
    expect(screen.getByRole('tooltip')).toHaveTextContent(DESCRIPTION);
    fireEvent.mouseLeave(icon);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('exposes the description to assistive technology without adding it to the tab name', () => {
    render(<Tabs />);
    expect(screen.getByRole('button', { name: 'Organization' })).toHaveAttribute('aria-description', DESCRIPTION);
  });
});
