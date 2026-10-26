from calendar import monthrange
from datetime import date

from django.http import JsonResponse
from django.utils import timezone
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Account, Budget, Category, Transaction
from .permissions import IsOwner
from .serializers import AccountSerializer, BudgetSerializer, CategorySerializer, TransactionSerializer, UserSerializer
from .services import account_balance_minor, budget_spent_minor, budget_spent_minor_for_period, financial_summary


class OwnedModelViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsOwner]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_queryset(self):
        return self.queryset.filter(owner=self.request.user)


class AccountViewSet(OwnedModelViewSet):
    queryset = Account.objects.all()
    serializer_class = AccountSerializer

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        response.data["balance_minor"] = account_balance_minor(self.get_object())
        return response


class CategoryViewSet(OwnedModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class TransactionViewSet(OwnedModelViewSet):
    queryset = Transaction.objects.select_related("account", "category", "transfer_account")
    serializer_class = TransactionSerializer

    def perform_create(self, serializer):
        data = serializer.validated_data
        account = data["account"]
        if account.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot use an account you do not own.")
        category = data.get("category")
        transfer_account = data.get("transfer_account")
        if category and category.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot use a category you do not own.")
        if transfer_account and transfer_account.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot transfer to an account you do not own.")
        serializer.save(owner=self.request.user)


class BudgetViewSet(OwnedModelViewSet):
    queryset = Budget.objects.select_related("category")
    serializer_class = BudgetSerializer

    def perform_create(self, serializer):
        category = serializer.validated_data["category"]
        if category.owner_id != self.request.user.id:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("You cannot budget against a category you do not own.")
        serializer.save(owner=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        budget = self.get_object()
        data = self.get_serializer(budget).data
        data["spent_minor"] = budget_spent_minor(budget)
        data["remaining_minor"] = budget.amount_minor - data["spent_minor"]
        return Response(data)


def _month_bounds(month: date) -> tuple[date, date]:
    return month.replace(day=1), month.replace(day=monthrange(month.year, month.month)[1])


def _budget_period_response(user, period_start: date, period_end: date) -> dict:
    budgets = Budget.objects.filter(
        owner=user,
        period_start__lte=period_end,
        period_end__gte=period_start,
    ).select_related("category")
    serialized_budgets = []
    for budget in budgets:
        data = BudgetSerializer(budget).data
        data["spent_minor"] = budget_spent_minor_for_period(budget, period_start, period_end)
        data["remaining_minor"] = budget.amount_minor - data["spent_minor"]
        serialized_budgets.append(data)
    return {
        "period_start": period_start,
        "period_end": period_end,
        "budgets": serialized_budgets,
        "total_budget_minor": sum(budget["amount_minor"] for budget in serialized_budgets),
        "total_spent_minor": sum(budget["spent_minor"] for budget in serialized_budgets),
        "total_remaining_minor": sum(budget["remaining_minor"] for budget in serialized_budgets),
    }


@api_view(["GET"])
def current_budgets(request):
    period_start, period_end = _month_bounds(timezone.localdate())
    return Response(_budget_period_response(request.user, period_start, period_end))


@api_view(["GET"])
def budgets_for_month(request, month):
    try:
        requested_month = date.fromisoformat(f"{month}-01")
        if len(month) != 7 or month[4] != "-":
            raise ValueError
    except (TypeError, ValueError):
        return Response({"detail": "month must use YYYY-MM format."}, status=status.HTTP_400_BAD_REQUEST)
    period_start, period_end = _month_bounds(requested_month)
    return Response(_budget_period_response(request.user, period_start, period_end))


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    return JsonResponse({"status": "ok"})


@api_view(["GET"])
def me(request):
    return Response(UserSerializer(request.user).data)


@api_view(["GET"])
def summary(request):
    try:
        period_start = date.fromisoformat(request.query_params["start"])
        period_end = date.fromisoformat(request.query_params["end"])
    except (KeyError, ValueError):
        return Response({"detail": "start and end must be ISO-8601 dates (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
    if period_end < period_start:
        return Response({"detail": "end must be on or after start."}, status=status.HTTP_400_BAD_REQUEST)
    return Response(financial_summary(request.user, period_start, period_end))


@api_view(["GET"])
def current_month_summary(request):
    period_start, period_end = _month_bounds(timezone.localdate())
    return Response(financial_summary(request.user, period_start, period_end))

