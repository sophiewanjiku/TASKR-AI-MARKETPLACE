from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from .models import Task, SavedTask
from .models import PaymentMethod, Payout
from .models import EmailVerification, UserProfile, Education, WorkExperience
from .models import Notification, Invoice
from .models import Proposal, Submission, Message

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Columns shown in the user list
    list_display = ['email', 'full_name', 'is_staff', 'is_verified', 'is_active', 'date_joined']
    
    # Fields you can search by
    search_fields = ['email', 'full_name']
    
    # Filters on the right side
    list_filter = ['is_staff', 'is_verified', 'is_active']
    
    # Use email instead of username
    ordering = ['-date_joined']

    # What fields show when you open a user
    fieldsets = (
        (None,          {'fields': ('email', 'password')}),
        ('Personal',    {'fields': ('full_name', 'phone_number')}),
        ('Permissions', {'fields': ('is_staff', 'is_superuser', 'is_active', 'is_verified')}),
    )

    # What fields show when creating a new user in admin
    add_fieldsets = (
        (None, {
            'fields': ('email', 'full_name', 'phone_number', 'password1', 'password2'),
        }),
    )

# Makes tasks manageable from the Django admin panel
@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display  = ['title', 'category', 'budget', 'is_published', 'created_at']
    search_fields = ['title', 'description']
    list_filter   = ['category', 'is_published', 'experience', 'job_type']

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    # Note: phone number is encrypted so show account name instead
    list_display = ['user', 'account_name', 'is_verified', 'created_at']
    list_filter  = ['is_verified']

@admin.register(Payout)
class PayoutAdmin(admin.ModelAdmin):
    list_display  = ['user', 'task', 'amount', 'status', 'accuracy_score', 'created_at']
    list_filter   = ['status']
    search_fields = ['user__email', 'task__title']    

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'location', 'is_complete', 'onboarding_step', 'terms_accepted']
    list_filter   = ['is_complete', 'terms_accepted']
    search_fields = ['user__email', 'user__full_name']

@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ['profile', 'degree', 'institution', 'year']

@admin.register(WorkExperience)
class WorkExperienceAdmin(admin.ModelAdmin):
    list_display = ['profile', 'job_title', 'company', 'from_date', 'to_date']

@admin.register(EmailVerification)
class EmailVerificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'code', 'is_used', 'created_at']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display  = ['user', 'title', 'notif_type', 'is_read', 'created_at']
    list_filter   = ['notif_type', 'is_read']
    search_fields = ['user__email', 'title']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display  = ['number', 'user', 'period', 'total', 'status', 'created_at']
    search_fields = ['number', 'user__email']

@admin.register(Proposal)
class ProposalAdmin(admin.ModelAdmin):
    list_display  = ['user', 'task', 'status', 'created_at']
    list_filter   = ['status']
    search_fields = ['user__email', 'task__title']

@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display  = ['proposal', 'status', 'created_at']
    list_filter   = ['status']

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display  = ['sender', 'receiver', 'task', 'is_read', 'created_at']
    list_filter   = ['is_read']
    search_fields = ['sender__email', 'receiver__email']