import { ApiError, canRetryRequest, getApiErrorFieldErrors, getApiErrorMessage } from './api';

function assertEqual(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

assertEqual(
  getApiErrorFieldErrors(new ApiError('Please check the form and try again.', 'http', { status: 400, fieldErrors: { amount_minor: 'Must be greater than zero.' } })).amount_minor,
  'Must be greater than zero.',
  '400 field error',
);
assertEqual(getApiErrorMessage(new ApiError('', 'http', { status: 401 })), 'Your session has expired. Please log in again.', '401 message');
assertEqual(getApiErrorMessage(new ApiError('', 'http', { status: 403 })), 'You do not have permission to perform that action.', '403 message');
assertEqual(getApiErrorMessage(new ApiError('', 'http', { status: 404 })), 'The requested record could not be found.', '404 message');
assertEqual(getApiErrorMessage(new ApiError('', 'http', { status: 429 })), 'Too many requests. Please wait a moment and try again.', '429 message');
assertEqual(getApiErrorMessage(new ApiError('', 'http', { status: 500 })), 'The service is temporarily unavailable. Please try again.', '500 message');
assertEqual(getApiErrorMessage(new ApiError('', 'timeout')), 'The request timed out. Please try again.', 'timeout message');
assertEqual(getApiErrorMessage(new ApiError('', 'network')), 'Network unavailable. Check your connection and try again.', 'network message');
assertEqual(getApiErrorMessage(new ApiError('', 'aborted')), 'The request was canceled.', 'cancellation message');
assertEqual(getApiErrorMessage(new ApiError('', 'invalid_response')), 'The service returned an invalid response. Please try again.', 'malformed response message');
assertEqual(canRetryRequest({ method: 'GET' }), true, 'GET retry policy');
assertEqual(canRetryRequest({ method: 'POST' }), false, 'POST retry policy');
assertEqual(canRetryRequest({ method: 'PUT' }), false, 'PUT retry policy');
assertEqual(canRetryRequest({ method: 'PATCH' }), false, 'PATCH retry policy');
assertEqual(canRetryRequest({ method: 'DELETE' }), false, 'DELETE retry policy');
