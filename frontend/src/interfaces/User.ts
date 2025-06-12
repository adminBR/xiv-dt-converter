//UserDrawer.tsx
export interface ConvertedFile {
  task_id: string;
  original_filename: string;
  created_at: string;
  status: "completed" | "failed" | "processing" | "queued";
  download_url?: string;
  error?: string;
}

export interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  token: string;
}
