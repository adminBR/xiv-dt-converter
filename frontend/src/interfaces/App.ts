// Define the interface for queue status response
export interface QueueStatus {
  queue_size: number;
  current_task: string | null;
  queued_tasks: string[];
}

// Define the interface for task status response
export interface TaskStatus {
  task_id: string;
  status: "queued" | "processing" | "completed" | "failed" | "uploading";
  original_filename: string;
  created_at: string;
  download_url?: string;
  error?: string;
  completed_at?: string;
}

export interface ModFile {
  id: string;
  file: File;
  status: "queued" | "converting" | "completed" | "error" | "uploading";
  uploadProgress?: number; // NEW: upload progress (0–100)
  downloadUrl?: string;
  errorMessage?: string;
  taskId?: string;
}
