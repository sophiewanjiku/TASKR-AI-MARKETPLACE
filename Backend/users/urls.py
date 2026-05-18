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
    ChangePasswordView,
    NotificationListView,
    MarkNotificationReadView,
    InvoiceListView,
    CompletedJobsView,
    SubmitProposalView,
    UserProposalListView,
    WithdrawProposalView,
    OngoingJobsView,
    OngoingJobDetailView,
    SubmitWorkView,
    ConversationListView,
    MessageThreadView,
    SendMessageView,
    AdminProposalListView,
    AdminReviewProposalView,
    AdminTaskDetailView,
    AdminPendingReviewView,
    AdminReviewSubmissionView,
    AdminUserDetailView,
    AdminVerificationQueueView,
    AdminAnalyticsView,
    AdminRevenueReportView,
    AdminSettingsView,
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

    # ── Notifications ──
    path('notifications/',       NotificationListView.as_view(),     name='notifications'),
    path('notifications/read/',  MarkNotificationReadView.as_view(), name='mark-read'),

    # ── Invoices & Reports ──
    path('invoices/', InvoiceListView.as_view(),          name='invoices'),

    # ── Completed Jobs ──
    path('completed-jobs/', CompletedJobsView.as_view(),        name='completed-jobs'),

    # ── Proposals ──
    path('proposals/', UserProposalListView.as_view(),   name='proposals'),
    path('proposals/<int:proposal_id>/withdraw/', WithdrawProposalView.as_view(), name='withdraw-proposal'),
    path('tasks/<int:task_id>/apply/', SubmitProposalView.as_view(),     name='apply-task'),

    # ── Ongoing jobs ──
    path('ongoing-jobs/', OngoingJobsView.as_view(),        name='ongoing-jobs'),
    path('ongoing-jobs/<int:proposal_id>/', OngoingJobDetailView.as_view(),   name='ongoing-job-detail'),
    path('ongoing-jobs/<int:proposal_id>/submit/', SubmitWorkView.as_view(),      name='submit-work'),

    # ── Messages ──
    path('messages/', ConversationListView.as_view(),   name='conversations'),
    path('messages/<int:other_user_id>/', MessageThreadView.as_view(),      name='message-thread'),
    path('messages/send/', SendMessageView.as_view(),        name='send-message'),

    # ── Admin proposals ──
    path('admin/proposals/', AdminProposalListView.as_view(),   name='admin-proposals'),
    path('admin/proposals/<int:proposal_id>/review/',   AdminReviewProposalView.as_view(), name='admin-review-proposal'),

    # ── Admin task management ──
    path('admin/tasks/<int:task_id>/', AdminTaskDetailView.as_view(),      name='admin-task-detail'),

    # ── Admin pending review ──
    path('admin/review/', AdminPendingReviewView.as_view(),   name='admin-review'),
    path('admin/review/<int:submission_id>/', AdminReviewSubmissionView.as_view(),name='admin-review-submission'),

    # ── Admin user detail ──
    path('admin/users/<int:user_id>/', AdminUserDetailView.as_view(),      name='admin-user-detail'),

    # ── Admin verification queue ──
    path('admin/verification/', AdminVerificationQueueView.as_view(), name='admin-verification'),
    path('admin/verification/<int:user_id>/', AdminVerificationQueueView.as_view(), name='admin-verify-user'),

    # ── Admin analytics ──
    path('admin/analytics/', AdminAnalyticsView.as_view(),       name='admin-analytics'),

    # ── Admin revenue reports ──
    path('admin/revenue/', AdminRevenueReportView.as_view(),   name='admin-revenue'),

    # ── Admin settings ──
    path('admin/settings/', AdminSettingsView.as_view(),        name='admin-settings'),
    ]