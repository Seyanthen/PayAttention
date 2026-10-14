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

  return response.json() as Promise<LoginResponse>;
}
