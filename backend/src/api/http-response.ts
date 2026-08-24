/**
 * http-response — typed envelope helpers for all API responses.
 *
 * Contract (BACKEND_NODE_RULES §4):
 *   { "success": true|false, "message": "string", "data": …, "meta": {} }
 *
 * Success variants:
 *   sendSuccess(res, 200, msg, object)      → single-resource / command result
 *   sendCollection(res, msg, items, page)   → paginated list
 *   sendCreated(res, msg, object, location) → 201 + Location header
 *   sendAccepted(res, msg, object)          → 202 async job
 *   sendDeleted(res, msg)                   → 200 delete confirmation
 *
 * Failure variant:
 *   sendFailure(res, status, msg, code, field?, details?)
 *
 * All helpers set X-Request-ID (via requestIdMiddleware) and include
 * meta.request_id + meta.timestamp on every response.
 */

import type { Response } from 'express';
import type { ValidationDetail } from './app-error.js';

// ── Meta shapes ───────────────────────────────────────────────────────────────

export interface PageMeta {
  number: number;
  size: number;
  total_items: number;
  total_pages: number;
}

export interface ErrorMeta {
  code: string;
  field: string | null;
  details: ValidationDetail[];
}

export interface ResponseMeta {
  request_id: string;
  timestamp: string;
  page?: PageMeta;
  error?: ErrorMeta;
}

// ── Top-level envelope ────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta: ResponseMeta;
}

// ── Internal helper ───────────────────────────────────────────────────────────

function baseMeta(response: Response): ResponseMeta {
  return {
    request_id: response.locals.requestId as string,
    timestamp: new Date().toISOString()
  };
}

// ── Success senders ───────────────────────────────────────────────────────────

/**
 * Single resource or command result.
 * Default status 200; pass 201 when creating via sendCreated instead.
 */
export function sendSuccess<T>(response: Response, statusCode: number, message: string, data: T): void {
  response.status(statusCode).json({
    success: true,
    message,
    data,
    meta: baseMeta(response)
  } satisfies ApiResponse<T>);
}

/**
 * Paginated collection — always 200.
 * `page.number` and `page.size` come from the validated query; `total_*` from the repository.
 */
export function sendCollection<T>(
  response: Response,
  message: string,
  data: T[],
  page: PageMeta
): void {
  response.status(200).json({
    success: true,
    message,
    data,
    meta: {
      ...baseMeta(response),
      page
    }
  } satisfies ApiResponse<T[]>);
}

/**
 * Resource created — 201 with Location header.
 */
export function sendCreated<T>(response: Response, message: string, data: T, location: string): void {
  response.setHeader('Location', location);
  response.status(201).json({
    success: true,
    message,
    data,
    meta: baseMeta(response)
  } satisfies ApiResponse<T>);
}

/**
 * Asynchronous job accepted — 202.
 */
export function sendAccepted<T>(response: Response, message: string, data: T): void {
  response.status(202).json({
    success: true,
    message,
    data,
    meta: baseMeta(response)
  } satisfies ApiResponse<T>);
}

/**
 * Successful delete — 200 with data: null.
 */
export function sendDeleted(response: Response, message: string): void {
  response.status(200).json({
    success: true,
    message,
    data: null,
    meta: baseMeta(response)
  } satisfies ApiResponse<null>);
}

// ── Failure sender ────────────────────────────────────────────────────────────

/**
 * Any non-2xx outcome.
 * `code`    — stable SCREAMING_SNAKE_CASE error identifier.
 * `field`   — affected snake_case request field, or null.
 * `details` — per-field validation errors (validation failures only).
 */
export function sendFailure(
  response: Response,
  statusCode: number,
  message: string,
  code: string,
  field: string | null = null,
  details: ValidationDetail[] = []
): void {
  response.status(statusCode).json({
    success: false,
    message,
    data: null,
    meta: {
      ...baseMeta(response),
      error: { code, field, details }
    }
  } satisfies ApiResponse<null>);
}
