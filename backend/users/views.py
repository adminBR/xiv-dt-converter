from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
import jwt
from datetime import datetime, timedelta
import psycopg2
import bcrypt
import os
import re
from functools import wraps

# Database connection settings
DB_HOST = '192.168.15.168'
DB_NAME = 'xiv-dt-updater'
DB_USER = 'postgres'
DB_PASSWORD = 'postgres'

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'lmao1234')  # Better to use environment variable
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(days=1)  # Token valid for 1 day

# Password validation settings
MIN_PASSWORD_LENGTH = 6
PASSWORD_REGEX = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).+$')  # At least one letter and one number

def get_db_connection():
    """Establish a connection to the PostgreSQL database"""
    try:
        conn = psycopg2.connect(
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD
        )
        return conn
    except psycopg2.Error as e:
        print(f"Database connection error: {e}")
        return None

def validate_password(password):
    """Validate password strength"""
    errors = []
    
    if len(password) < MIN_PASSWORD_LENGTH:
        errors.append(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
    
    if not PASSWORD_REGEX.match(password):
        errors.append("Password must contain at least one letter and one number")
    
    return errors

def token_required(f):
    """Decorator for views that require token authentication"""
    @wraps(f)
    def decorated(self, request, *args, **kwargs):
        token = None
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove 'Bearer ' prefix
        
        if not token:
            return Response({'error': 'Authentication token is missing'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            # Decode token
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            request.user_id = payload['user_id']
            request.user_name = payload['user_name']
        except jwt.ExpiredSignatureError:
            return Response({'error': 'Authentication token has expired'}, status=status.HTTP_401_UNAUTHORIZED)
        except jwt.InvalidTokenError:
            return Response({'error': 'Invalid authentication token'}, status=status.HTTP_401_UNAUTHORIZED)
        
        return f(self, request, *args, **kwargs)
    return decorated

def handle_db_connection(func):
    """Decorator for handling database connections in views"""
    @wraps(func)
    def wrapper(self, request, *args, **kwargs):
        conn = get_db_connection()
        if not conn:
            return Response(
                {'error': 'Database connection failed. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        try:
            return func(self, request, conn, *args, **kwargs)
        except psycopg2.Error as e:
            conn.rollback()
            error_message = str(e)
            # Log the full error but return a sanitized message to the user
            print(f"Database error: {error_message}")
            return Response(
                {'error': 'A database error occurred. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            conn.close()
    
    return wrapper

class UserRegister(APIView):
    """API view for user registration"""
    parser_classes = (MultiPartParser, FormParser)
    
    @handle_db_connection
    def post(self, request, conn):
        user_name = request.data.get('user_name')
        user_pass = request.data.get('user_pass')
        
        # Basic validation
        errors = {}
        
        if not user_name:
            errors['user_name'] = 'Username is required'
        elif len(user_name) < 3:
            errors['user_name'] = 'Username must be at least 3 characters long'
        
        if not user_pass:
            errors['user_pass'] = 'Password is required'
        else:
            password_errors = validate_password(user_pass)
            if password_errors:
                errors['user_pass'] = password_errors
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with conn.cursor() as cur:
                # Check if user already exists with better error handling
                cur.execute("SELECT usr_name FROM srv_users WHERE usr_name = %s", (user_name,))
                if cur.fetchone():
                    return Response(
                        {'errors': {'user_name': 'Username already exists. Please choose a different username.'}},
                        status=status.HTTP_409_CONFLICT
                    )
                
                # Hash the password
                hashed_pass = bcrypt.hashpw(user_pass.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                # Insert new user
                cur.execute(
                    "INSERT INTO srv_users (usr_name, usr_pass, usr_created_at) VALUES (%s, %s, %s) RETURNING usr_id",
                    (user_name, hashed_pass, datetime.now())
                )
                user_id = cur.fetchone()[0]
                conn.commit()
                
                # Generate JWT token with user_id included
                token_payload = {
                    'user_id': user_id,
                    'user_name': user_name,
                    'exp': datetime.utcnow() + JWT_EXPIRATION_DELTA
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                return Response({
                    'message': 'User registered successfully',
                    'user': {'id': user_id, 'username': user_name},
                    'token': token
                }, status=status.HTTP_201_CREATED)
        except Exception as e:
            # Generic exception handling for non-database errors
            print(f"Registration error: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred during registration. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserLogin(APIView):
    """API view for user login"""
    parser_classes = (MultiPartParser, FormParser)
    
    @handle_db_connection
    def post(self, request, conn):
        user_name = request.data.get('user_name')
        user_pass = request.data.get('user_pass')
        
        # Basic validation
        errors = {}
        
        if not user_name:
            errors['user_name'] = 'Username is required'
        
        if not user_pass:
            errors['user_pass'] = 'Password is required'
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with conn.cursor() as cur:
                # Get user from database
                cur.execute("SELECT usr_id, usr_name, usr_pass FROM srv_users WHERE usr_name = %s", (user_name,))
                user = cur.fetchone()
                
                if not user:
                    # Don't reveal whether username exists or password is wrong
                    return Response(
                        {'error': 'Invalid username or password'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                if not bcrypt.checkpw(user_pass.encode('utf-8'), user[2].encode('utf-8')):
                    # Add a small delay to prevent timing attacks
                    import time
                    time.sleep(0.1)
                    
                    return Response(
                        {'error': 'Invalid username or password'},
                        status=status.HTTP_401_UNAUTHORIZED
                    )
                
                # Generate JWT token with user_id included
                token_payload = {
                    'user_id': user[0],
                    'user_name': user[1],
                    'exp': datetime.utcnow() + JWT_EXPIRATION_DELTA
                }
                token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
                
                return Response({
                    'message': 'Login successful',
                    'user': {'id': user[0], 'username': user[1]},
                    'token': token
                })
        except Exception as e:
            # Generic exception handling for non-database errors
            print(f"Login error: {str(e)}")
            return Response(
                {'error': 'An unexpected error occurred during login. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UserDetails(APIView):
    """API view to get user details"""
    
    @token_required
    @handle_db_connection
    def get(self, request, conn):
        try:
            with conn.cursor() as cur:
                # Get additional user information if needed
                cur.execute("SELECT usr_created_at FROM srv_users WHERE usr_id = %s", (request.user_id,))
                user_info = cur.fetchone()
                
                if not user_info:
                    return Response(
                        {'error': 'User not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                return Response({
                    'user_id': request.user_id,
                    'user_name': request.user_name,
                    'created_at': user_info[0].isoformat() if user_info[0] else None
                })
        except Exception as e:
            print(f"User details error: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving user details'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class UserDownloads(APIView):
    """API view to get user downloads"""
    
    @token_required
    @handle_db_connection
    def get(self, request, conn):
        try:
            with conn.cursor() as cur:
                # Fetch user's conversions
                cur.execute(
                    """
                    SELECT 
                        cnv_file, 
                        cnv_completed_at, 
                        cnv_task_id, 
                        cnv_status,
                        cnv_filesize,
                        cnv_download_link 
                    FROM 
                        srv_conversions 
                    WHERE 
                        usr_id = %s
                    ORDER BY
                        cnv_completed_at DESC
                    """, 
                    (request.user_id,)
                )
                
                columns = [desc[0] for desc in cur.description]
                rows = cur.fetchall()
                
                if not rows:
                    return Response([], status=status.HTTP_200_OK)
                
                conversions = []
                for row in rows:
                    conversion = dict(zip(columns, row))
                    # Format datetime for JSON serialization
                    if conversion.get('cnv_completed_at'):
                        conversion['cnv_completed_at'] = conversion['cnv_completed_at'].isoformat()
                    conversions.append(conversion)
                
                return Response(conversions, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"User downloads error: {str(e)}")
            return Response(
                {'error': 'An error occurred while retrieving user downloads'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ChangePassword(APIView):
    """API view to change user password"""
    
    @token_required
    @handle_db_connection
    def post(self, request, conn):
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Validation
        errors = {}
        
        if not current_password:
            errors['current_password'] = 'Current password is required'
        
        if not new_password:
            errors['new_password'] = 'New password is required'
        else:
            password_errors = validate_password(new_password)
            if password_errors:
                errors['new_password'] = password_errors
        
        if new_password != confirm_password:
            errors['confirm_password'] = 'Passwords do not match'
        
        if errors:
            return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with conn.cursor() as cur:
                # Get current password hash
                cur.execute("SELECT usr_pass FROM srv_users WHERE usr_id = %s", (request.user_id,))
                user = cur.fetchone()
                
                if not user:
                    return Response(
                        {'error': 'User not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
                
                # Verify current password
                if not bcrypt.checkpw(current_password.encode('utf-8'), user[0].encode('utf-8')):
                    return Response(
                        {'errors': {'current_password': 'Current password is incorrect'}},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Hash new password
                hashed_pass = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                # Update password
                cur.execute(
                    "UPDATE srv_users SET usr_pass = %s WHERE usr_id = %s",
                    (hashed_pass, request.user_id)
                )
                conn.commit()
                
                return Response({
                    'message': 'Password changed successfully'
                }, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"Password change error: {str(e)}")
            return Response(
                {'error': 'An error occurred while changing password'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Updated URLs for Django's urls.py:
"""
from django.urls import path
from .views import UserRegister, UserLogin, UserDetails, UserDownloads, ChangePassword

urlpatterns = [
    path('auth/register/', UserRegister.as_view(), name='register'),
    path('auth/login/', UserLogin.as_view(), name='login'),
    path('auth/user/', UserDetails.as_view(), name='user_details'),
    path('auth/downloads/', UserDownloads.as_view(), name='user_downloads'),
    path('auth/change-password/', ChangePassword.as_view(), name='change_password'),
]
"""