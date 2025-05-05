from fastapi import FastAPI, UploadFile, File, Request, BackgroundTasks, Depends
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
import subprocess
import os
import shutil
import logging
from uuid import uuid4
import socket
from datetime import datetime
import hashlib
import threading
from collections import deque
import time
import json


# ---------------------- Logging Setup ----------------------

LOG_FILE = "conversion.log"

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)

# ---------------------- Task Queue System ----------------------

class ConversionTask:
    def __init__(self, task_id, file_path, output_path, original_filename, client_ip):
        self.task_id = task_id
        self.file_path = file_path
        self.output_path = output_path
        self.original_filename = original_filename
        self.client_ip = client_ip
        self.status = "queued"  # queued, processing, completed, failed
        self.result = None
        self.error = None
        self.created_at = datetime.now()
        self.completed_at = None

class TaskQueue:
    def __init__(self):
        self.queue = deque()
        self.current_task = None
        self.task_history = {}  # Store completed tasks by ID
        self.lock = threading.Lock()
        self.worker_thread = threading.Thread(target=self._worker, daemon=True)
        self.worker_thread.start()
    
    def add_task(self, task):
        with self.lock:
            self.queue.append(task)
            self.task_history[task.task_id] = task
        return task.task_id
    
    def get_task(self, task_id):
        return self.task_history.get(task_id)
    
    def get_queue_status(self):
        with self.lock:
            queue_size = len(self.queue)
            current = self.current_task.task_id if self.current_task else None
            queued_tasks = [t.task_id for t in self.queue]
            
            return {
                "queue_size": queue_size,
                "current_task": current,
                "queued_tasks": queued_tasks
            }
    
    def _worker(self):
        while True:
            # Get next task if available
            task = None
            with self.lock:
                if self.queue and self.current_task is None:
                    task = self.queue.popleft()
                    self.current_task = task
            
            if task:
                # Process the task
                try:
                    task.status = "processing"
                    logging.info(f"[{task.client_ip}] Processing task {task.task_id} for '{task.original_filename}'")
                    
                    result = subprocess.run(
                        ['ConsoleTools.exe', '/upgrade', task.file_path, task.output_path],
                        stdout=subprocess.PIPE,
                        stderr=subprocess.PIPE,
                        text=True,
                        cwd=os.path.dirname(__file__)
                    )
                    
                    if result.returncode != 0:
                        task.status = "failed"
                        task.error = result.stderr.strip()
                        logging.error(f"[{task.client_ip}] Conversion failed for '{task.original_filename}': {task.error}")
                    else:
                        task.status = "completed"
                        logging.info(f"[{task.client_ip}] Converted '{task.original_filename}' successfully")
                
                except Exception as e:
                    task.status = "failed"
                    task.error = str(e)
                    logging.exception(f"[{task.client_ip}] Exception during conversion for '{task.original_filename}'")
                
                task.completed_at = datetime.now()
                
                # Clear current task
                with self.lock:
                    self.current_task = None
            
            # Don't hammer the CPU in the loop
            time.sleep(0.1)

# Initialize the queue
task_queue = TaskQueue()

# ---------------------- App Init + CORS ----------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------- Config ----------------------

BASE_DIR = "converted"
os.makedirs(BASE_DIR, exist_ok=True)

SHARE_NAME = "T"
SHARE_PATH = r"\\192.168.15.88\file_share\textoolsStuff"

# ---------------------- Utils ----------------------

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except:
        IP = 'localhost'
    finally:
        s.close()
    return IP

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
    """Generate SHA-256 hash of a file"""
    h = hashlib.sha256()
    with open(file_path, 'rb') as file:
        chunk = file.read(4096)
        while chunk:
            h.update(chunk)
            chunk = file.read(4096)
    return h.hexdigest()

# ---------------------- Routes ----------------------

@app.post("/convert")
async def convert_file(request: Request, file: UploadFile = File(...)):
    ensure_network_drive()

    client_ip = request.client.host
    original_filename = file.filename
    file_ext = os.path.splitext(original_filename)[1]
    
    # Create a temporary file to get hash
    temp_path = os.path.join(BASE_DIR, f"temp_{uuid4().hex}{file_ext}")
    with open(temp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    
    # Generate hash for the file
    file_hash_value = file_hash(temp_path)
    
    # Create directory structure based on hash
    hash_dir = os.path.join(BASE_DIR, file_hash_value)
    os.makedirs(hash_dir, exist_ok=True)
    
    # Move the temp file to final input location
    input_path = os.path.join(hash_dir, original_filename)
    shutil.move(temp_path, input_path)
    
    # Setup output path
    output_filename = f"dt_{original_filename}"
    output_path = os.path.join(hash_dir, output_filename)
    
    # Create a task
    task_id = str(uuid4())
    task = ConversionTask(
        task_id=task_id,
        file_path=input_path,
        output_path=output_path,
        original_filename=original_filename,
        client_ip=client_ip
    )
    
    # Add to queue
    task_queue.add_task(task)
    
    logging.info(f"[{client_ip}] Queued conversion task {task_id} for '{original_filename}'")
    
    return {
        "task_id": task_id,
        "status": "queued",
        "message": "File conversion has been queued",
        "check_status_url": f"/task/{task_id}"
    }

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    task = task_queue.get_task(task_id)
    if not task:
        return JSONResponse(status_code=404, content={"error": "Task not found"})
    
    response = {
        "task_id": task.task_id,
        "status": task.status,
        "original_filename": task.original_filename,
        "created_at": task.created_at.isoformat(),
    }
    
    if task.status == "completed":
        file_hash_value = os.path.dirname(task.output_path).split(os.path.sep)[-1]
        output_filename = os.path.basename(task.output_path)
        download_url = f"https://dl.meikoneko.space/download/{file_hash_value}/{output_filename}"
        response["download_url"] = download_url
        response["completed_at"] = task.completed_at.isoformat()
    
    elif task.status == "failed":
        response["error"] = task.error
        response["completed_at"] = task.completed_at.isoformat()
    
    return response

@app.get("/queue-status")
async def get_queue_status():
    return task_queue.get_queue_status()

@app.get("/download/{file_hash}/{filename}")
async def download_file(file_hash: str, filename: str):
    file_path = os.path.join(BASE_DIR, file_hash, filename)
    
    if not os.path.exists(file_path):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    
    # Use the original filename (without the dt_ prefix) for the downloaded file
    download_filename = filename
    #if filename.startswith("dt_"):
    #    download_filename = filename[3:]
    
    return FileResponse(
        path=file_path,
        media_type='application/octet-stream',
        filename=download_filename
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)