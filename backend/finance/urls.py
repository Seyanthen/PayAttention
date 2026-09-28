from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AccountViewSet, BudgetViewSet, CategoryViewSet, TransactionViewSet, health, me, summary

router = DefaultRouter()
router.register("accounts", AccountViewSet, basename="account")
router.register("categories", CategoryViewSet, basename="category")
router.register("transactions", TransactionViewSet, basename="transaction")
router.register("budgets", BudgetViewSet, basename="budget")

urlpatterns = [
    path("health/", health, name="health"),
    path("me/", me, name="me"),
    path("summary/", summary, name="summary"),
    path("", include(router.urls)),
]

