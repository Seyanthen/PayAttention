from django.contrib import admin

from .models import Account, Budget, Category, Transaction

admin.site.register([Account, Budget, Category, Transaction])

