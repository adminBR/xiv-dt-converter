// src/components/FileUploader.tsx
import { useState, useRef, ChangeEvent } from "react";

import { FileUploaderProps } from "../interfaces/QueueList";

const FileUploader = ({ onFilesSelected }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
      // Clear the input so the same file can be selected again
      e.target.value = "";
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
          ${
            isDragging
              ? "border-purple-500 bg-purple-900 bg-opacity-30"
              : "border-gray-600 hover:border-purple-400 hover:bg-gray-800"
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

        <h2 className="text-2xl font-semibold text-purple-300 mb-2">
          {isDragging ? "Drop Your Mods Here" : "Drag & Drop Your Mods"}
        </h2>
        <p className="text-gray-400 mb-4">or click to browse files</p>
        <p className="text-sm text-gray-500">
          Supported formats: .ttmp, .ttmp2, .pmp
        </p>
        <p className="text-sm font-medium pt-2">
          {(() => {
            const text =
              "This uses TexTools, so only clothing mods can be converted.";
            const words = text.split(" ");
            let globalCharIndex = 0;

            return words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                style={{ paddingRight: "0.5rem", display: "inline-block" }}
              >
                {word.split("").map((char, charIndex) => {
                  const delay = `${globalCharIndex * 0.001}s, ${
                    globalCharIndex * 0.05
                  }s`;
                  globalCharIndex++;
                  return (
                    <span
                      key={charIndex}
                      className="rainbow-letter"
                      style={{ animationDelay: delay }}
                    >
                      {char}
                    </span>
                  );
                })}
                {/* Account for space character visually if needed */}
                <span
                  className="rainbow-letter"
                  style={{
                    animationDelay: `${globalCharIndex * 0.001}s, ${
                      globalCharIndex * 0.05
                    }s`,
                  }}
                >
                  {" "}
                </span>
              </span>
            ));
          })()}
        </p>
        <p className="text-sm/7 font-small pt-2">
          {(() => {
            const text = "[Can you see now mayo?]";
            const words = text.split(" ");
            let globalCharIndex = 0;

            return words.map((word, wordIndex) => (
              <span
                key={wordIndex}
                style={{ paddingRight: "0.5rem", display: "inline-block" }}
              >
                {word.split("").map((char, charIndex) => {
                  const delay = `${globalCharIndex * 0.001}s, ${
                    globalCharIndex * 0.05
                  }s`;
                  globalCharIndex++;
                  return (
                    <span
                      key={charIndex}
                      className="rainbow-letter"
                      style={{ animationDelay: delay }}
                    >
                      {char}
                    </span>
                  );
                })}
                {/* Account for space character visually if needed */}
                <span
                  className="rainbow-letter"
                  style={{
                    animationDelay: `${globalCharIndex * 0.001}s, ${
                      globalCharIndex * 0.05
                    }s`,
                  }}
                >
                  {" "}
                </span>
              </span>
            ));
          })()}
        </p>
      </div>
    </div>
  );
};

export default FileUploader;
