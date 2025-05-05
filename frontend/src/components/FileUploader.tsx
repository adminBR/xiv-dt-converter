// src/components/FileUploader.tsx
import { useState, useRef, ChangeEvent } from 'react';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
}

const FileUploader = ({ onFilesSelected }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
      // Clear the input so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="h-72 w-full">
      <div
        className={`
          h-full border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
          flex flex-col items-center justify-center
          ${isDragging
            ? 'border-purple-500 bg-purple-900 bg-opacity-30'
            : 'border-gray-600 hover:border-purple-400 hover:bg-gray-800'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
          multiple
          accept=".ttmp,.ttmp2,.pmp"
        />

        <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20 text-purple-400 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        <h2 className="text-2xl font-semibold text-purple-300 mb-2">
          {isDragging ? "Drop Your Mods Here" : "Drag & Drop Your Mods"}
        </h2>
        <p className="text-gray-400 mb-4">or click to browse files</p>
        <p className="text-sm text-gray-500">Supported formats: .ttmp, .ttmp2, .pmp</p>
        <p className="text-sm text-gray-500">This uses TexTools, so only clothing mods can be converted.</p>
      </div>
    </div>
  );
};

export default FileUploader;