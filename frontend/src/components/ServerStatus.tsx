// src/components/ServerStatus.tsx
import React from 'react';

interface QueueStatus {
  queue_size: number;
  current_task: string | null;
  queued_tasks: string[];
}

interface ServerStatusProps {
  serverStatus: QueueStatus | null;
}

const ServerStatus: React.FC<ServerStatusProps> = ({ serverStatus }) => {
  if (!serverStatus) {
    return null;
  }

  return (
    <div className="mt-4 p-3 bg-gray-700 rounded-lg">
      <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
        </svg>
        Server Status
      </h4>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 p-2 rounded">
          <div className="text-xs text-gray-400">Server Queue</div>
          <div className="text-lg font-bold text-indigo-300">{serverStatus.queue_size}</div>
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
      
      {serverStatus.queue_size > 0 && (
        <div className="mt-2 text-xs text-gray-400">
          {serverStatus.queue_size} task{serverStatus.queue_size !== 1 ? 's' : ''} waiting in server queue
        </div>
      )}
    </div>
  );
};

export default ServerStatus;