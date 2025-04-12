// src/components/ModList.tsx
import { ModFile } from '../App';

interface ModListProps {
  mods: ModFile[];
  onRemove: (id: string) => void;
  onConvert: (id: string) => void;
  isConverting: boolean;
  currentlyConverting: string | null;
}

const ModList = ({ mods, onRemove, onConvert, isConverting, currentlyConverting }: ModListProps) => {
  if (!mods.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-800 bg-opacity-50 rounded-lg p-8">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
        <h3 className="text-xl font-medium text-gray-400">No Mods Added Yet</h3>
        <p className="text-gray-500 mt-2">Upload mods to begin</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 bg-opacity-50 rounded-lg p-4 h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-purple-300">Mod Queue</h2>
        <span className="text-sm text-gray-400">{mods.length} mod{mods.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div className="overflow-y-auto max-h-96 pr-2 space-y-3">
        {mods.map(mod => (
          <div 
            key={mod.id} 
            className={`
              bg-gray-700 rounded-lg p-3 border 
              ${mod.status === 'converting' ? 'border-blue-500 animate-pulse' : 
                mod.status === 'completed' ? 'border-green-500' : 
                mod.status === 'error' ? 'border-red-500' : 
                'border-gray-600'}
            `}
          >
            <div className="flex justify-between items-start">
              <div className="mr-2 overflow-hidden">
                <p className="font-medium text-white truncate" title={mod.file.name}>
                  {mod.file.name}
                </p>
                <p className="text-sm text-gray-400">
                  {(mod.file.size / 1024).toFixed(0)} KB
                  {mod.taskId && <span className="ml-2 text-indigo-300">Task: {mod.taskId.substring(0, 8)}...</span>}
                </p>
              </div>
              
              <div className="flex space-x-2">
                {mod.status === 'queued' && (
                  <button
                    onClick={() => onConvert(mod.id)}
                    disabled={isConverting}
                    title="Convert mod"
                    className={`
                      p-2 rounded-full w-9 h-9 flex items-center justify-center
                      ${isConverting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-500 hover:bg-indigo-700 text-white transition-colors'
                      }
                    `}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                
                {mod.status !== 'converting' && (
                  <button
                    onClick={() => onRemove(mod.id)}
                    disabled={mod.id === currentlyConverting}
                    title="Remove mod"
                    className={`
                      p-2 rounded-full w-9 h-9 flex items-center justify-center
                      ${mod.id === currentlyConverting
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-500 hover:bg-purple-700 text-white transition-colors'
                      }
                    `}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <div className="mt-2">
              {mod.status === 'queued' && (
                <div className="flex items-center text-gray-400 text-sm">
                  <span className="w-3 h-3 bg-gray-500 rounded-full mr-2"></span>
                  Queued
                </div>
              )}
              
              {mod.status === 'converting' && (
                <div className="flex items-center text-blue-300 text-sm">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
                  Converting...
                </div>
              )}
              
              {mod.status === 'completed' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-green-300 text-sm">
                    <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                    Completed
                  </div>
                  
                  <a
                    href={mod.downloadUrl}
                    download
                    title="Download converted mod"
                    className="p-2 rounded-full w-8 h-8 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              )}
              
              {mod.status === 'error' && (
                <div className="flex items-center text-red-300 text-sm">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  Error: {mod.errorMessage || 'Failed to convert'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ModList;