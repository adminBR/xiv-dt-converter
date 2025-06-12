export interface QueueStatus {
  queue_size: number;
  current_task: string | null;
  queued_tasks: string[];
}

export interface ServerStatusProps {
  serverStatus: QueueStatus | null;
}
