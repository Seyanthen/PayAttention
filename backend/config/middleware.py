import re
import uuid


_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")


class RequestCorrelationIdMiddleware:
    """Attach a safe correlation ID to every response and request log context."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        candidate = request.headers.get("X-Request-ID", "")
        request.request_id = candidate if _REQUEST_ID_RE.fullmatch(candidate) else uuid.uuid4().hex
        response = self.get_response(request)
        response["X-Request-ID"] = request.request_id
        return response
