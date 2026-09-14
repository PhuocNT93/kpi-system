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
});
