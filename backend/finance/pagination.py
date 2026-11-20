from rest_framework.pagination import LimitOffsetPagination


class OptionalLimitOffsetPagination(LimitOffsetPagination):
    """Preserve legacy list responses while enabling bounded pagination on demand."""

    default_limit = 50
    max_limit = 100

    def paginate_queryset(self, queryset, request, view=None):
        if "limit" not in request.query_params and "offset" not in request.query_params:
            return None
        return super().paginate_queryset(queryset, request, view)
