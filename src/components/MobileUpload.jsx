import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadImage } from '../services/cloudinary';

const MobileUpload = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);

  const handleCapture = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // Upload to Cloudinary
      const result = await uploadImage(file);
      
      // Send to API endpoint
      const response = await fetch(`/api/upload-session?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: result.url }),
      });

      if (!response.ok) {
        throw new Error('Failed to save upload');
      }
      
      setUploaded(true);
    } catch (err) {
      setError('Upload failed. Please try again.');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl mb-4">
          <span className="font-subhead tracking-[0.075em]">ever</span>
          <span className="font-heading italic tracking-[0.05em]">held</span>
        </h1>
        
        {!uploaded ? (
          <>
            <p className="text-lg font-body text-gray-600 mb-8">
              Take a photo of your family treasure
            </p>

            <label className="block">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCapture}
                className="hidden"
                disabled={uploading}
              />
              <div className={`border-2 border-dashed border-gray-300 rounded-2xl p-12 cursor-pointer hover:border-gray-400 transition-colors ${
                uploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
                {uploading ? (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto animate-pulse">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </div>
                    <p className="font-subhead text-sm text-gray-600">Uploading...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="font-subhead text-sm font-medium">Take Photo</p>
                  </div>
                )}
              </div>
            </label>

            {error && (
              <p className="mt-4 text-sm font-body text-red-600">{error}</p>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-heading italic tracking-[0.05em] mb-2">Photo Uploaded!</p>
              <p className="text-sm font-body text-gray-600">Return to your computer to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileUpload;
