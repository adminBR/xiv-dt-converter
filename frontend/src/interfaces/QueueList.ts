import { ModFile } from "./App";

export interface ModListProps {
  mods: ModFile[];
  onRemove: (id: string) => void;
  onConvert: (id: string) => void;
  isConverting: boolean;
  currentlyConverting: string | null;
}

//FileUploader.tsx
export interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

//ConversionStatus.tsx
export interface ConversionStatusProps {
  isConverting: boolean;
  downloadUrl: string | null;
  error: string | null;
}
