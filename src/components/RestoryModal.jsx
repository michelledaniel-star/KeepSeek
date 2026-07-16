import React, { useState, useRef, useEffect } from 'react';
import { createStory, updateStory } from '../services/airtable';
import { uploadImage } from '../services/cloudinary';

export default function RestoryModal({ item, existingStory, onClose, onSuccess }) {
  const [storyType, setStoryType] = useState('text');
  const [textContent, setTextContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [videoStream, setVideoStream] = useState(null);

  const mediaRecorderRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const chunksRef = useRef([]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [videoStream]);

  const startRecording = async (type) => {
    try {
      const constraints = type === 'voice'
        ? { audio: true }
        : { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: true };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (type === 'video') {
        setVideoStream(stream);
        setTimeout(() => {
          if (videoPreviewRef.current) {
            videoPreviewRef.current.srcObject = stream;
            videoPreviewRef.current.play().catch(() => {});
          }
        }, 100);
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: type === 'voice' ? 'audio/webm' : 'video/webm' });
        setRecordedBlob(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
        setVideoStream(null);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      alert('Could not access microphone/camera. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let mediaUrl = '';

      if (recordedBlob) {
        setUploadProgress('Uploading recording...');
        const file = new File(
          [recordedBlob],
          storyType === 'voice' ? 'audio-recording.webm' : 'video-recording.webm',
          { type: recordedBlob.type }
        );
        const result = await uploadImage(file);
        mediaUrl = result.url;
      }

      setUploadProgress('Saving story...');
      if (existingStory) {
  await updateStory(existingStory.id, {
    storyType,
    textContent: storyType === 'text' ? textContent : '',
    mediaUrl,
  });
} else {
  await createStory({
    storyType,
    textContent: storyType === 'text' ? textContent : '',
    mediaUrl,
    itemId: item.id,
  });
}

      setUploadProgress('Done!');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving story:', error);
      alert('Error saving story. Please try again.');
    } finally {
      setSaving(false);
      setUploadProgress('');
    }
  };

  const canSave = (storyType === 'text' && textContent.trim()) || 
                  ((storyType === 'voice' || storyType === 'video') && recordedBlob);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center z-[60] overflow-y-auto">
      <div className="bg-white w-full max-w-lg mx-4 my-6 p-6">

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl" style={{ fontFamily: 'Merriweather, serif', fontStyle: 'italic' }}>
            Replace Story
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-black text-2xl leading-none">×</button>
        </div>

        <p className="text-sm text-gray-500 mb-6" style={{ fontFamily: 'Lora, serif' }}>
          This will replace the existing story for <strong>{item.name}</strong>.
        </p>

        {/* Story Type Selector */}
        <div className="flex gap-3 mb-6">
          {['text', 'voice', 'video'].map(type => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setStoryType(type);
                setRecordedBlob(null);
                setRecordedUrl(null);
              }}
              className={`flex-1 py-2 text-sm border transition-colors ${
                storyType === type
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
              }`}
              style={{ fontFamily: 'Roboto, sans-serif' }}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Text */}
        {storyType === 'text' && (
          <textarea
            value={textContent}
            onChange={e => setTextContent(e.target.value)}
            rows={6}
            placeholder="Tell the story behind this keepsake..."
            className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-black resize-none text-sm"
            style={{ fontFamily: 'Lora, serif' }}
          />
        )}

        {/* Voice */}
        {storyType === 'voice' && (
          <div className="space-y-4">
            {recordedUrl ? (
              <div className="bg-gray-50 p-4">
                <audio controls className="w-full" src={recordedUrl} />
                <button
                  type="button"
                  onClick={() => { setRecordedBlob(null); setRecordedUrl(null); }}
                  className="mt-3 text-sm text-gray-500 underline"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Record again
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => isRecording ? stopRecording() : startRecording('voice')}
                className={`w-full py-4 text-sm ${isRecording ? 'bg-red-500 text-white' : 'bg-black text-white'}`}
                style={{ fontFamily: 'Roboto, sans-serif' }}
              >
                {isRecording ? '⏹ Stop Recording' : '🎙 Start Voice Recording'}
              </button>
            )}
          </div>
        )}

        {/* Video */}
        {storyType === 'video' && (
          <div className="space-y-4">
            {recordedUrl ? (
              <div>
                <video controls className="w-full" src={recordedUrl} />
                <button
                  type="button"
                  onClick={() => { setRecordedBlob(null); setRecordedUrl(null); }}
                  className="mt-3 text-sm text-gray-500 underline"
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  Record again
                </button>
              </div>
            ) : (
              <div>
                {isRecording && (
                  <video
                    ref={videoPreviewRef}
                    muted
                    className="w-full mb-3 bg-black"
                    style={{ minHeight: '200px' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => isRecording ? stopRecording() : startRecording('video')}
                  className={`w-full py-4 text-sm ${isRecording ? 'bg-red-500 text-white' : 'bg-black text-white'}`}
                  style={{ fontFamily: 'Roboto, sans-serif' }}
                >
                  {isRecording ? '⏹ Stop Recording' : '🎥 Start Video Recording'}
                </button>
              </div>
            )}
          </div>
        )}

        {uploadProgress && (
          <p className="mt-4 text-sm text-blue-600" style={{ fontFamily: 'Roboto, sans-serif' }}>{uploadProgress}</p>
        )}

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-sm"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || saving}
            className="flex-1 px-4 py-2 bg-black text-white text-sm disabled:opacity-50"
            style={{ fontFamily: 'Roboto, sans-serif' }}
          >
            {saving ? 'Saving...' : 'Save Story'}
          </button>
        </div>
      </div>
    </div>
  );
}
