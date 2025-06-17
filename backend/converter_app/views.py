from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework import status
from django.http import FileResponse, JsonResponse,StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
from django.shortcuts import get_object_or_404
import aiofiles
import psycopg2
from functools import wraps
import jwt
from datetime import datetime,timedelta

import os
import shutil
import subprocess
import hashlib
import threading
import logging
import socket
from collections import deque
from uuid import uuid4
from datetime import datetime
import time
import sys
from pathlib import Path

# ------------------- Logging -------------------
LOG_FILE = "conversion.log"

# File handler with UTF-8 encoding
file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')

# Stream handler (console)
stream_handler = logging.StreamHandler(sys.stdout)
# Optional: ensure the stream uses UTF-8 if supported (Python 3.7+)
if hasattr(stream_handler.stream, 'reconfigure'):
    stream_handler.stream.reconfigure(encoding='utf-8')

# Define formatter
formatter = logging.Formatter('[%(asctime)s] %(levelname)s - %(message)s')

# Apply formatter
file_handler.setFormatter(formatter)
stream_handler.setFormatter(formatter)

logging.basicConfig(
    level=logging.INFO,
    handlers=[file_handler, stream_handler],
    force=True
)


#-------------------- Authentiaction ----------------

# Database connection settings
DB_HOST = '192.168.15.168'
DB_NAME = 'xiv-dt-updater'
DB_USER = 'postgres'
DB_PASSWORD = 'postgres'

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'lmao1234')  # Better to use environment variable
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_DELTA = timedelta(days=90)  # Token valid for 1 day

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

# ------------------- Task System -------------------

BASE_DIR = os.path.join(settings.BASE_DIR, "converted")
os.makedirs(BASE_DIR, exist_ok=True)

SHARE_NAME = "T"
SHARE_PATH = r"\\192.168.15.88\file_share\textoolsStuff"



def ensure_network_drive():
    try:
        if not os.path.exists(f"{SHARE_NAME}:\\"):
            subprocess.run([
                "powershell",
                f"New-PSDrive -Name '{SHARE_NAME}' -PSProvider FileSystem -Root '{SHARE_PATH}' -Persist"
            ], shell=True)
    except Exception as e:
        logging.error(f"Drive mount failed: {e}")

def file_hash(file_path):
    h = hashlib.sha256()
    with open(file_path, 'rb') as file:
        chunk = file.read(4096)
        while chunk:
            h.update(chunk)
            chunk = file.read(4096)
    return h.hexdigest()

class ConversionTask:
    def __init__(self, task_id, file_path, output_path, original_filename, client_ip, user_id=None):
        self.task_id = task_id
        self.file_path = file_path
        self.output_path = output_path
        self.original_filename = original_filename
        self.client_ip = client_ip
        self.user_id = user_id  # New field to track user_id (if authenticated)
        self.status = "queued"
        self.result = None
        self.error = None
        self.created_at = datetime.now()
        self.completed_at = None

class TaskQueue:
    def __init__(self):
        self.queue = deque()
        self.current_task = None
        self.task_history = {}
        self.lock = threading.Lock()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()

    def add_task(self, task):
        with self.lock:
            self.queue.append(task)
            self.task_history[task.task_id] = task
            logging.info(f"Task {task.task_id} added to queue. Queue size: {len(self.queue)}")
        return task.task_id

    def get_task(self, task_id):
        return self.task_history.get(task_id)

    def get_queue_status(self):
        with self.lock:
            return {
                "queue_size": len(self.queue)+(1 if self.current_task is not None else 0),
                "current_task": self.current_task.task_id if self.current_task else None,
                "queued_tasks": [t.task_id for t in self.queue]
            }

    def _worker(self):
        while True:
            task = None
            with self.lock:
                if self.queue and self.current_task is None:
                    task = self.queue.popleft()
                    self.current_task = task
                    logging.info(f"Task {task.task_id} acquired...")

            if task:
                try:
                    task.status = "processing"
                    logging.info(f"[{task.client_ip}] Processing task {task.task_id}")
                    
                    # Verify input file exists and is readable
                    if not os.path.exists(task.file_path):
                        logging.error(f"Input file does not exist: {task.file_path}")
                        task.status = "failed"
                        task.error = "Input file does not exist"
                        continue
                    
                    logging.info(f"Input file exists, size: {os.path.getsize(task.file_path)} bytes")
                    
                    # Make sure output directory exists
                    os.makedirs(os.path.dirname(task.output_path), exist_ok=True)
                    
                    # Check if ConsoleTools.exe exists
                    #tools_path = 'C:\\Program Files\\FFXIV TexTools\\FFXIV_TexTools\\ConsoleTools.exe'
                    tools_path = 'C:\\Users\\Administrator\\Downloads\\FFXIV_TexTools_v3.0.9.5\\ConsoleTools.exe'

                    if not os.path.exists(tools_path):
                        logging.error(f"ConsoleTools.exe not found at: {tools_path}")
                        task.status = "failed"
                        task.error = "Conversion tool not found"
                        continue
                    
                    logging.info(f"Running conversion tool with arguments: /upgrade {task.file_path} {task.output_path}")
                    
                    # Run the conversion process
                    result = subprocess.run(
                        [tools_path, '/upgrade', task.file_path, task.output_path],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        cwd=os.path.dirname(tools_path),  # CD into ConsoleTools.exe's folder
                        timeout=3600
                    )

                    if result.returncode != 0:
                        logging.error(f"Conversion failed with return code {result.returncode}")
                        logging.error(f"STDOUT: {result.stdout}")
                        logging.error(f"STDERR: {result.stderr}")
                        task.status = "failed"
                        task.error = result.stderr.strip() or "This mod can't be converted."
                    else:
                        logging.info(f"Conversion completed successfully")
                        
                        # Verify output file exists
                        if os.path.exists(task.output_path):
                            file_size = os.path.getsize(task.output_path)
                            logging.info(f"Output file created: {task.output_path}, size: {file_size} bytes")
                            task.status = "completed"
                            
                            # Generate download link
                            file_hash_value = os.path.dirname(task.output_path).split(os.path.sep)[-1]
                            filename = os.path.basename(task.output_path)
                            download_link = f"https://dl.meikoneko.space/download/{file_hash_value}/{filename}"
                            
                            # Record conversion in database
                            try:
                                conn = get_db_connection()
                                if conn:
                                    with conn.cursor() as cur:
                                        cur.execute(
                                            """
                                            INSERT INTO srv_conversions 
                                            (cnv_file, cnv_status, cnv_created_at, cnv_completed_at, cnv_task_id, 
                                            usr_id, cnv_filesize, cnv_download_link) 
                                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                                            """,
                                            (
                                                filename, 
                                                task.status, 
                                                task.created_at, 
                                                datetime.now(), 
                                                task.task_id,
                                                task.user_id if hasattr(task, 'user_id') else None,  # Use user_id if available
                                                file_size,
                                                download_link
                                            )
                                        )
                                        conn.commit()
                                        logging.info(f"Conversion record added to database for task {task.task_id}")
                                    conn.close()
                                else:
                                    logging.error("Failed to connect to database to record conversion")
                            except Exception as db_error:
                                logging.error(f"Database error when recording conversion: {str(db_error)}")
                        else:
                            logging.error(f"Output file was not created: {task.output_path}")
                            task.status = "failed"
                            task.error = "Conversion process did not create output file"

                except subprocess.TimeoutExpired:
                    logging.error(f"Conversion process timed out after 1 hour")
                    task.status = "failed"
                    task.error = "Conversion process timed out"
                except Exception as e:
                    logging.exception(f"Error processing task {task.task_id}: {str(e)}")
                    task.status = "failed"
                    task.error = str(e)

                task.completed_at = datetime.now()
                logging.info(f"Task {task.task_id} completed with status: {task.status}")

                # Record failed conversions in database
                if task.status == "failed":
                    try:
                        conn = get_db_connection()
                        if conn:
                            with conn.cursor() as cur:
                                cur.execute(
                                    """
                                    INSERT INTO srv_conversions 
                                    (cnv_file, cnv_status, cnv_created_at, cnv_completed_at, cnv_task_id, usr_id) 
                                    VALUES (%s, %s, %s, %s, %s, %s)
                                    """,
                                    (
                                        os.path.basename(task.output_path), 
                                        task.status, 
                                        task.created_at, 
                                        task.completed_at, 
                                        task.task_id,
                                        task.user_id if hasattr(task, 'user_id') else None  # Use user_id if available
                                    )
                                )
                                conn.commit()
                                logging.info(f"Failed conversion record added to database for task {task.task_id}")
                            conn.close()
                        else:
                            logging.error("Failed to connect to database to record failed conversion")
                    except Exception as db_error:
                        logging.error(f"Database error when recording failed conversion: {str(db_error)}")

                with self.lock:
                    self.current_task = None

            time.sleep(0.1)

task_queue = TaskQueue()

# ------------------- API Views -------------------

@method_decorator(csrf_exempt, name='dispatch')
class ConvertFileView(APIView):
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request):
        try:
            file = request.FILES.get('file')
            if not file:
                logging.error("No file uploaded")
                return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
            
            suffix = Path(file.name).suffix.lower()
            if suffix == '' or suffix not in ['.ttmp2', '.pmp', '.ttmp']:
                logging.error(f"The extention {suffix} is not a valid extention")
                return Response({"error": f"The extention {suffix} is not a valid extention"}, status=status.HTTP_400_BAD_REQUEST)
            
            ensure_network_drive()

            original_filename = file.name
            
            logging.info(f"File received: {original_filename}, size: {file.size} bytes")

            # Generate a unique hash directory
            file_hash_value = hashlib.md5(f"{uuid4().hex}_{original_filename}".encode()).hexdigest()
            hash_dir = os.path.join(BASE_DIR, file_hash_value)

            # Creating new directory and saving the original file
            os.makedirs(hash_dir, exist_ok=True)
            input_path = os.path.join(hash_dir, original_filename)
            
            # Track how much we've written
            total_bytes = 0
            start_time = time.time()
            
            try:
                with open(input_path, 'wb') as destination:
                    for chunk in file.chunks():
                        chunk_size = len(chunk)
                        destination.write(chunk)
                        total_bytes += chunk_size
                        
                        # Log progress for large files
                        if file.size > 50 * 1024 * 1024 and total_bytes % (10 * 1024 * 1024) < chunk_size:  # Log every ~10MB
                            elapsed = time.time() - start_time
                            percent = (total_bytes / file.size) * 100
                            speed = total_bytes / (elapsed * 1024 * 1024) if elapsed > 0 else 0
                            logging.info(f"Upload progress: {percent:.1f}% ({total_bytes}/{file.size} bytes), speed: {speed:.2f} MB/s")
                
                # Verify the file was written correctly
                actual_size = os.path.getsize(input_path)
                logging.info(f"File saved successfully, size on disk: {actual_size} bytes")
                
                if actual_size != file.size:
                    logging.warning(f"File size mismatch! Expected: {file.size}, got: {actual_size}")
            
            except Exception as e:
                logging.error(f"Error saving file: {str(e)}")
                return Response({"error": f"File save error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            output_filename = f"dt_{original_filename}".lower()
            #make sure the extension is ttmp2 even for older files
            if(output_filename.endswith('ttmp')):
                output_filename = output_filename.replace('ttmp','ttmp2')
            output_path = os.path.join(hash_dir, output_filename)

            # Create task
            task_id = str(uuid4())
            client_ip = self.get_client_ip(request)
            logging.info(f"Client IP: {client_ip}, Creating task with ID: {task_id}")

            # Check if user is authenticated
            user_id = None
            try:
                # Try to get token from Authorization header
                auth_header = request.headers.get('Authorization')
                if auth_header and auth_header.startswith('Bearer '):
                    token = auth_header[7:]  # Remove 'Bearer ' prefix
                    # Decode token
                    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                    user_id = payload.get('user_id')
                    logging.info(f"Authenticated user with ID: {user_id} for task: {task_id}")
            except:
                # If any error occurs during token processing, we just proceed with user_id as None
                pass

            task = ConversionTask(task_id, input_path, output_path, original_filename, client_ip, user_id)
            task_queue.add_task(task)

            return Response({
                "task_id": task_id,
                "status": "queued",
                "message": "File conversion has been queued",
                "check_status_url": f"/task/{task_id}"
            })
            
        except Exception as e:
            logging.error(f"Unhandled exception in file upload: {str(e)}", exc_info=True)
            return Response({"error": f"Server error: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def get_client_ip(self, request):
        """Get the client IP address from request header"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        return ip


class TaskStatusView(APIView):
    def get(self, request, task_id):
        task = task_queue.get_task(task_id)

        if not task:
            return Response({"error": "Task not found"}, status=status.HTTP_404_NOT_FOUND)

        response = {
            "task_id": task.task_id,
            "status": task.status,
            "original_filename": task.original_filename,
            "created_at": task.created_at.isoformat(),
        }

        if task.status == "completed":
            file_hash_value = os.path.dirname(task.output_path).split(os.path.sep)[-1]
            filename = os.path.basename(task.output_path)
            response["download_url"] = f"https://dl.meikoneko.space/download/{file_hash_value}/{filename}"
            response["completed_at"] = task.completed_at.isoformat()

        elif task.status == "failed":
            response["error"] = task.error
            response["completed_at"] = task.completed_at.isoformat()

        return Response(response)


class QueueStatusView(APIView):
    def get(self, request):
        return Response(task_queue.get_queue_status())



class DownloadFileView(APIView):
    def get(self, request, file_hash, filename):
        file_path = os.path.join(BASE_DIR, file_hash, filename)
        if not os.path.exists(file_path):
            return JsonResponse({"error": "File not found"}, status=404)

        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
    
