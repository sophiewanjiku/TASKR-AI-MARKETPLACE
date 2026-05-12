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

User = get_user_model()

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