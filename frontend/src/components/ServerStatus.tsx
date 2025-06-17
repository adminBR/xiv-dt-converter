// src/components/ServerStatus.tsx
import React from "react";
import { ServerStatusProps } from "../interfaces/ServerStatus";

const ServerStatus: React.FC<ServerStatusProps> = ({ serverStatus }) => {
  if (!serverStatus) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-700 rounded-lg">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-400">Server Queue</div>
          <div className="text-lg font-bold text-indigo-300">
            {serverStatus.queue_size}
          </div>
        </div>

        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-400">Processing</div>
          <div className="text-lg">
            {serverStatus.current_task ? (
              <div className="text-blue-300 flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                Active
              </div>
            ) : (
              <span className="text-gray-400">Idle</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServerStatus;
