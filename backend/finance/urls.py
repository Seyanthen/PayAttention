from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    BudgetViewSet,
    CategoryViewSet,
    RecurringTransactionViewSet,
    TransactionViewSet,
    GoalViewSet,
    budget_performance_report_view,
    budgets_for_month,
    current_budgets,
    current_month_summary,
    cash_flow_report_view,
    category_report_view,
    health,
    monthly_report_view,
    me,
    summary,
    export_transactions,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("budgets", BudgetViewSet, basename="budget")
<<<<<<< Updated upstream
router.register("recurring-transactions", RecurringTransactionViewSet, basename="recurring-transaction")
=======
router.register("goals", GoalViewSet, basename="goal")
>>>>>>> Stashed changes

urlpatterns = [
    path("health/", health, name="health"),
    path("me/", me, name="me"),
    path("summary/", summary, name="summary"),
    path("summary/current-month/", current_month_summary, name="current-month-summary"),
    path("reports/monthly/", monthly_report_view, name="monthly-report"),
    path("reports/categories/", category_report_view, name="category-report"),
    path("reports/cash-flow/", cash_flow_report_view, name="cash-flow-report"),
    path("reports/budget-performance/", budget_performance_report_view, name="budget-performance-report"),
    path("budgets/current/", current_budgets, name="current-budgets"),
    # Accept malformed named months so the view can return a useful 400,
    # while excluding numeric IDs used by the router's budget detail route.
    re_path(r"^budgets/(?P<month>\d{4}-\d{2}|[A-Za-z][A-Za-z0-9-]*)/$", budgets_for_month, name="budgets-for-month"),
    path(
    "transactions/export/",
    export_transactions,
    name="transaction-export",
),
    path("", include(router.urls)),
]

