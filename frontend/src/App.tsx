// src/App.tsx
import { useState, useEffect } from 'react';
import FileUploader from './components/FileUploader';
import ModList from './components/ModList';
import Footer from './components/Footer';
import Header from './components/Header';

export interface ModFile {
  id: string;
  file: File;
  status: 'queued' | 'converting' | 'completed' | 'error';
  downloadUrl?: string;
  errorMessage?: string;
}

function App() {
  const [modFiles, setModFiles] = useState<ModFile[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const [currentlyConverting, setCurrentlyConverting] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Process queue when we're in batch processing mode
  useEffect(() => {
    const processNextInQueue = async () => {
      if (!isBatchProcessing || isConverting) return;
      
      // Find next queued mod
      const nextQueuedMod = modFiles.find(mod => mod.status === 'queued');
      if (!nextQueuedMod) {
        // No more mods to process, stop batch processing
        setIsBatchProcessing(false);
        return;
      }
      
      // Start converting the next mod
      await convertSingleMod(nextQueuedMod.id);
    };
    
    processNextInQueue();
  }, [isBatchProcessing, isConverting, modFiles]);

  const convertFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('https://dt.meikoneko.space/convert', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to convert file');
    }

    const data = await response.json();
    return data.converted_file;
  };

  const handleFilesAdded = (files: File[]) => {
    const newModFiles = files.map(file => ({
      id: Math.random().toString(36).substring(2, 11),
      file,
      status: 'queued' as const
    }));
    
    setModFiles(prev => [...prev, ...newModFiles]);
  };

  const updateModStatus = (
    id: string, 
    status: ModFile['status'], 
    downloadUrl?: string, 
    errorMessage?: string
  ) => {
    setModFiles(prev => 
      prev.map(mod => 
        mod.id === id 
          ? { ...mod, status, downloadUrl, errorMessage } 
          : mod
      )
    );
  };

  const removeMod = (id: string) => {
    // Don't allow removal of currently converting mod
    if (id === currentlyConverting) return;
    
    setModFiles(prev => prev.filter(mod => mod.id !== id));
  };

  const convertSingleMod = async (id: string) => {
    if (isConverting) return;
    
    const mod = modFiles.find(m => m.id === id);
    if (!mod || mod.status !== 'queued') return;
    
    setIsConverting(true);
    setCurrentlyConverting(id);
    
    updateModStatus(id, 'converting');
    
    try {
      const downloadUrl = await convertFile(mod.file);
      updateModStatus(id, 'completed', downloadUrl);
    } catch (error) {
      updateModStatus(
        id, 
        'error', 
        undefined, 
        error instanceof Error ? error.message : 'Conversion failed'
      );
    } finally {
      setIsConverting(false);
      setCurrentlyConverting(null);
    }
  };

  const startBatchConversion = () => {
    if (isConverting) return;
    
    const hasQueuedFiles = modFiles.some(mod => mod.status === 'queued');
    if (hasQueuedFiles) {
      setIsBatchProcessing(true);
    }
  };

  const cancelConversion = () => {
    if (!isConverting && !isBatchProcessing) return;
    
    // If a file is currently converting, mark it as queued again
    if (currentlyConverting) {
      updateModStatus(currentlyConverting, 'queued');
    }
    
    setIsConverting(false);
    setIsBatchProcessing(false);
    setCurrentlyConverting(null);
  };

  const clearCompletedMods = () => {
    setModFiles(prev => prev.filter(mod => mod.status !== 'completed'));
  };

  const getQueueStats = () => {
    const queued = modFiles.filter(mod => mod.status === 'queued').length;
    const completed = modFiles.filter(mod => mod.status === 'completed').length;
    const failed = modFiles.filter(mod => mod.status === 'error').length;
    const converting = modFiles.filter(mod => mod.status === 'converting').length;
    
    return { queued, completed, failed, converting };
  };

  const stats = getQueueStats();

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      <Header />
      
      <main className="flex-grow flex flex-col md:flex-row py-6 px-4 md:px-8 gap-6">
        <div className="w-full md:w-1/2 flex flex-col">
          <FileUploader onFilesSelected={handleFilesAdded} />
          
          <div className="mt-6 p-4 bg-gray-800 bg-opacity-50 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-purple-300">Conversion Controls</h3>
              
              <div className="flex space-x-3">
                {/* Convert All Button */}
                <button
                  onClick={startBatchConversion}
                  disabled={isConverting || !stats.queued}
                  title="Convert all queued mods"
                  className={`
                    p-2 rounded-full w-10 h-10 flex items-center justify-center
                    ${isConverting || !stats.queued
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white transition-colors'
                    }
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                
                {/* Cancel Button */}
                {(isConverting || isBatchProcessing) && (
                  <button
                    onClick={cancelConversion}
                    title={isConverting ? "Cancel conversion" : "Stop queue"}
                    className="p-2 rounded-full w-10 h-10 bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                    </svg>
                  </button>
                )}
                
                {/* Clear Completed Button */}
                {stats.completed > 0 && (
                  <button
                    onClick={clearCompletedMods}
                    title="Clear completed mods"
                    className="p-2 rounded-full w-10 h-10 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="text-xl font-bold text-purple-300">{stats.queued}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Queued</p>
              </div>
              
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isConverting ? 'bg-blue-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  <span className="text-xl font-bold text-blue-300">{stats.converting}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Converting</p>
              </div>
              
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-xl font-bold text-green-300">{stats.completed}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Completed</p>
              </div>
              
              <div className="bg-gray-700 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-xl font-bold text-red-300">{stats.failed}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Failed</p>
              </div>
            </div>
            
            {isBatchProcessing && (
              <div className="mt-4 p-3 bg-indigo-900 bg-opacity-40 rounded-lg border border-indigo-700 flex items-center">
                <div className="w-4 h-4 border-2 border-indigo-300 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-indigo-300">Processing queue... {stats.queued} mods remaining</span>
              </div>
            )}
          </div>
        </div>
        
        <div className="w-full md:w-1/2">
          <ModList 
            mods={modFiles} 
            onRemove={removeMod} 
            onConvert={convertSingleMod}
            isConverting={isConverting}
            currentlyConverting={currentlyConverting}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

export default App;