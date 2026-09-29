/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SubTabs } from '../SubTabs';

describe('SubTabs', () => {
  afterEach(() => cleanup());

  it('marks the active tab and reports clicks', () => {
    const onChange = vi.fn();
    render(
      <SubTabs
        ariaLabel="Sections"
        value="roles"
        onChange={onChange}
        items={[
          { id: 'users', label: 'Users' },
          { id: 'roles', label: 'Roles' },
          { id: 'permissions', label: 'Permissions' },
        ]}
      />
    );

    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Roles' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(screen.getByRole('tab', { name: 'Permissions' }));
    expect(onChange).toHaveBeenCalledWith('permissions');
  });

  it('gives level 2 a segmented track and level 3 pill-shaped tabs', () => {
    const items = [
      { id: 'a', label: 'First' },
      { id: 'b', label: 'Second' },
    ];
    const { unmount } = render(<SubTabs ariaLabel="Level two" value="a" onChange={vi.fn()} items={items} />);
    expect(screen.getByRole('tablist', { name: 'Level two' })).toHaveStyle({ borderRadius: '10px', padding: '4px' });
    expect(screen.getByRole('tab', { name: 'First' })).toHaveStyle({ borderRadius: '8px' });
    unmount();

    render(<SubTabs level={3} ariaLabel="Level three" value="a" onChange={vi.fn()} items={items} actions={<button>Create</button>} />);
    expect(screen.getByRole('tab', { name: 'First' })).toHaveStyle({ borderRadius: '999px' });
    // Actions sit next to the tabs but outside the tablist.
    expect(screen.getByRole('tablist', { name: 'Level three' })).not.toContainElement(screen.getByRole('button', { name: 'Create' }));
  });
});
