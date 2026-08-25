/// <reference types="vitest/globals" />
import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { iamHandlers } from './__mocks__/iam-handlers';

export const mswServer = setupServer(...iamHandlers);

beforeAll(() => mswServer.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());
