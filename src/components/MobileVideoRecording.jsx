import React, { useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { uploadImage } from '../services/cloudinary';

const MobileVideoRecording = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const videoRef = useRef(null);

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      setStream(mediaStream);
      
      // Show preview - important to set stream before recording starts
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Force play
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(err => {
            console.error('Error playing video:', err);
          });
        };
      }

      // Wait a moment for camera to initialize
      await new Promise(resolve => setTimeout(resolve, 500));

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { 
          type: 'video/webm' 
        });
        
        if (blob.size === 0) {
          setError('Recording failed - no data captured. Please try again.');
          mediaStream.getTracks().forEach(track => track.stop());
          setStream(null);
          return;
        }
        
        mediaStream.getTracks().forEach(track => track.stop());
        setStream(null);
        await handleUpload(blob);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera: ' + err.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleUpload = async (blob) => {
    if (!blob || blob.size === 0) {
      setError('No video data to upload. Please try recording again.');
      setUploading(false);
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const file = new File([blob], 'video-recording.webm', { type: 'video/webm' });
      
      console.log('Uploading video, size:', blob.size, 'bytes');
      const result = await uploadImage(file);
      console.log('Upload successful:', result.url);
      
      // Send to API endpoint
      const response = await fetch(`/api/upload-session?sessionId=${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageUrl: result.url }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error('Failed to save upload: ' + errorText);
      }
      
      setUploaded(true);
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {!uploaded ? (
          <>
            {!recording && !uploading && (
              <div className="mb-8">
                <h1 className="text-4xl mb-4 text-white">
                  <span className="font-subhead tracking-[0.075em]">ever</span>
                  <span className="font-heading italic tracking-[0.05em]">held</span>
                </h1>
                <p className="text-lg font-body text-gray-300 mb-8">
                  Record your story
                </p>
              </div>
            )}

            {stream && recording && (
              <div className="mb-6 relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full rounded-2xl bg-black"
                  style={{ maxHeight: '60vh' }}
                />
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-subhead tracking-[0.01em]">REC</span>
                </div>
              </div>
            )}

            {uploading ? (
              <div className="space-y-4 text-white">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto animate-pulse">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="font-subhead text-sm">Uploading video...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recording && (
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
                    <p className="font-subhead text-sm text-white">Recording...</p>
                  </div>
                )}
                
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-colors ${
                    recording 
                      ? 'bg-gray-700 hover:bg-gray-600' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {recording ? (
                    <div className="w-8 h-8 bg-white rounded"></div>
                  ) : (
                    <div className="w-12 h-12 bg-white rounded-full"></div>
                  )}
                </button>
                
                <p className="font-body text-sm text-gray-400 mt-4">
                  {recording ? 'Tap to stop' : 'Tap to record'}
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm font-body text-red-400">{error}</p>
            )}
          </>
        ) : (
          <div className="space-y-6 text-white">
            <div className="w-20 h-20 bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-heading italic tracking-[0.05em] mb-2">Video Uploaded!</p>
              <p className="text-sm font-body text-gray-300">Return to your computer to continue</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileVideoRecording;
