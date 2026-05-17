# Views handle incoming HTTP requests and return responses
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import RegisterSerializer, UserSerializer
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from django.db import models as django_models
from django.db.models import Q
from .models import Task, SavedTask
from .serializers import TaskSerializer
from .mpesa import send_b2c_payment, get_access_token
from .encryption import mask_phone
from .models import PaymentMethod, Payout
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings as django_settings
from .models import EmailVerification, UserProfile, Education, WorkExperience
from .serializers import UserProfileSerializer
from datetime import date
from .models import Notification, Invoice
from datetime import datetime
import calendar
from decimal import Decimal
from .models import Proposal, Submission, Message

User = get_user_model()


def create_notification(user, title, body, notif_type='system'):
    """
    Helper to create a notification for a user.
    Call this anywhere in the codebase when something notable happens.
    e.g. create_notification(user, 'Payout sent', '$95 sent to M-Pesa', 'payment')
    """
    Notification.objects.create(
        user       = user,
        title      = title,
        body       = body,
        notif_type = notif_type,
    )

# Handles POST /api/auth/register/
class RegisterView(APIView):
    # Allow anyone to access this endpoint (no login required)
    permission_classes = [AllowAny]

    def post(self, request):
        # Pass the incoming request data into the registration serializer
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            # Save the new user to the database
            user = serializer.save()

            # Send verification email immediately after registration
            send_verification_email(user)

            # Create an empty profile ready for onboarding
            UserProfile.objects.create(user=user)
            
            # Generate a JWT refresh token for the newly registered user
            refresh = RefreshToken.for_user(user)
            
            # Return the user's info along with both tokens
            return Response({
                'user': UserSerializer(user).data,   # Safe user info (no password)
                'refresh': str(refresh),              # Long-lived token for getting new access tokens
                'access': str(refresh.access_token), # Short-lived token for authenticating requests
            }, status=status.HTTP_201_CREATED)
        
        # If validation fails, return the errors so the frontend can display them
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# Handles POST /api/auth/login/
class LoginView(APIView):
    # Allow anyone to access this endpoint (no login required)
    permission_classes = [AllowAny]

    def post(self, request):
        # Extract email and password from the request body
        email = request.data.get('email')
        password = request.data.get('password')
        
        # Verify the credentials against the database
        # authenticate() returns the user object if valid, or None if not
        user = authenticate(request, username=email, password=password)

        if user:
            # Credentials are correct — generate fresh JWT tokens
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        
        # Credentials don't match — return a 401 Unauthorized error
        return Response(
            {'error': 'Invalid email or password'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Returns platform-wide stats for the admin dashboard
# Only accessible by admin users (is_staff=True)
class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response({
            # Count all registered users
            'total_users': User.objects.count(),

            # Count only verified users
            'verified_users': User.objects.filter(is_verified=True).count(),

            # Count flagged/inactive accounts
            'flagged_users': User.objects.filter(is_active=False).count(),
        })

# Returns a list of all users for the admin user management table
# Only accessible by admin users
class AdminUserListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Get all users, most recently joined first
        users = User.objects.all().order_by('-date_joined')

        # Serialize each user into a safe dictionary
        data = [
            {
                'id': u.id,
                'full_name': u.full_name,
                'email': u.email,
                'phone_number': u.phone_number,
                'is_verified': u.is_verified,
                'is_active': u.is_active,
                'date_joined': u.date_joined,
            }
            for u in users
        ]
        return Response(data)

# Allows admin to toggle a user's active status (flag/unflag account)
class AdminToggleUserActiveView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, user_id):
        try:
            # Find the user by their ID
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        # Flip the active status — True becomes False and vice versa
        user.is_active = not user.is_active
        user.save()

        return Response({
            'id': user.id,
            'is_active': user.is_active,
            'message': f"User {'activated' if user.is_active else 'deactivated'} successfully"
        })
# Returns all published tasks, with optional search and filter support
class TaskListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        # Start with all published tasks
        tasks = Task.objects.filter(is_published=True).order_by('-created_at')

        # Search by title or description if query param provided
        search = request.query_params.get('search')
        if search:
            tasks = tasks.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )

        # Filter by category
        category = request.query_params.get('category')
        if category:
            tasks = tasks.filter(category=category)

        # Filter by data type
        data_type = request.query_params.get('data_type')
        if data_type:
            tasks = tasks.filter(data_type=data_type)

        # Filter by job type
        job_type = request.query_params.get('job_type')
        if job_type:
            tasks = tasks.filter(job_type=job_type)

        # Filter by experience level
        experience = request.query_params.get('experience')
        if experience:
            tasks = tasks.filter(experience=experience)

        # Filter by max budget
        max_budget = request.query_params.get('max_budget')
        if max_budget:
            tasks = tasks.filter(budget__lte=max_budget)

        # Filter by project length
        project_length = request.query_params.get('project_length')
        if project_length:
            tasks = tasks.filter(project_length=project_length)

        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)

# Returns a single task by ID
class TaskDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id, is_published=True)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=404)

        serializer = TaskSerializer(task)
        return Response(serializer.data)

# Saves or unsaves a task for the logged-in user (toggle)
class SaveTaskView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=404)

        # Check if already saved — if so, unsave it
        existing = SavedTask.objects.filter(user=request.user, task=task).first()
        if existing:
            existing.delete()
            return Response({'saved': False, 'message': 'Task removed from saved jobs'})

        # Otherwise save it
        SavedTask.objects.create(user=request.user, task=task)
        return Response({'saved': True, 'message': 'Task saved successfully'})

# Returns all saved tasks for the logged-in user
class SavedTaskListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all saved task IDs for this user
        saved = SavedTask.objects.filter(user=request.user).values_list('task_id', flat=True)
        tasks = Task.objects.filter(id__in=saved, is_published=True)
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data)    
# Admin only — creates a new task from the upload form
class AdminUploadTaskView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        # Convert the skills list from frontend back to a comma-separated string
        skills_input = request.data.get('skills', [])
        if isinstance(skills_input, list):
            skills_str = ', '.join(skills_input)
        else:
            skills_str = skills_input

        # Create the task with all fields from the form
        task = Task.objects.create(
            title                = request.data.get('title'),
            description          = request.data.get('description'),
            category             = request.data.get('category'),
            data_type            = request.data.get('data_type'),
            job_type             = request.data.get('job_type', 'fixed'),
            experience           = request.data.get('experience', 'entry'),
            project_length       = request.data.get('project_length', '1_4_weeks'),
            budget               = request.data.get('budget'),
            hours_per_week       = request.data.get('hours_per_week') or None,
            skills               = skills_str,
            instructions         = request.data.get('instructions', ''),
            is_published         = request.data.get('is_published', True),
            allow_multiple       = request.data.get('allow_multiple', False),
            require_verification = request.data.get('require_verification', True),
            posted_by            = request.user,
        )

        serializer = TaskSerializer(task)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

# Admin only — returns all tasks including unpublished drafts
class AdminTaskListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Admin sees all tasks, not just published ones
        tasks = Task.objects.all().order_by('-created_at')
        serializer = TaskSerializer(tasks, many=True)
        return Response(serializer.data) 
# ── USER: Connect M-Pesa account ──
class ConnectMpesaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        phone   = request.data.get('phone_number', '').strip()
        name    = request.data.get('account_name', 'My M-Pesa')

        # Basic phone validation — must start with 254 and be 12 digits
        phone_clean = phone.replace('+', '').replace(' ', '')
        if not phone_clean.startswith('254') or len(phone_clean) != 12:
            return Response(
                {'error': 'Enter a valid Kenyan number e.g. +254712345678'},
                status=400
            )

        # Create or update the payment method for this user
        pm, created = PaymentMethod.objects.get_or_create(user=request.user)
        pm.phone_number = phone_clean  # Encrypted automatically by the setter
        pm.account_name = name
        pm.save()

        return Response({
            'message': 'M-Pesa account connected successfully',
            'masked_phone': mask_phone(phone_clean),
            'account_name': pm.account_name,
        })

    def get(self, request):
        # Return the user's connected payment method (masked)
        try:
            pm = request.user.payment_method
            return Response({
                'connected': True,
                'masked_phone': mask_phone(pm.phone_number),
                'account_name': pm.account_name,
                'is_verified': pm.is_verified,
            })
        except PaymentMethod.DoesNotExist:
            return Response({'connected': False})

# ── USER: View payout history ──
class UserPayoutListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payouts = Payout.objects.filter(
            user=request.user
        ).order_by('-created_at')

        data = [{
            'id':           p.id,
            'task':         p.task.title,
            'amount':       str(p.amount),
            'status':       p.status,
            'accuracy':     p.accuracy_score,
            'created_at':   p.created_at,
            'paid_at':      p.paid_at,
            'mpesa_ref':    p.mpesa_transaction_id or None,
        } for p in payouts]

        # Summary totals for the stat cards
        total_earned  = sum(float(p.amount) for p in payouts if p.status == 'paid')
        pending_amount = sum(float(p.amount) for p in payouts if p.status in ['pending', 'approved', 'processing'])

        return Response({
            'payouts':        data,
            'total_earned':   total_earned,
            'pending_amount': pending_amount,
        })

# ── ADMIN: List all payouts with user payment details ──
class AdminPayoutListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        # Filter by status if provided
        status_filter = request.query_params.get('status', None)
        payouts = Payout.objects.select_related(
            'user', 'task', 'user__payment_method'
        ).order_by('-created_at')

        if status_filter:
            payouts = payouts.filter(status=status_filter)

        data = []
        for p in payouts:
            # Get masked phone for display
            try:
                pm = p.user.payment_method
                masked_phone  = mask_phone(pm.phone_number)
                account_name  = pm.account_name
                pm_verified   = pm.is_verified
            except PaymentMethod.DoesNotExist:
                masked_phone  = 'No payment method'
                account_name  = '—'
                pm_verified   = False

            data.append({
                'id':           p.id,
                'user_id':      p.user.id,
                'user_name':    p.user.full_name,
                'user_email':   p.user.email,
                'task':         p.task.title,
                'task_id':      p.task.id,
                'amount':       str(p.amount),
                'status':       p.status,
                'accuracy':     p.accuracy_score,
                'masked_phone': masked_phone,
                'account_name': account_name,
                'pm_verified':  pm_verified,
                'admin_notes':  p.admin_notes,
                'created_at':   p.created_at,
                'paid_at':      p.paid_at,
            })

        return Response(data)

# ── ADMIN: Verify a submission and set accuracy score ──
class AdminVerifyPayoutView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, payout_id):
        try:
            payout = Payout.objects.get(id=payout_id)
        except Payout.DoesNotExist:
            return Response({'error': 'Payout not found'}, status=404)

        action         = request.data.get('action')  # 'approve' or 'reject'
        accuracy_score = request.data.get('accuracy_score')
        admin_notes    = request.data.get('admin_notes', '')

        payout.accuracy_score = accuracy_score
        payout.admin_notes    = admin_notes

        if action == 'approve':
            # Mark as approved — ready for payout
            payout.status = 'approved'
            # After payout.status = 'approved'
        if action == 'approve':
            create_notification(
                user       = payout.user,
                title      = 'Submission approved',
                body       = f'Your submission for "{payout.task.title}" was approved with {accuracy_score}% accuracy. Payout is being processed.',
                notif_type = 'task',
            )
        elif action == 'reject':
            create_notification(
                user       = payout.user,
                title      = 'Submission rejected',
                body       = f'Your submission for "{payout.task.title}" was rejected. Notes: {admin_notes or "No notes provided."}',
                notif_type = 'task',
            )
        elif action == 'reject':
            # Mark as rejected — worker will be notified
            payout.status = 'rejected'
        else:
            return Response({'error': 'action must be approve or reject'}, status=400)

        payout.save()
        return Response({
            'message': f'Payout {action}d successfully',
            'status':  payout.status,
        })

# ── ADMIN: Send actual M-Pesa payment via Daraja B2C ──
class AdminSendPayoutView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, payout_id):
        try:
            payout = Payout.objects.select_related(
                'user__payment_method'
            ).get(id=payout_id, status='approved')
        except Payout.DoesNotExist:
            return Response(
                {'error': 'Payout not found or not yet approved'},
                status=404
            )

        # Make sure the user has a connected M-Pesa account
        try:
            pm = payout.user.payment_method
        except PaymentMethod.DoesNotExist:
            return Response(
                {'error': 'User has no connected M-Pesa account'},
                status=400
            )

        try:
            # Call Daraja B2C API to send the money
            result = send_b2c_payment(
                phone_number = pm.phone_number,  # Decrypted automatically
                amount       = float(payout.amount),
                remarks      = f'Taskr AI — {payout.task.title}'
            )

            # Save the Daraja conversation ID for tracking
            payout.status                 = 'processing'
            payout.mpesa_conversation_id  = result.get('ConversationID', '')
            payout.save()
            
            # Notify the worker that their payment is on the way
            create_notification(
                user       = payout.user,
                title      = f'Payout initiated — ${payout.amount}',
                body       = f'Your M-Pesa payment for "{payout.task.title}" has been initiated. It should arrive within 24 hours.',
                notif_type = 'payment',
            )
            return Response({
                'message':         'Payment initiated successfully',
                'conversation_id': payout.mpesa_conversation_id,
            })

        except Exception as e:
            # If Daraja call fails, mark as failed
            payout.status = 'failed'
            payout.save()
            return Response({'error': str(e)}, status=500)

# ── DARAJA CALLBACK: Receives payment confirmation from Safaricom ──
class MpesaCallbackView(APIView):
    # No auth — Safaricom calls this endpoint directly
    permission_classes = [AllowAny]

    def post(self, request):
        # Daraja sends result data in this structure
        body        = request.data.get('Result', {})
        result_code = body.get('ResultCode')
        conv_id     = body.get('ConversationID', '')

        try:
            # Find the payout by conversation ID
            payout = Payout.objects.get(mpesa_conversation_id=conv_id)

            if result_code == 0:
                # Payment successful
                payout.status = 'paid'
                # After payout.status = 'paid'
                create_notification(
                    user       = payout.user,
                    title      = f'Payment received — KES {payout.amount}',
                    body       = f'Your payment for "{payout.task.title}" was successfully sent to your M-Pesa. Transaction ID: {payout.mpesa_transaction_id}',
                    notif_type = 'payment',
                )
                payout.paid_at = timezone.now()

                # Extract transaction ID from result parameters
                params = body.get('ResultParameters', {}).get('ResultParameter', [])
                for param in params:
                    if param.get('Key') == 'TransactionID':
                        payout.mpesa_transaction_id = param.get('Value', '')

            else:
                # Payment failed
                payout.status = 'failed'

            payout.save()

        except Payout.DoesNotExist:
            pass  # Unknown conversation ID — ignore silently

        # Daraja expects this exact response format
        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})      

# ── Send verification email on registration ──
def send_verification_email(user):
    """
    Generates a 6-digit code and emails it to the user.
    Called automatically after registration.
    """
    code = EmailVerification.generate_code()

    # Delete any existing code for this user before creating a new one
    EmailVerification.objects.filter(user=user).delete()
    EmailVerification.objects.create(user=user, code=code)

    send_mail(
        subject = 'Your Taskr AI verification code',
        message = f'Hi {user.full_name},\n\nYour verification code is: {code}\n\nThis code expires in 10 minutes.\n\nTaskr AI Team',
        from_email = django_settings.EMAIL_HOST_USER,
        recipient_list = [user.email],
        fail_silently = False,
    )

# ── Verify email with code ──
class VerifyEmailView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        code  = request.data.get('code')

        try:
            user         = User.objects.get(email=email)
            verification = user.email_verification
        except (User.DoesNotExist, EmailVerification.DoesNotExist):
            return Response({'error': 'Invalid email or code'}, status=400)

        if verification.is_used:
            return Response({'error': 'Code already used'}, status=400)

        if verification.is_expired():
            return Response({'error': 'Code expired — please request a new one'}, status=400)

        if verification.code != code:
            return Response({'error': 'Incorrect code'}, status=400)

        # Mark code as used and user as verified
        verification.is_used  = True
        verification.save()
        user.is_verified = True
        user.save()

        return Response({'message': 'Email verified successfully'})

# ── Resend verification code ──
class ResendVerificationView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        if user.is_verified:
            return Response({'error': 'Email already verified'}, status=400)

        # Send a fresh code
        send_verification_email(user)
        return Response({'message': 'Verification code resent'})

# ── Get or update user profile ──
class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get or create a profile for this user
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response({
            'profile':    serializer.data,
            'user': {
                'id':         request.user.id,
                'email':      request.user.email,
                'full_name':  request.user.full_name,
                'is_verified': request.user.is_verified,
            }
        })

    def patch(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)

        # Handle photo upload
        if 'photo' in request.FILES:
            profile.photo = request.FILES['photo']

        # Handle CV upload
        if 'cv' in request.FILES:
            profile.cv = request.FILES['cv']

        # Update text fields if provided
        fields = ['about', 'location', 'skills', 'onboarding_step', 'is_complete']
        for field in fields:
            if field in request.data:
                setattr(profile, field, request.data[field])

        # Handle date of birth — check age
        dob = request.data.get('date_of_birth')
        if dob:
            try:
                dob_date = date.fromisoformat(dob)
                today    = date.today()
                age      = today.year - dob_date.year - (
                    (today.month, today.day) < (dob_date.month, dob_date.day)
                )
                if age < 18:
                    return Response(
                        {'error': 'You must be 18 or older to use Taskr AI'},
                        status=400
                    )
                profile.date_of_birth = dob_date
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)

        # Handle terms acceptance
        if request.data.get('terms_accepted'):
            profile.terms_accepted    = True
            profile.terms_accepted_at = timezone.now()

        # Update full name on User model if provided
        full_name = request.data.get('full_name')
        if full_name:
            request.user.full_name = full_name
            request.user.save()

        profile.save()
        serializer = UserProfileSerializer(profile, context={'request': request})
        return Response(serializer.data)

# ── Save education entries ──
class EducationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        edu = Education.objects.create(
            profile     = profile,
            degree      = request.data.get('degree', ''),
            institution = request.data.get('institution', ''),
            year        = request.data.get('year'),
            grade       = request.data.get('grade', ''),
        )
        return Response({'id': edu.id, 'message': 'Education added'}, status=201)

    def delete(self, request, edu_id):
        try:
            edu = Education.objects.get(id=edu_id, profile__user=request.user)
            edu.delete()
            return Response({'message': 'Deleted'})
        except Education.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

# ── Save work experience entries ──
class WorkExperienceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        exp = WorkExperience.objects.create(
            profile     = profile,
            job_title   = request.data.get('job_title', ''),
            company     = request.data.get('company', ''),
            from_date   = request.data.get('from_date') or None,
            to_date     = request.data.get('to_date') or None,
            description = request.data.get('description', ''),
            is_current  = request.data.get('is_current', False),
        )
        return Response({'id': exp.id, 'message': 'Experience added'}, status=201)

    def delete(self, request, exp_id):
        try:
            exp = WorkExperience.objects.get(id=exp_id, profile__user=request.user)
            exp.delete()
            return Response({'message': 'Deleted'})
        except WorkExperience.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

# ── Delete account ──
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        # Permanently delete the user and all related data
        request.user.delete()
        return Response({'message': 'Account deleted successfully'})

# ── Change email ──
class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        new_email = request.data.get('email', '').strip()
        password  = request.data.get('password', '')

        # Verify password before allowing email change
        if not request.user.check_password(password):
            return Response({'error': 'Incorrect password'}, status=400)

        if User.objects.filter(email=new_email).exists():
            return Response({'error': 'Email already in use'}, status=400)

        # Update email and require re-verification
        request.user.email       = new_email
        request.user.is_verified = False
        request.user.save()

        # Send new verification code
        send_verification_email(request.user)
        return Response({'message': 'Email updated — please verify your new address'})

# ── Change password ──
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')

        if not request.user.check_password(old_password):
            return Response({'error': 'Current password is incorrect'}, status=400)

        if len(new_password) < 8:
            return Response({'error': 'New password must be at least 8 characters'}, status=400)

        request.user.set_password(new_password)
        request.user.save()
        return Response({'message': 'Password changed successfully'}) 
    
# ── USER: Get all notifications ──
class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Optional filter by type
        notif_type = request.query_params.get('type', None)
        notifs = Notification.objects.filter(user=request.user)

        if notif_type:
            notifs = notifs.filter(notif_type=notif_type)

        # Unread count for the badge
        unread_count = notifs.filter(is_read=False).count()

        data = [{
            'id':         n.id,
            'title':      n.title,
            'body':       n.body,
            'type':       n.notif_type,
            'is_read':    n.is_read,
            'created_at': n.created_at,
        } for n in notifs]

        return Response({
            'notifications': data,
            'unread_count':  unread_count,
        })

# ── USER: Mark notification(s) as read ──
class MarkNotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        notif_id = request.data.get('id')  # single ID or None for mark all

        if notif_id:
            # Mark a single notification as read
            Notification.objects.filter(
                id=notif_id, user=request.user
            ).update(is_read=True)
        else:
            # Mark all as read
            Notification.objects.filter(
                user=request.user, is_read=False
            ).update(is_read=True)

        return Response({'message': 'Marked as read'})

# ── USER: Get invoices and earnings data ──
class InvoiceListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all paid payouts for this user
        payouts = Payout.objects.filter(
            user=request.user
        ).select_related('task').order_by('-created_at')

        # ── Monthly earnings for the chart ──
        # Group paid payouts by month
        monthly = {}
        for p in payouts.filter(status='paid'):
            if p.paid_at:
                key = p.paid_at.strftime('%b %Y')  # e.g. "Apr 2026"
                monthly[key] = monthly.get(key, 0) + float(p.amount)

        # Sort by date — most recent last for the chart
        monthly_sorted = dict(
            sorted(monthly.items(),
                   key=lambda x: datetime.strptime(x[0], '%b %Y'))
        )

        # ── Summary stats ──
        total_earned   = sum(float(p.amount) for p in payouts if p.status == 'paid')
        this_month_key = datetime.now().strftime('%b %Y')
        this_month     = monthly_sorted.get(this_month_key, 0)
        avg_per_task   = total_earned / len(payouts) if payouts else 0
        best_month_val = max(monthly_sorted.values()) if monthly_sorted else 0
        best_month_key = max(monthly_sorted, key=monthly_sorted.get) if monthly_sorted else '—'

        # ── Auto-generate invoices by month ──
        # Group paid payouts by month into invoice objects
        invoices = []
        invoice_num = 1
        for month_key, amount in reversed(list(monthly_sorted.items())):
            # Count tasks in this month
            month_payouts = [
                p for p in payouts
                if p.status == 'paid' and p.paid_at
                and p.paid_at.strftime('%b %Y') == month_key
            ]
            invoices.append({
                'number':    f'INV-{str(invoice_num).zfill(4)}',
                'period':    month_key,
                'tasks':     len(month_payouts),
                'amount':    round(amount, 2),
                'status':    'paid',
            })
            invoice_num += 1

        # Add current month pending if exists
        pending_payouts = payouts.filter(status__in=['pending', 'approved', 'processing'])
        if pending_payouts.exists():
            pending_total = sum(float(p.amount) for p in pending_payouts)
            invoices.insert(0, {
                'number':  f'INV-{str(invoice_num).zfill(4)}',
                'period':  datetime.now().strftime('%b %Y'),
                'tasks':   pending_payouts.count(),
                'amount':  round(pending_total, 2),
                'status':  'pending',
            })

        return Response({
            'summary': {
                'total_earned':  round(total_earned, 2),
                'this_month':    round(this_month, 2),
                'avg_per_task':  round(avg_per_task, 2),
                'best_month':    best_month_key,
                'best_month_val': round(best_month_val, 2),
            },
            'monthly_chart': monthly_sorted,  # { "Nov 2025": 120, "Dec 2025": 340, ... }
            'invoices':       invoices,
        })

# ── USER: Get completed jobs ──
class CompletedJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Get all payouts that are past the pending stage
        payouts = Payout.objects.filter(
            user=request.user,
            status__in=['approved', 'processing', 'paid', 'rejected']
        ).select_related('task').order_by('-created_at')

        # Optional status filter
        status_filter = request.query_params.get('status')
        if status_filter:
            payouts = payouts.filter(status=status_filter)

        data = [{
            'id':           p.id,
            'task_title':   p.task.title,
            'category':     p.task.category,
            'amount':       str(p.amount),
            'status':       p.status,
            'accuracy':     p.accuracy_score,
            'completed_at': p.created_at,
            'paid_at':      p.paid_at,
            'mpesa_ref':    p.mpesa_transaction_id or None,
        } for p in payouts]

        # Performance summary
        paid_payouts = [p for p in payouts if p.status == 'paid']
        accuracies   = [p.accuracy_score for p in payouts if p.accuracy_score]

        summary = {
            'total_completed': payouts.count(),
            'total_paid':      len(paid_payouts),
            'total_earned':    sum(float(p.amount) for p in paid_payouts),
            'avg_accuracy':    round(sum(accuracies) / len(accuracies), 1) if accuracies else 0,
        }

        return Response({'jobs': data, 'summary': summary})
    
# ── WORKER: Submit a proposal for a task ──
class SubmitProposalView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, task_id):
        try:
            task = Task.objects.get(id=task_id, is_published=True)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found'}, status=404)

        # Check if already applied
        if Proposal.objects.filter(user=request.user, task=task).exists():
            return Response({'error': 'You have already applied to this task'}, status=400)

        proposal = Proposal.objects.create(
            user       = request.user,
            task       = task,
            cover_note = request.data.get('cover_note', ''),
        )

        # Notify admin of new proposal
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            create_notification(
                user       = admin,
                title      = f'New proposal — {task.title}',
                body       = f'{request.user.full_name} has applied to "{task.title}"',
                notif_type = 'task',
            )

        return Response({
            'id':         proposal.id,
            'status':     proposal.status,
            'message':    'Proposal submitted successfully',
        }, status=201)

# ── WORKER: Get all proposals for logged-in user ──
class UserProposalListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        status_filter = request.query_params.get('status', '')
        proposals     = Proposal.objects.filter(
            user=request.user
        ).select_related('task').order_by('-created_at')

        if status_filter:
            proposals = proposals.filter(status=status_filter)

        data = [{
            'id':          p.id,
            'task_id':     p.task.id,
            'task_title':  p.task.title,
            'task_budget': str(p.task.budget),
            'task_type':   p.task.job_type,
            'posted_by':   p.task.posted_by.full_name if p.task.posted_by else 'Admin',
            'cover_note':  p.cover_note,
            'status':      p.status,
            'admin_note':  p.admin_note,
            'created_at':  p.created_at,
        } for p in proposals]

        # Summary counts
        counts = {
            'all':      proposals.count(),
            'pending':  proposals.filter(status='pending').count(),
            'accepted': proposals.filter(status='accepted').count(),
            'rejected': proposals.filter(status='rejected').count(),
        }

        return Response({'proposals': data, 'counts': counts})

# ── WORKER: Withdraw a proposal ──
class WithdrawProposalView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, proposal_id):
        try:
            proposal = Proposal.objects.get(
                id=proposal_id,
                user=request.user,
                status='pending'  # Can only withdraw pending proposals
            )
        except Proposal.DoesNotExist:
            return Response({'error': 'Proposal not found or cannot be withdrawn'}, status=404)

        proposal.status = 'withdrawn'
        proposal.save()
        return Response({'message': 'Proposal withdrawn'})

# ── WORKER: Get ongoing jobs (accepted proposals) ──
class OngoingJobsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # Ongoing = accepted proposals that haven't been fully submitted yet
        proposals = Proposal.objects.filter(
            user   = request.user,
            status = 'accepted'
        ).select_related('task').order_by('-updated_at')

        data = []
        for p in proposals:
            # Get latest submission if any
            latest_sub = p.submissions.order_by('-created_at').first()
            data.append({
                'proposal_id':   p.id,
                'task_id':       p.task.id,
                'task_title':    p.task.title,
                'task_desc':     p.task.description,
                'task_budget':   str(p.task.budget),
                'task_type':     p.task.job_type,
                'task_category': p.task.category,
                'task_data_type':p.task.data_type,
                'task_experience':p.task.experience,
                'task_length':   p.task.project_length,
                'task_skills':   p.task.skills_list(),
                'task_instructions': p.task.instructions,
                'posted_by':     p.task.posted_by.full_name if p.task.posted_by else 'Admin',
                'accepted_at':   p.updated_at,
                'submission':    {
                    'id':     latest_sub.id,
                    'status': latest_sub.status,
                    'notes':  latest_sub.notes,
                } if latest_sub else None,
            })

        return Response(data)

# ── WORKER: Get single ongoing job detail ──
class OngoingJobDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, proposal_id):
        try:
            proposal = Proposal.objects.select_related('task').get(
                id     = proposal_id,
                user   = request.user,
                status = 'accepted'
            )
        except Proposal.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        # Get all submissions for this proposal
        submissions = proposal.submissions.order_by('-created_at')
        sub_data = [{
            'id':         s.id,
            'status':     s.status,
            'notes':      s.notes,
            'admin_note': s.admin_note,
            'created_at': s.created_at,
        } for s in submissions]

        return Response({
            'proposal_id':    proposal.id,
            'task_id':        proposal.task.id,
            'task_title':     proposal.task.title,
            'task_desc':      proposal.task.description,
            'task_budget':    str(proposal.task.budget),
            'task_category':  proposal.task.category,
            'task_data_type': proposal.task.data_type,
            'task_experience':proposal.task.experience,
            'task_length':    proposal.task.project_length,
            'task_skills':    proposal.task.skills_list(),
            'task_instructions': proposal.task.instructions,
            'posted_by':      proposal.task.posted_by.full_name if proposal.task.posted_by else 'Admin',
            'accepted_at':    proposal.updated_at,
            'submissions':    sub_data,
        })

# ── WORKER: Submit work for an ongoing job ──
class SubmitWorkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, proposal_id):
        try:
            proposal = Proposal.objects.get(
                id     = proposal_id,
                user   = request.user,
                status = 'accepted'
            )
        except Proposal.DoesNotExist:
            return Response({'error': 'Job not found'}, status=404)

        # Create submission
        submission = Submission(
            proposal = proposal,
            notes    = request.data.get('notes', ''),
        )

        # Handle file upload if provided
        if 'file' in request.FILES:
            submission.file = request.FILES['file']

        submission.save()

        # Create a Payout record in pending status
        Payout.objects.create(
            user   = request.user,
            task   = proposal.task,
            amount = proposal.task.budget,
            status = 'pending',
        )

        # Notify admin of new submission
        admin_users = User.objects.filter(is_staff=True)
        for admin in admin_users:
            create_notification(
                user       = admin,
                title      = f'New submission — {proposal.task.title}',
                body       = f'{request.user.full_name} submitted work for "{proposal.task.title}". Review it in Payout Management.',
                notif_type = 'task',
            )

        # Notify worker
        create_notification(
            user       = request.user,
            title      = 'Work submitted successfully',
            body       = f'Your submission for "{proposal.task.title}" has been received and is pending review.',
            notif_type = 'task',
        )

        return Response({
            'id':      submission.id,
            'status':  submission.status,
            'message': 'Work submitted successfully. Pending admin review.',
        }, status=201)

# ── MESSAGES: Get all conversations for logged-in user ──
class ConversationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get all unique people this user has messaged with
        from django.db.models import Q, Max
        conversations = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values(
            'sender', 'receiver'
        ).distinct()

        # Find unique other parties
        other_user_ids = set()
        for conv in conversations:
            other_id = conv['receiver'] if conv['sender'] == user.id else conv['sender']
            other_user_ids.add(other_id)

        data = []
        for other_id in other_user_ids:
            try:
                other_user = User.objects.get(id=other_id)
            except User.DoesNotExist:
                continue

            # Get the latest message in this conversation
            latest = Message.objects.filter(
                Q(sender=user, receiver=other_user) |
                Q(sender=other_user, receiver=user)
            ).order_by('-created_at').first()

            # Count unread messages from this person
            unread = Message.objects.filter(
                sender   = other_user,
                receiver = user,
                is_read  = False
            ).count()

            if latest:
                data.append({
                    'other_user_id':   other_user.id,
                    'other_user_name': other_user.full_name,
                    'other_is_admin':  other_user.is_staff,
                    'latest_message':  latest.body,
                    'latest_time':     latest.created_at,
                    'unread_count':    unread,
                    'task_title':      latest.task.title if latest.task else None,
                })

        # Sort by latest message time
        data.sort(key=lambda x: x['latest_time'], reverse=True)
        return Response(data)

# ── MESSAGES: Get messages with a specific user ──
class MessageThreadView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, other_user_id):
        from django.db.models import Q
        try:
            other_user = User.objects.get(id=other_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)

        # Get all messages between these two users
        messages = Message.objects.filter(
            Q(sender=request.user, receiver=other_user) |
            Q(sender=other_user, receiver=request.user)
        ).order_by('created_at')

        # Mark all received messages as read
        messages.filter(receiver=request.user, is_read=False).update(is_read=True)

        data = [{
            'id':         m.id,
            'body':       m.body,
            'is_mine':    m.sender == request.user,
            'sender_name':m.sender.full_name,
            'task_title': m.task.title if m.task else None,
            'created_at': m.created_at,
        } for m in messages]

        return Response({
            'messages':        data,
            'other_user_name': other_user.full_name,
            'other_is_admin':  other_user.is_staff,
        })

# ── MESSAGES: Send a message ──
class SendMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        receiver_id = request.data.get('receiver_id')
        body        = request.data.get('body', '').strip()
        task_id     = request.data.get('task_id')

        if not body:
            return Response({'error': 'Message cannot be empty'}, status=400)

        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return Response({'error': 'Receiver not found'}, status=404)

        task = None
        if task_id:
            try:
                task = Task.objects.get(id=task_id)
            except Task.DoesNotExist:
                pass

        message = Message.objects.create(
            sender   = request.user,
            receiver = receiver,
            body     = body,
            task     = task,
        )

        # Notify receiver
        create_notification(
            user       = receiver,
            title      = f'New message from {request.user.full_name}',
            body       = body[:100],
            notif_type = 'message',
        )

        return Response({
            'id':         message.id,
            'body':       message.body,
            'is_mine':    True,
            'created_at': message.created_at,
        }, status=201)

# ── ADMIN: Get all proposals across all tasks ──
class AdminProposalListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        status_filter = request.query_params.get('status', '')
        proposals     = Proposal.objects.select_related(
            'user', 'task'
        ).order_by('-created_at')

        if status_filter:
            proposals = proposals.filter(status=status_filter)

        data = [{
            'id':          p.id,
            'user_id':     p.user.id,
            'user_name':   p.user.full_name,
            'user_email':  p.user.email,
            'task_id':     p.task.id,
            'task_title':  p.task.title,
            'task_budget': str(p.task.budget),
            'cover_note':  p.cover_note,
            'status':      p.status,
            'admin_note':  p.admin_note,
            'created_at':  p.created_at,
        } for p in proposals]

        return Response(data)

# ── ADMIN: Accept or reject a proposal ──
class AdminReviewProposalView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, proposal_id):
        try:
            proposal = Proposal.objects.select_related('user', 'task').get(id=proposal_id)
        except Proposal.DoesNotExist:
            return Response({'error': 'Proposal not found'}, status=404)

        action     = request.data.get('action')  # 'accept' or 'reject'
        admin_note = request.data.get('admin_note', '')

        if action == 'accept':
            proposal.status     = 'accepted'
            proposal.admin_note = admin_note
            proposal.save()

            # Notify worker they were accepted
            create_notification(
                user       = proposal.user,
                title      = f'Proposal accepted — {proposal.task.title}',
                body       = f'Congratulations! Your proposal for "{proposal.task.title}" has been accepted. Go to Ongoing Jobs to start working.',
                notif_type = 'task',
            )

        elif action == 'reject':
            proposal.status     = 'rejected'
            proposal.admin_note = admin_note
            proposal.save()

            # Notify worker they were rejected
            create_notification(
                user       = proposal.user,
                title      = f'Proposal not selected — {proposal.task.title}',
                body       = admin_note or f'Your proposal for "{proposal.task.title}" was not selected this time.',
                notif_type = 'task',
            )
        else:
            return Response({'error': 'action must be accept or reject'}, status=400)

        return Response({
            'message': f'Proposal {action}ed successfully',
            'status':  proposal.status,
        })
    
