// src/components/ConversionStatus.tsx
import { ConversionStatusProps } from "../../interfaces/QueueList";

const ConversionStatus = ({
  isConverting,
  downloadUrl,
  error,
}: ConversionStatusProps) => {
  if (isConverting) {
    return (
      <div className="flex flex-col items-center mt-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-3"></div>
        <p className="text-gray-700 text-lg">Converting your file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 bg-red-100 text-red-700 p-4 rounded-md">
        <h3 className="font-bold text-lg mb-1">Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (downloadUrl) {
    return (
      <div className="mt-6 bg-green-100 text-green-700 p-4 rounded-md">
        <h3 className="font-bold text-lg mb-3">Conversion Successful!</h3>
        <a
          href={downloadUrl}
          download
          className="block w-full py-3 bg-green-600 hover:bg-green-700 transition-colors text-white text-center rounded-lg font-medium"
        >
          Download Converted File
        </a>
      </div>
    );
  }

  return null;
};

export default ConversionStatus;
