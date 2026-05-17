# Import necessary Django modules for building a custom user model
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from .encryption import encrypt, decrypt
import random
import string
from django.utils import timezone


# UserManager handles the logic for creating regular users and superusers
class UserManager(BaseUserManager):

    def create_user(self, email, password=None, **extra_fields):
        # Ensure every user has an email address
        if not email:
            raise ValueError('Email is required')
        
        # Normalize the email (lowercases the domain part)
        email = self.normalize_email(email)
        
        # Create a new user instance with the given email and extra fields
        user = self.model(email=email, **extra_fields)
        
        # Hash and set the password securely (never stored as plain text)
        user.set_password(password)
        
        # Save the user to the database
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Superusers must have staff and superuser privileges
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        
        # Reuse the create_user logic with elevated permissions
        return self.create_user(email, password, **extra_fields)


# The main User model — replaces Django's default User
class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    # These two lines fix the clash — they give our custom User model
    # its own unique reverse accessors so it doesn't conflict with Django's built-in User
    groups = models.ManyToManyField(
        'auth.Group',
        related_name='custom_user_set',  # avoids clash with auth.User.groups
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name='custom_user_set',  # avoids clash with auth.User.user_permissions
        blank=True
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']
    objects = UserManager()

    def __str__(self):
        return self.email
    
# Task model — represents a job posted by an admin on the marketplace
class Task(models.Model):

    # Job type choices
    JOB_TYPE_CHOICES = [
        ('fixed', 'Fixed Price'),
        ('hourly', 'Hourly'),
    ]

    # Experience level choices
    EXPERIENCE_CHOICES = [
        ('entry', 'Entry Level'),
        ('intermediate', 'Intermediate'),
        ('expert', 'Expert'),
    ]

    # Project length choices
    LENGTH_CHOICES = [
        ('less_1_week', 'Less than 1 week'),
        ('1_4_weeks', '1 to 4 weeks'),
        ('1_3_months', '1 to 3 months'),
        ('3_plus_months', '3+ months'),
    ]

    # Data type choices
    DATA_TYPE_CHOICES = [
        ('image', 'Image'),
        ('text', 'Text'),
        ('audio', 'Audio'),
        ('video', 'Video'),
        ('tabular', 'Tabular'),
    ]

    # Category choices
    CATEGORY_CHOICES = [
        ('labeling', 'Data Labeling'),
        ('transcription', 'Transcription'),
        ('verification', 'Verification'),
        ('review', 'Dataset Review'),
        ('annotation', 'Annotation'),
    ]

    # Core fields
    title           = models.CharField(max_length=255)
    description     = models.TextField()
    category        = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    data_type       = models.CharField(max_length=50, choices=DATA_TYPE_CHOICES)
    job_type        = models.CharField(max_length=20, choices=JOB_TYPE_CHOICES, default='fixed')
    experience      = models.CharField(max_length=20, choices=EXPERIENCE_CHOICES, default='entry')
    project_length  = models.CharField(max_length=20, choices=LENGTH_CHOICES, default='1_4_weeks')

    # Compensation
    budget          = models.DecimalField(max_digits=10, decimal_places=2)
    hours_per_week  = models.IntegerField(null=True, blank=True)

    # Skills stored as comma-separated string e.g. "Python,Annotation"
    skills          = models.TextField(blank=True)

    # Extra instructions from the admin
    instructions    = models.TextField(blank=True)

    # Visibility settings
    is_published             = models.BooleanField(default=True)
    allow_multiple           = models.BooleanField(default=False)
    require_verification     = models.BooleanField(default=True)

    # Who posted this task (admin user)
    posted_by       = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='posted_tasks'
    )

    # Timestamps
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

    # Helper to return skills as a list
    def skills_list(self):
        return [s.strip() for s in self.skills.split(',') if s.strip()]


# Saved jobs — tracks which tasks a user has bookmarked
class SavedTask(models.Model):
    user    = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_tasks')
    task    = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='saved_by')
    saved_at = models.DateTimeField(auto_now_add=True)

    # Prevent duplicate saves
    class Meta:
        unique_together = ['user', 'task']

    def __str__(self):
        return f"{self.user.email} saved {self.task.title}"
    
class PaymentMethod(models.Model):
    """
    Stores a user's connected M-Pesa payment details.
    Phone number is encrypted at rest for security.
    Each user can only have one payment method (OneToOne).
    """
    user            = models.OneToOneField(
                        User,
                        on_delete=models.CASCADE,
                        related_name='payment_method'
                    )

    # Phone number stored encrypted — never plain text in DB
    _phone_number   = models.CharField(max_length=500, db_column='phone_number')

    # Display name e.g. "Jane's M-Pesa"
    account_name    = models.CharField(max_length=100, blank=True)

    # Whether the number has been confirmed working
    is_verified     = models.BooleanField(default=False)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    # Property getter — decrypts phone on read
    @property
    def phone_number(self):
        return decrypt(self._phone_number)

    # Property setter — encrypts phone on write
    @phone_number.setter
    def phone_number(self, value):
        self._phone_number = encrypt(value)

    def __str__(self):
        return f"{self.user.email} — M-Pesa"


class Payout(models.Model):
    """
    Records every payout made or pending for a user.
    Created automatically when admin approves a task submission.
    """
    STATUS_CHOICES = [
        ('pending',   'Pending Verification'),  # Task submitted, not yet verified
        ('approved',  'Awaiting Payout'),       # Admin verified, payout not sent yet
        ('processing','Processing'),             # Daraja API call made
        ('paid',      'Paid'),                  # Confirmed paid by Daraja callback
        ('failed',    'Failed'),                # Daraja returned an error
        ('rejected',  'Rejected'),              # Admin rejected the submission
    ]

    user            = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payouts')
    task            = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='payouts')

    amount          = models.DecimalField(max_digits=10, decimal_places=2)
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    # Accuracy score set by admin during verification (0-100)
    accuracy_score  = models.FloatField(null=True, blank=True)

    # Daraja transaction reference — returned after B2C call
    mpesa_conversation_id   = models.CharField(max_length=100, blank=True)
    mpesa_transaction_id    = models.CharField(max_length=100, blank=True)

    # Admin notes on the verification
    admin_notes     = models.TextField(blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    paid_at         = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} — {self.task.title} — {self.status}"
    
class EmailVerification(models.Model):
    """
    Stores the 6-digit verification code sent to a user's email.
    Code expires after 10 minutes.
    """
    user       = models.OneToOneField(User, on_delete=models.CASCADE, related_name='email_verification')
    code       = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used    = models.BooleanField(default=False)

    def is_expired(self):
        # Code expires after 10 minutes
        return (timezone.now() - self.created_at).seconds > 600

    @staticmethod
    def generate_code():
        # Generate a random 6-digit numeric code
        return ''.join(random.choices(string.digits, k=6))

    def __str__(self):
        return f"{self.user.email} — {self.code}"


class UserProfile(models.Model):
    """
    Extended profile information for each worker.
    Linked one-to-one with the User model.
    """
    user            = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Personal info
    date_of_birth   = models.DateField(null=True, blank=True)
    location        = models.CharField(max_length=255, blank=True)
    about           = models.TextField(blank=True)

    # Profile photo — stored in media/profiles/
    photo           = models.ImageField(upload_to='profiles/', null=True, blank=True)

    # CV document — stored in media/cvs/
    cv              = models.FileField(upload_to='cvs/', null=True, blank=True)

    # Skills stored as comma-separated string
    skills          = models.TextField(blank=True)

    # Tracks how far through the wizard the user got
    # 0 = not started, 7 = complete
    onboarding_step = models.IntegerField(default=0)
    is_complete     = models.BooleanField(default=False)

    # Terms accepted
    terms_accepted  = models.BooleanField(default=False)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    def skills_list(self):
        return [s.strip() for s in self.skills.split(',') if s.strip()]

    def __str__(self):
        return f"{self.user.email} — profile"


class Education(models.Model):
    """One education entry for a user — they can have multiple."""
    profile     = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='education')
    degree      = models.CharField(max_length=255)
    institution = models.CharField(max_length=255)
    year        = models.IntegerField(null=True, blank=True)
    grade       = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.degree} — {self.institution}"


class WorkExperience(models.Model):
    """One work experience entry — they can have multiple."""
    profile     = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='experience')
    job_title   = models.CharField(max_length=255)
    company     = models.CharField(max_length=255)
    from_date   = models.DateField(null=True, blank=True)
    to_date     = models.DateField(null=True, blank=True)
    description = models.TextField(blank=True)
    is_current  = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.job_title} at {self.company}"
    
    class Notification(models.Model):
     
     #Stores in-app notifications for each user. Created automatically by the system when key events happen e.g. payout sent, submission approved, new job match.
        
        TYPE_CHOICES = [
            ('payment',  'Payment'),
            ('task',     'Task'),
            ('system',   'System'),
            ('message',  'Message'),
        ]

    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title      = models.CharField(max_length=255)
    body       = models.TextField()
    notif_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='system')
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} — {self.title}"


class Invoice(models.Model):
    """
    Auto-generated monthly invoice grouping all paid tasks for a user.
    Created at the end of each month or when a payout is marked paid.
    """
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    # Invoice number e.g. INV-0014
    number     = models.CharField(max_length=20, unique=True)
    period     = models.CharField(max_length=20)  # e.g. "April 2026"
    total      = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status     = models.CharField(max_length=20, default='paid')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.number} — {self.user.email}"
    
    class Proposal(models.Model):
    #Tracks a worker's application to a task. Created when a worker clicks Apply on the Find Jobs page.
    
        STATUS_CHOICES = [
            ('pending',  'Pending'),   # Submitted, admin hasn't reviewed
            ('accepted', 'Accepted'),  # Admin accepted — moves to ongoing
            ('rejected', 'Rejected'),  # Admin rejected
            ('withdrawn','Withdrawn'), # Worker pulled their application
        ]

        user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='proposals')
        task        = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='proposals')
        cover_note  = models.TextField(blank=True)  # Worker's pitch / cover letter
        status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
        admin_note  = models.TextField(blank=True)  # Reason for rejection etc.
        created_at  = models.DateTimeField(auto_now_add=True)
        updated_at  = models.DateTimeField(auto_now=True)

        # One proposal per user per task
        class Meta:
            unique_together = ['user', 'task']

        def __str__(self):
            return f"{self.user.email} → {self.task.title} ({self.status})"

class Submission(models.Model):
    
    #A work submission from a worker on an accepted task. Admin reviews this and creates a Payout upon approval.
    
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),  # Just submitted, pending review
        ('approved',  'Approved'),   # Admin approved — payout created
        ('rejected',  'Rejected'),   # Admin rejected — worker can resubmit
    ]

    proposal   = models.ForeignKey(Proposal, on_delete=models.CASCADE, related_name='submissions')
    notes      = models.TextField(blank=True)   # Worker's notes on submission
    file       = models.FileField(upload_to='submissions/', null=True, blank=True)
    status     = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Submission by {self.proposal.user.email} for {self.proposal.task.title}"


class Message(models.Model):
    """
    A single message in a conversation between a worker and admin.
    """
    # Sender is always a User — either the worker or an admin
    sender     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    # Receiver is the other party
    receiver   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    # Optional link to a task for context
    task       = models.ForeignKey(Task, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    body       = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.email} → {self.receiver.email}: {self.body[:40]}"