// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UserGuidePage } from './UserGuidePage';

afterEach(() => cleanup());

describe('UserGuidePage', () => {
  it('renders the user guide content with its top-level heading', () => {
    render(<UserGuidePage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Hệ thống Quản lý Đánh giá Hiệu suất Nhân viên/ })
    ).toBeInTheDocument();
  });

  it('renders a status reference table from the guide', () => {
    render(<UserGuidePage />);

    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThan(0);
  });

  it('switches documentation language when locale change event is fired', async () => {
    const { act } = await import('@testing-library/react');
    render(<UserGuidePage />);

    // Initially renders Vietnamese
    expect(screen.getByRole('heading', { level: 2, name: /Hướng dẫn sử dụng chi tiết/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Đối tượng sử dụng/i })).toBeInTheDocument();

    // Switch to English via Header event
    act(() => {
      window.dispatchEvent(new CustomEvent('kpi_locale_changed', { detail: 'en' }));
    });

    expect(screen.getByRole('heading', { level: 2, name: /Detailed User Guide/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Target Audience/i })).toBeInTheDocument();

    // Switch back to Vietnamese via Header event
    act(() => {
      window.dispatchEvent(new CustomEvent('kpi_locale_changed', { detail: 'vi' }));
    });

    expect(screen.getByRole('heading', { level: 2, name: /Hướng dẫn sử dụng chi tiết/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Đối tượng sử dụng/i })).toBeInTheDocument();
  });
});
