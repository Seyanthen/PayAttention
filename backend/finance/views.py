from calendar import monthrange
from datetime import date
import re
import csv
from django.http import HttpResponse, JsonResponse

from django.http import JsonResponse
from django.utils import timezone
from django.db.models import Q, IntegerField, Sum, Value
from django.db.models.functions import Coalesce
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import Account, Budget, Category, Goal, RecurringTransaction, Transaction
from .permissions import IsOwner
from .serializers import AccountSerializer, BudgetSerializer, CategorySerializer, GoalSerializer, RecurringTransactionSerializer, TransactionSerializer, UserSerializer
from .services import account_balance_minor, budget_performance_report, budget_spent_minor, budget_spent_minor_for_period, category_report, cash_flow_report, financial_summary, goal_progress, monthly_report


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

    @staticmethod
    def _parse_id(value, field_name):
        if not re.fullmatch(r"[1-9]\d*", value or ""):
            raise serializers.ValidationError({field_name: "Must be a positive integer ID."})
        return int(value)

    @staticmethod
    def _parse_date(value, field_name):
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value or ""):
            raise serializers.ValidationError({field_name: "Must use YYYY-MM-DD format."})
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise serializers.ValidationError({field_name: "Must be a valid calendar date."}) from exc

    @staticmethod
    def _parse_minor_units(value, field_name):
        if not re.fullmatch(r"\d+", value or ""):
            raise serializers.ValidationError({field_name: "Must be a non-negative integer number of minor units."})
        return int(value)

    def get_queryset(self):
        queryset = super().get_queryset()
        params = self.request.query_params

        search = params.get("search", "").strip()
        if search:
            queryset = queryset.filter(Q(merchant__icontains=search) | Q(note__icontains=search))

        if params.get("account"):
            queryset = queryset.filter(account_id=self._parse_id(params.get("account"), "account"))
        if params.get("category"):
            queryset = queryset.filter(category_id=self._parse_id(params.get("category"), "category"))
        if params.get("transaction_type"):
            transaction_type = params.get("transaction_type")
            valid_types = {choice for choice, _ in Transaction.TransactionType.choices}
            if transaction_type not in valid_types:
                raise serializers.ValidationError({"transaction_type": "Unsupported transaction type."})
            queryset = queryset.filter(transaction_type=transaction_type)

        start_date = self._parse_date(params.get("start_date"), "start_date") if params.get("start_date") else None
        end_date = self._parse_date(params.get("end_date"), "end_date") if params.get("end_date") else None
        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError({"end_date": "Must be on or after start_date."})
        if start_date:
            queryset = queryset.filter(occurred_on__gte=start_date)
        if end_date:
            queryset = queryset.filter(occurred_on__lte=end_date)

        min_amount = self._parse_minor_units(params.get("min_amount_minor"), "min_amount_minor") if params.get("min_amount_minor") else None
        max_amount = self._parse_minor_units(params.get("max_amount_minor"), "max_amount_minor") if params.get("max_amount_minor") else None
        if min_amount is not None and max_amount is not None and min_amount > max_amount:
            raise serializers.ValidationError({"max_amount_minor": "Must be greater than or equal to min_amount_minor."})
        if min_amount is not None:
            queryset = queryset.filter(amount_minor__gte=min_amount)
        if max_amount is not None:
            queryset = queryset.filter(amount_minor__lte=max_amount)

        return queryset

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


class RecurringTransactionViewSet(OwnedModelViewSet):
    queryset = RecurringTransaction.objects.all()
    serializer_class = RecurringTransactionSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.request.query_params.get("active") == "true":
            queryset = queryset.filter(is_active=True)
        return queryset.order_by("next_occurrence", "name", "id")
class GoalViewSet(OwnedModelViewSet):
    queryset = Goal.objects.all()
    serializer_class = GoalSerializer

    def get_queryset(self):
        return super().get_queryset().annotate(current_amount_minor=Coalesce(Sum("contributions__amount_minor"), Value(0), output_field=IntegerField()))

    def _response_data(self, goal):
        data = self.get_serializer(goal).data
        data.update(goal_progress(goal))
        return data

    def list(self, request, *args, **kwargs):
        return Response([self._response_data(goal) for goal in self.filter_queryset(self.get_queryset())])

    def retrieve(self, request, *args, **kwargs):
        return Response(self._response_data(self.get_object()))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(self._response_data(self.get_queryset().get(pk=serializer.instance.pk)), status=status.HTTP_201_CREATED, headers=self.get_success_headers(serializer.data))

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(self._response_data(self.get_queryset().get(pk=instance.pk)))


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


@api_view(["GET"])
def export_transactions(request):
    start_value = request.query_params.get("start_date")
    end_value = request.query_params.get("end_date")

    if not start_value:
        return Response(
            {"detail": "start_date is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        period_start = date.fromisoformat(start_value)
        period_end = date.fromisoformat(
            end_value or timezone.localdate().isoformat()
        )
    except ValueError:
        return Response(
            {"detail": "Dates must use YYYY-MM-DD format."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if period_end < period_start:
        return Response(
            {"detail": "end_date must be on or after start_date."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    transactions = (
        Transaction.objects
        .filter(
            owner=request.user,
            occurred_on__gte=period_start,
            occurred_on__lte=period_end,
        )
        .select_related("category")
        .order_by("occurred_on", "id")
    )

    response = HttpResponse(
        content_type="text/csv; charset=utf-8"
    )
    response["Content-Disposition"] = (
        'attachment; filename="transactions.csv"'
    )

    writer = csv.writer(response)
    writer.writerow(["Date", "Description", "Amount", "Category"])

    for transaction in transactions:
        amount = transaction.amount_minor / 100

        if transaction.transaction_type == "expense":
            amount *= -1

        writer.writerow([
            transaction.occurred_on.strftime("%m/%d/%y"),
            transaction.merchant or transaction.note,
            f"{amount:.2f}",
            transaction.category.name
            if transaction.category
            else "",
        ])

    return response
def _report_dates(request):
    try:
        start_value = request.query_params["start"]
        end_value = request.query_params["end"]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", start_value) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", end_value):
            raise ValueError
        period_start = date.fromisoformat(start_value)
        period_end = date.fromisoformat(end_value)
    except (KeyError, TypeError, ValueError):
        return None, None, Response({"detail": "start and end must be ISO-8601 dates (YYYY-MM-DD)."}, status=status.HTTP_400_BAD_REQUEST)
    if period_end < period_start:
        return None, None, Response({"detail": "end must be on or after start."}, status=status.HTTP_400_BAD_REQUEST)
    return period_start, period_end, None


@api_view(["GET"])
def monthly_report_view(request):
    start, end, error = _report_dates(request)
    return error or Response(monthly_report(request.user, start, end))


@api_view(["GET"])
def category_report_view(request):
    start, end, error = _report_dates(request)
    return error or Response(category_report(request.user, start, end))


@api_view(["GET"])
def cash_flow_report_view(request):
    start, end, error = _report_dates(request)
    return error or Response(cash_flow_report(request.user, start, end))


@api_view(["GET"])
def budget_performance_report_view(request):
    start, end, error = _report_dates(request)
    return error or Response(budget_performance_report(request.user, start, end))

