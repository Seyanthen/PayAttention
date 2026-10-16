import { getAuthToken, setAuthToken } from '@/services/auth';

const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

export type LoginResponse = {
  token: string;
};

export async function login(username: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password,
    }),
  });

  if (!response.ok) {
    throw new Error(response.status === 400 ? 'Invalid username or password.' : 'Unable to reach the login service.');
  }

  const result = (await response.json()) as LoginResponse;
  setAuthToken(result.token);
  return result;
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

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}
