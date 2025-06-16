// src/components/UserDrawer.tsx
import { useState, useEffect } from "react";

import { UserDrawerProps } from "../../interfaces/User";
import { ConvertedFile } from "../../interfaces/User";

const UserDrawer = ({ isOpen, onClose, username, token }: UserDrawerProps) => {
  const [files, setFiles] = useState<ConvertedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && token) {
      fetchUserFiles();
    }
  }, [isOpen, token]);

  const fetchUserFiles = async () => {
    setIsLoading(true);
    setError("");

    try {
      // This endpoint needs to be implemented on your API to return
      // files that belong to the authenticated user
      const response = await fetch(
        import.meta.env.VITE_API_URL + "/me/downloads/",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch your files");
      }

      const data = await response.json();
      const formatedData: ConvertedFile[] = data.map(
        (item: {
          cnv_task_id: string;
          cnv_file: string;
          cnv_completed_at: string;
          cnv_status: string;
          cnv_download_link: string;
        }) => ({
          task_id: item.cnv_task_id,
          original_filename: item.cnv_file,
          created_at: item.cnv_completed_at,
          status: item.cnv_status,
          download_url: item.cnv_download_link,
        })
      );
      setFiles(formatedData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      console.error("Error fetching user files:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="px-2 py-0.5 bg-green-900 text-green-300 rounded-full text-xs">
            Completed
          </span>
        );
      case "failed":
        return (
          <span className="px-2 py-0.5 bg-red-900 text-red-300 rounded-full text-xs">
            Failed
          </span>
        );
      case "processing":
        return (
          <span className="px-2 py-0.5 bg-blue-900 text-blue-300 rounded-full text-xs">
            Processing
          </span>
        );
      case "queued":
        return (
          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs">
            Queued
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full text-xs">
            {status}
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 w-full md:w-96 bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-purple-300">
              {username}'s Files
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-900 bg-opacity-40 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <svg
                className="animate-spin h-8 w-8 text-purple-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                ></path>
              </svg>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 mx-auto mb-4 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                />
              </svg>
              <p>No files found</p>
              <p className="text-sm mt-2">
                Files you convert while logged in will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 hover:border-purple-500 transition-colors"
                >
                  <div className="p-3">
                    <h3
                      className="font-medium text-white truncate"
                      title={file.original_filename}
                    >
                      {file.original_filename}
                    </h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-400">
                        {formatDate(file.created_at)}
                      </span>
                      {getStatusBadge(file.status)}
                    </div>

                    {file.error && (
                      <div className="mt-2 text-xs text-red-300">
                        Error: {file.error}
                      </div>
                    )}
                  </div>

                  {file.download_url && (
                    <div className="border-t border-gray-700 bg-gray-800 px-3 py-2">
                      <a
                        href={file.download_url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm flex items-center text-purple-300 hover:text-purple-200"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                        Download
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-gray-700">
            <button
              onClick={fetchUserFiles}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh Files
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDrawer;
