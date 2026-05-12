from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    AdminStatsView,
    AdminUserListView,
    AdminToggleUserActiveView,
    TaskListView,
    TaskDetailView,
    SaveTaskView,
    SavedTaskListView,
    AdminUploadTaskView,
    AdminTaskListView,
    ConnectMpesaView,
    UserPayoutListView,
    AdminPayoutListView,
    AdminVerifyPayoutView,
    AdminSendPayoutView,
    MpesaCallbackView,
    VerifyEmailView,
    ResendVerificationView,
    UserProfileView,
    EducationView,
    WorkExperienceView,
    DeleteAccountView,
    ChangeEmailView,
    ChangePasswordView
)

urlpatterns = [
    # ── Auth ──
    path('register/',           RegisterView.as_view(),        name='register'),
    path('login/',              LoginView.as_view(),           name='login'),
    path('token/refresh/',      TokenRefreshView.as_view(),    name='token_refresh'),

    # ── Email verification ──
    path('verify-email/',   VerifyEmailView.as_view(),      name='verify-email'),
    path('resend-code/',    ResendVerificationView.as_view(), name='resend-code'),

    # ── Profile ──
    path('profile/',                            UserProfileView.as_view(),    name='profile'),
    path('profile/education/',                  EducationView.as_view(),      name='education'),
    path('profile/education/<int:edu_id>/',     EducationView.as_view(),      name='education-delete'),
    path('profile/experience/',                 WorkExperienceView.as_view(), name='experience'),
    path('profile/experience/<int:exp_id>/',    WorkExperienceView.as_view(), name='experience-delete'),

    # ── Account management ──
    path('account/delete/',          DeleteAccountView.as_view(),   name='delete-account'),
    path('account/change-email/',    ChangeEmailView.as_view(),     name='change-email'),
    path('account/change-password/', ChangePasswordView.as_view(),  name='change-password'),

    # ── Admin user management ──
    path('admin/stats/',                        AdminStatsView.as_view(),           name='admin-stats'),
    path('admin/users/',                        AdminUserListView.as_view(),         name='admin-users'),
    path('admin/users/<int:user_id>/toggle/',   AdminToggleUserActiveView.as_view(), name='admin-toggle-user'),

    # ── Tasks (public) ──
    path('tasks/',                      TaskListView.as_view(),    name='task-list'),
    path('tasks/<int:task_id>/',        TaskDetailView.as_view(),  name='task-detail'),
    path('tasks/<int:task_id>/save/',   SaveTaskView.as_view(),    name='save-task'),
    path('tasks/saved/',                SavedTaskListView.as_view(),name='saved-tasks'),

    # ── Tasks (admin only) ──
    path('admin/tasks/',        AdminTaskListView.as_view(),   name='admin-task-list'),
    path('admin/tasks/upload/', AdminUploadTaskView.as_view(), name='admin-upload-task'),

     # All our API endpoints live in users/urls.py
    path('payment-method/',         ConnectMpesaView.as_view(),      name='connect-mpesa'),

    # ── User payouts ──
    path('payouts/',                UserPayoutListView.as_view(),    name='user-payouts'),

    # ── Admin payouts ──
    path('admin/payouts/',          AdminPayoutListView.as_view(),   name='admin-payouts'),
    path('admin/payouts/<int:payout_id>/verify/', AdminVerifyPayoutView.as_view(), name='verify-payout'),
    path('admin/payouts/<int:payout_id>/send/',   AdminSendPayoutView.as_view(),   name='send-payout'),

    # ── Daraja callback — Safaricom calls this ──
    path('mpesa/callback/result/',  MpesaCallbackView.as_view(),    name='mpesa-callback'),
]