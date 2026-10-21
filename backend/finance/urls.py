from django.urls import include, path, re_path
from rest_framework.routers import DefaultRouter

from .views import (
    AccountViewSet,
    BudgetViewSet,
    CategoryViewSet,
    TransactionViewSet,
    budgets_for_month,
    current_budgets,
    current_month_summary,
    health,
    me,
    summary,
)

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("budgets", BudgetViewSet, basename="budget")

urlpatterns = [
    path("health/", health, name="health"),
    path("me/", me, name="me"),
    path("summary/", summary, name="summary"),
    path("summary/current-month/", current_month_summary, name="current-month-summary"),
    path("budgets/current/", current_budgets, name="current-budgets"),
    # Accept malformed named months so the view can return a useful 400,
    # while excluding numeric IDs used by the router's budget detail route.
    re_path(r"^budgets/(?P<month>\d{4}-\d{2}|[A-Za-z][A-Za-z0-9-]*)/$", budgets_for_month, name="budgets-for-month"),
    path("", include(router.urls)),
]

