import React, { useState, useRef } from 'react';

interface CameraCaptureProps {
  onImageSelected: (base64: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageSelected, onCancel, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for API if needed, but Gemini usually takes full data url or base64 part.
        // The service handles formatting.
        setPreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirm = () => {
    if (preview) {
      // Remove data URL prefix for cleaner API usage if service requires it
      const base64Clean = preview.split(',')[1]; 
      onImageSelected(base64Clean);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-40 flex flex-col">
      <div className="flex justify-between items-center p-4 text-white">
        <button onClick={onCancel} className="p-2"><i className="fa-solid fa-times text-2xl"></i></button>
        <span className="font-bold text-lg">Snap Routine Items</span>
        <div className="w-8"></div>
      </div>

      <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-hidden">
        {isLoading ? (
          <div className="text-center text-white p-8">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-bold mb-2">Thinking...</h3>
            <p className="text-gray-400">Gemini is analyzing your photo to build a schedule.</p>
          </div>
        ) : preview ? (
          <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="text-center text-gray-500">
            <i className="fa-solid fa-camera text-6xl mb-4"></i>
            <p>Tap button below to capture</p>
          </div>
        )}
      </div>

      {!isLoading && (
        <div className="bg-black p-8 flex justify-center gap-8 items-center pb-12">
          {!preview ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 bg-white rounded-full border-4 border-gray-300 flex items-center justify-center active:bg-gray-200"
            >
              <div className="w-16 h-16 bg-primary rounded-full"></div>
            </button>
          ) : (
            <>
              <button 
                onClick={() => setPreview(null)}
                className="px-6 py-3 bg-gray-700 text-white rounded-full font-bold"
              >
                Retake
              </button>
              <button 
                onClick={handleConfirm}
                className="px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg hover:bg-secondary flex items-center gap-2"
              >
                Generate Schedule <i className="fa-solid fa-magic"></i>
              </button>
            </>
          )}
          
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/*" 
            capture="environment"
            className="hidden" 
            onChange={handleFileChange} 
          />
        </div>
      )}
    </div>
  );
};
