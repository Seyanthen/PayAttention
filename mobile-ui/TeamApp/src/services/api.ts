import { clearAuthToken, getAuthToken, setAuthToken } from '@/services/auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';
const REQUEST_TIMEOUT_MS = 10_000;

export type ApiErrorKind = 'network' | 'timeout' | 'aborted' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    kind: ApiErrorKind,
    options: { status?: number; retryable?: boolean } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = options.status;
    this.retryable = options.retryable ?? kind !== 'http';
  }
}

export type LoginResponse = {
  token: string;
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function getHttpErrorMessage(status: number, fallback: string): string {
  if (status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  if (status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (status >= 500) {
    return 'The service is temporarily unavailable. Please try again.';
  }
  return fallback;
}

async function readErrorDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.clone().json();
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      const detail = body.detail;
      return typeof detail === 'string' ? detail : undefined;
    }
  } catch {
    // Some server/proxy failures return HTML or an empty body.
  }
  return undefined;
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
      const detail = await readErrorDetail(response);
      throw new ApiError(
        getHttpErrorMessage(response.status, detail ?? `Request failed with status ${response.status}.`),
        'http',
        { status: response.status, retryable: response.status >= 500 || response.status === 429 },
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
    return error.message;
  }
  return error instanceof Error ? error.message : fallback;
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

    const result = (await response.json()) as LoginResponse;
    setAuthToken(result.token);
    return result;
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
  const token = getAuthToken();

  if (!token) {
    throw new Error('Authentication required.');
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
    }
    throw error;
  }
}
