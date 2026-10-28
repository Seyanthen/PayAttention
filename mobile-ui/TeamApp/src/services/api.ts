import {
  clearAuthToken,
  clearPersistedAuthToken,
  getAuthToken,
  isMockAuthenticated,
  persistAuthToken,
  setAuthToken,
} from '@/services/auth';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

function configuredTimeoutMs(): number {
  const value = Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_REQUEST_TIMEOUT_MS;
}

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = configuredTimeoutMs();

export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'mock' | 'invalid_response';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly retryable: boolean;
  readonly fieldErrors: Record<string, string>;

  constructor(
    message: string,
    kind: ApiErrorKind,
    options: { status?: number; retryable?: boolean; fieldErrors?: Record<string, string> } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.retryable = options.retryable ?? kind !== 'http';
    this.fieldErrors = options.fieldErrors ?? {};
  }
}

export type LoginResponse = {
  token: string;
};

export function canRetryRequest(options: RequestInit = {}): boolean {
  return (options.method ?? 'GET').toUpperCase() === 'GET';
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function getHttpErrorMessage(status: number, fallback: string): string {
  if (status === 400) {
    return fallback || 'Please check the form and try again.';
  }
  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform that action.';
  }
  if (status === 404) {
    return 'The requested record could not be found.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'The service is temporarily unavailable. Please try again.';
  }
  return fallback || 'The request could not be completed. Please try again.';
}

type ErrorBody = { detail?: string; fieldErrors: Record<string, string> };

function safeString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) return safeString(value[0]);
  return undefined;
}

async function readErrorBody(response: Response): Promise<ErrorBody> {
  const result: ErrorBody = { fieldErrors: {} };
  try {
    const body: unknown = await response.clone().json();
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      result.detail = safeString(body.detail);
    }
    if (typeof body === 'object' && body !== null) {
      for (const [field, value] of Object.entries(body)) {
        if (field === 'detail') continue;
        const message = safeString(value);
        if (message) result.fieldErrors[field] = message;
      }
    }
  } catch {
    // Some server/proxy failures return HTML or an empty body.
  }
  return result;
}

async function request(path: string, options: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  const callerSignal = options.signal;
  const abortFromCaller = () => controller.abort();
  callerSignal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await readErrorBody(response);
      throw new ApiError(
        getHttpErrorMessage(response.status, errorBody.detail ?? ''),
        'http',
        {
          status: response.status,
          fieldErrors: errorBody.fieldErrors,
          retryable: response.status >= 500 || response.status === 429,
        },
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (timedOut) {
      throw new ApiError('The request timed out. Please try again.', 'timeout');
    }
    if (callerSignal?.aborted || isAbortError(error)) {
      throw new ApiError('The request was canceled.', 'aborted', { retryable: false });
    }
    throw new ApiError('Unable to connect to the service. Check your connection and try again.', 'network');
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof ApiError) {
    if (error.kind === 'network') return 'Network unavailable. Check your connection and try again.';
    if (error.kind === 'timeout') return 'The request timed out. Please try again.';
    if (error.kind === 'aborted') return 'The request was canceled.';
    if (error.kind === 'mock') return 'API-backed features require real authentication. Disable Testing Bypass and log in.';
    if (error.kind === 'invalid_response') return 'The service returned an invalid response. Please try again.';
    return error.message || fallback;
  }
  return fallback;
}

export function getApiErrorFieldErrors(error: unknown): Record<string, string> {
  return error instanceof ApiError ? error.fieldErrors : {};
}

export async function login(username: string, password: string): Promise<LoginResponse> {
  try {
    const response = await request('/auth/token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null || !('token' in result) || typeof result.token !== 'string' || !result.token) {
      throw new ApiError('The service returned an invalid response. Please try again.', 'invalid_response', { retryable: false });
    }
    const loginResult = result as LoginResponse;
    setAuthToken(loginResult.token);
    try {
      await persistAuthToken(loginResult.token);
    } catch {
      clearAuthToken();
      throw new Error('Unable to save your login securely. Please try again.');
    }
    return loginResult;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      throw new ApiError('Invalid username or password.', 'http', { status: 400, retryable: false });
    }
    throw error;
  }
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  if (isMockAuthenticated()) {
    throw new ApiError('API-backed features require real authentication.', 'mock', { retryable: false });
  }

  const token = getAuthToken();

  if (!token) {
    throw new ApiError('Your session has expired. Please log in again.', 'http', { status: 401, retryable: false });
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Token ${token}`);

  try {
    return await request(path, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearAuthToken();
      await clearPersistedAuthToken();
    }
    throw error;
  }
}

/**
 * Performs one safe GET request. A screen-level Retry action should call this
 * again after the user presses Retry; mutations must not be retried.
 */
export function authenticatedGet(path: string, options: Omit<RequestInit, 'method' | 'body'> = {}) {
  return authenticatedFetch(path, { ...options, method: 'GET' });
}
