// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorAlert } from './ui';
import { ApiClientError } from '../api/api-client';

afterEach(() => cleanup());

describe('ErrorAlert', () => {
  it('explains that the server is starting up for SERVER_WAKING_UP errors', async () => {
    const onRetry = vi.fn();
    render(
      <ErrorAlert
        error={new ApiClientError('raw message', 'SERVER_WAKING_UP', 'unknown', 0)}
        onRetry={onRetry}
      />
    );

    expect(screen.getByRole('alert').textContent).toContain('starting up');

    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps showing the backend message for other API errors', () => {
    render(
      <ErrorAlert error={new ApiClientError('Validation failed', 'VALIDATION_ERROR', 'req-1', 422)} />
    );

    expect(screen.getByRole('alert').textContent).toContain('Validation failed');
    expect(screen.getByRole('alert').textContent).not.toContain('starting up');
  });
});
