# API networking

Set `EXPO_PUBLIC_API_BASE_URL` and `EXPO_PUBLIC_API_TIMEOUT_MS` in `.env` for the target runtime. The default `127.0.0.1` reaches the host machine from web and local simulators, but usually does not reach the host from a physical device or Android emulator.

- Android emulator: use `http://10.0.2.2:8000/api/v1`.
- Physical device: use the development machine's LAN IP, such as `http://192.168.1.20:8000/api/v1`.
- Production: use the deployed HTTPS API URL.

Retry only safe GET requests from a user-triggered screen action. Financial POST, PUT, PATCH, and DELETE requests are never automatically retried.
