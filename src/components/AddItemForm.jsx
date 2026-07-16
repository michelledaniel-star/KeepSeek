import React, { useState, useEffect } from 'react';
import { fetchPeople, createItem, createStory } from '../services/airtable';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../services/cloudinary';
import QRCode from 'qrcode';
import AddPersonQuick from './AddPersonQuick';
import PhotoEditor from './PhotoEditor';

const AddItemForm = ({ onClose, onSuccess }) => {
  const { keeperId, keeperSlug } = useAuth();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [step, setStep] = useState(1);
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  
  const [showQR, setShowQR] = useState(false);
  const [showVideoQR, setShowVideoQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [videoQrDataUrl, setVideoQrDataUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [videoSessionId, setVideoSessionId] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState(null);
  const [videoStream, setVideoStream] = useState(null);
  const [showVideoPreview, setShowVideoPreview] = useState(false); // Show preview before recording
  const videoPreviewRef = React.useRef(null);
  const videoPlaybackRef = React.useRef(null);
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [savedItem, setSavedItem] = useState(null);
  const [showQRExplainer, setShowQRExplainer] = useState(false);
  const [pendingQRType, setPendingQRType] = useState(null); // 'photo' | 'video'
  
  const [formData, setFormData] = useState({
    name: '',
    year: '',
    description: '',
    story: '',
    storyType: '',
    ownerId: '',
    ownerName: '',
    ownerYears: '',
    ownerLocation: '',
    ownerPhoto: null,
    images: [],
    status: 'draft',
    category: ''
  });
  const [showMorePrompts, setShowMorePrompts] = useState(false);
  const [showPromptsIntro, setShowPromptsIntro] = useState(false);
  const [showPromptsTab, setShowPromptsTab] = useState(false);
  const [resumeDraft, setResumeDraft] = useState(null);
  const draftActiveRef = React.useRef(false);
  const DRAFT_KEY = 'keepseek_additem_draft';

  useEffect(() => {
    loadPeople();
    setDefaultStatus();
    return () => {
      formData.images.forEach(img => {
        if (img.previewUrl && img.previewUrl.startsWith('blob:')) URL.revokeObjectURL(img.previewUrl);
      });
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl);
    };
  }, []);

  // On open: if there's an unfinished entry saved from last time, offer to resume it
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const fd = parsed.formData || {};
        const hasContent =
          (fd.name && fd.name.trim()) ||
          (fd.story && fd.story.trim()) ||
          (fd.images && fd.images.length > 0);
        if (hasContent) {
          setResumeDraft(parsed);
          return; // wait for the keeper to choose before autosaving
        }
      }
    } catch (err) {
      console.error('Draft read error:', err);
    }
    draftActiveRef.current = true;
  }, []);

  // Autosave the in-progress entry so it survives a reload or app switch
  useEffect(() => {
    if (!draftActiveRef.current) return;
    if (loading) return;
    try {
      const snapshot = {
        step,
        formData: {
          ...formData,
          ownerPhoto: null,
          images: formData.images
            .filter(im => im.imageUrl)
            .map(im => ({ id: im.id || null, imageUrl: im.imageUrl })),
        },
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(snapshot));
    } catch (err) {
      console.error('Draft save error:', err);
    }
  }, [formData, step, loading]);

  // Check for mobile upload via API
  useEffect(() => {
    if (!showQR || !sessionId) return;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload-session?sessionId=${sessionId}`);
        const data = await response.json();
        
        if (data.imageUrl) {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, { file: null, previewUrl: data.imageUrl, imageUrl: data.imageUrl }]
          }));
          setShowQR(false);
        }
      } catch (error) {
        console.error('Error checking upload:', error);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [showQR, sessionId]);

  // Check for mobile video upload
  useEffect(() => {
    if (!showVideoQR || !videoSessionId) return;

    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/upload-session?sessionId=${videoSessionId}`);
        const data = await response.json();
        
        if (data.imageUrl) {
          const fakeBlob = new Blob(['video'], { type: 'video/webm' });
          setRecordedBlob(fakeBlob);
          setFormData(prev => ({
            ...prev,
            story: data.imageUrl
          }));
          setShowVideoQR(false);
        }
      } catch (error) {
        console.error('Error checking upload:', error);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [showVideoQR, videoSessionId]);

  const loadPeople = async () => {
    const peopleData = await fetchPeople(keeperId);
    const keeper = peopleData.find(p => p.relationship === 'Self');
    const family = peopleData.filter(p => p.relationship !== 'Self');
    setPeople(keeper ? [keeper, ...family] : family);
  };

  const setDefaultStatus = async () => {
    const { supabase } = await import('../services/supabase');
    const { data: accessRows } = await supabase
      .from('access')
      .select('id')
      .eq('keeper_slug', keeperSlug)
      .limit(1);
    const hasSeekers = accessRows && accessRows.length > 0;
    setFormData(prev => ({ ...prev, status: hasSeekers ? 'draft' : 'public' }));
  };

  

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImages = files.map(file => ({
      id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      imageUrl: null,
      uploading: true,
    }));
    setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));

    // Upload each photo immediately so it survives a page reload
    for (const img of newImages) {
      try {
        const result = await uploadImage(img.file);
        setFormData(prev => ({
          ...prev,
          images: prev.images.map(im =>
            im.id === img.id ? { ...im, imageUrl: result.url, uploading: false } : im
          ),
        }));
      } catch (err) {
        console.error('Image upload failed:', err);
        setFormData(prev => ({
          ...prev,
          images: prev.images.map(im =>
            im.id === img.id ? { ...im, uploading: false, error: true } : im
          ),
        }));
      }
    }
  };

  const handleDeleteImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSetPrimary = (index) => {
    setFormData(prev => {
      const updated = [...prev.images];
      const [chosen] = updated.splice(index, 1);
      return { ...prev, images: [chosen, ...updated] };
    });
  };

  const handleShowQR = async () => {
    const seen = localStorage.getItem('keepseek_qr_explainer_seen');
    if (!seen) {
      setPendingQRType('photo');
      setShowQRExplainer(true);
      return;
    }
    await _doShowQR();
  };

  const _doShowQR = async () => {
    const newSessionId = `session_${Date.now()}`;
    setSessionId(newSessionId);
    
    const uploadUrl = `${window.location.origin}/mobile-upload?session=${newSessionId}`;
    const qrCode = await QRCode.toDataURL(uploadUrl, {
      width: 300,
      margin: 2,
    });
    
    setQrDataUrl(qrCode);
    setShowQR(true);
  };

  const startVideoPreview = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      setVideoStream(stream);
      setShowVideoPreview(true);
      
      // Wait and set video preview
      setTimeout(() => {
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play().catch(e => console.error('Preview play error:', e));
        }
      }, 100);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera and microphone. Please check permissions in your browser settings.');
    }
  };

  const cancelVideoPreview = () => {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    setShowVideoPreview(false);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
  };

  const handleShowVideoQR = async () => {
    const seen = localStorage.getItem('keepseek_qr_explainer_seen');
    if (!seen) {
      setPendingQRType('video');
      setShowQRExplainer(true);
      return;
    }
    await _doShowVideoQR();
  };

  const _doShowVideoQR = async () => {
    const newSessionId = `session_${Date.now()}`;
    setVideoSessionId(newSessionId);
    
    const uploadUrl = `${window.location.origin}/mobile-video?session=${newSessionId}`;
    const qrCode = await QRCode.toDataURL(uploadUrl, {
      width: 300,
      margin: 2,
    });
    
    setVideoQrDataUrl(qrCode);
    setShowVideoQR(true);
  };

  const startRecording = async (type) => {
    try {
      let stream = videoStream; // Use existing stream from preview
      
      // If no existing stream (for voice or if preview wasn't shown), get new one
      if (!stream) {
        const constraints = type === 'voice' 
          ? { audio: true }
          : { 
              video: { 
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }, 
              audio: true 
            };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (type === 'video') {
          setVideoStream(stream);
          setTimeout(() => {
            if (videoPreviewRef.current) {
              videoPreviewRef.current.srcObject = stream;
              videoPreviewRef.current.play().catch(e => console.error('Play error:', e));
            }
          }, 100);
        }
      }
      
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = () => {
        const blob = new Blob(chunks, { 
          type: type === 'voice' ? 'audio/webm' : 'video/webm'
        });
        console.log('Recording stopped, blob size:', blob.size);
        
        // Create URL for playback
        if (type === 'video') {
          const videoUrl = URL.createObjectURL(blob);
          setRecordedVideoUrl(videoUrl);
          console.log('Created video URL for playback:', videoUrl);
        } else if (type === 'voice') {
          const audioUrl = URL.createObjectURL(blob);
          setRecordedAudioUrl(audioUrl);
          console.log('Created audio URL for playback:', audioUrl);
        }
        
        setRecordedBlob(blob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        setVideoStream(null);
        setShowVideoPreview(false);
        
        // Clear video preview
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      console.log('Recording started for:', type);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      let message = 'Could not access ';
      if (type === 'voice') {
        message += 'microphone';
      } else {
        message += 'camera and microphone';
      }
      message += '. Please check permissions in your browser settings.';
      alert(message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };
const handleKeyDown = (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (step === 1 && formData.images.length > 0) setStep(2);
    else if (step === 2 && formData.name) setStep(3);
    else if (step === 3 && (formData.ownerId || formData.ownerName)) setStep(4);
  }
};
  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    const uploadedUrls = [];
    for (let i = 0; i < formData.images.length; i++) {
      const img = formData.images[i];
      if (img.imageUrl) {
        uploadedUrls.push(img.imageUrl);
      } else if (img.file) {
        setUploadProgress(`Uploading photo ${i + 1} of ${formData.images.length}...`);
        const result = await uploadImage(img.file);
        uploadedUrls.push(result.url);
      }
    }

    let storyUrl = '';
    if (recordedBlob && recordedBlob.size > 0) {
      setUploadProgress('Uploading recording...');
      const mediaFile = new File(
        [recordedBlob],
        formData.storyType === 'voice' ? 'audio-recording.webm' : 'video-recording.webm',
        { type: recordedBlob.type }
      );
      const uploadResult = await uploadImage(mediaFile);
      storyUrl = uploadResult.url;
    }

    setUploadProgress('Saving to database...');
    const newItem = await createItem({
      name: formData.name,
      year: formData.year,
      description: formData.description,
      ownerId: formData.ownerId,
      status: formData.status,
      imageUrl: uploadedUrls[0] || '',
      category: formData.category,
    }, keeperId);

    if (uploadedUrls.length > 1) {
      const { supabase } = await import('../services/supabase');
      for (let i = 1; i < uploadedUrls.length; i++) {
        await supabase.from('images').insert({ item_id: newItem.id, url: uploadedUrls[i], order: i });
      }
    }

    if (formData.story || storyUrl) {
      await createStory({
        storyType: formData.storyType,
        textContent: formData.storyType === 'text' ? formData.story : '',
        mediaUrl: storyUrl,
        itemId: newItem.id,
      });
    }

    setUploadProgress('');
    draftActiveRef.current = false;
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { console.error(err); }
    onSuccess?.(newItem);
  } catch (error) {
    console.error('Error saving item:', error);
    alert(error.message || 'Error saving item. Please try again.');
  } finally {
    setLoading(false);
    setUploadProgress('');
  }
};

  const acceptResumeDraft = () => {
    const parsed = resumeDraft;
    if (!parsed) return;
    const fd = parsed.formData || {};
    const imgs = (fd.images || []).map(im => ({
      id: im.id || ((typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}_${Math.random()}`),
      file: null,
      previewUrl: im.imageUrl,
      imageUrl: im.imageUrl,
      uploading: false,
    }));
    setFormData(prev => ({ ...prev, ...fd, images: imgs, ownerPhoto: null }));
    setStep(parsed.step || 1);
    setResumeDraft(null);
    draftActiveRef.current = true;
  };

  const discardResumeDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch (err) { console.error(err); }
    setResumeDraft(null);
    draftActiveRef.current = true;
  };

  const handleQRExplainerConfirm = async () => {
    localStorage.setItem('keepseek_qr_explainer_seen', 'true');
    setShowQRExplainer(false);
    if (pendingQRType === 'photo') await _doShowQR();
    if (pendingQRType === 'video') await _doShowVideoQR();
    setPendingQRType(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8 overflow-y-auto">

      {/* Resume unsaved draft prompt */}
      {resumeDraft && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-6">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center space-y-6">
            <h3 className="text-xl font-heading italic tracking-[0.05em]">Resume your entry?</h3>
            <p className="font-body text-sm text-gray-600 leading-relaxed">
              You have an unfinished item from last time. Want to pick up where you left off?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={discardResumeDraft}
                className="flex-1 px-4 py-3 border-2 border-gray-200 font-subhead text-sm tracking-[0.01em] hover:border-gray-300 transition-colors rounded-lg"
              >
                Start fresh
              </button>
              <button
                type="button"
                onClick={acceptResumeDraft}
                className="flex-1 px-4 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors rounded-lg"
              >
                Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Explainer Modal */}
      {showQRExplainer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-6">
          <div className="bg-white rounded-2xl max-w-sm w-full p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-heading italic tracking-[0.05em] mb-2">Use Your Phone Camera</h3>
              <p className="font-body text-sm text-gray-600 leading-relaxed">
                A QR code will appear on this screen. Point your phone camera at it — no app needed. It'll open a page where you can take or choose a photo, and it'll show up here automatically.
              </p>
            </div>
            <div className="space-y-3 pt-2">
              <ol className="text-left space-y-2">
                {['A QR code appears here', 'Scan it with your phone camera', 'Take or upload your photo', 'It appears here instantly'].map((step, i) => (
                  <li key={i} className="flex items-center gap-3 font-body text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-[#669999] text-white text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setShowQRExplainer(false); setPendingQRType(null); }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 font-subhead text-sm tracking-[0.01em] hover:border-gray-300 transition-colors rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQRExplainerConfirm}
                className="flex-1 px-4 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors rounded-lg"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

     {showAddPersonForm && (
  <AddPersonQuick
    onClose={() => setShowAddPersonForm(false)}
    onSuccess={async (newPerson) => {
      await loadPeople();
      setFormData(prev => ({ ...prev, ownerId: newPerson.id }));
      setShowAddPersonForm(false);
    }}
  />
)}
      
      <div className="bg-white rounded-2xl max-w-3xl w-full my-8">
        <div className="p-12">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-4xl font-heading italic tracking-[0.05em] mb-2">Add New Item</h2>
              <p className="text-sm font-body text-gray-500">Step {step} of 4</p>
              {uploadProgress && (
                <p className="text-sm font-subhead text-blue-600 mt-2">{uploadProgress}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
              disabled={loading}
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-8">
            {/* Step 1: Add Photos */}
            {step === 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-heading italic tracking-[0.05em]">Add Photos</h3>
                <p className="text-sm font-body text-gray-500">The first photo will be the main image. Add as many as you like.</p>

                {/* Photo grid */}
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {formData.images.map((img, index) => (
                      <div key={img.id || index} className="relative group">
                        <img
                          src={img.previewUrl}
                          alt={`Photo ${index + 1}`}
                          className={`w-full h-28 object-cover rounded-xl border-2 ${index === 0 ? 'border-black' : 'border-gray-200'} ${img.uploading ? 'opacity-50' : ''}`}
                        />
                        {img.uploading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 bg-black text-white text-xs font-subhead tracking-[0.01em] px-2 py-0.5 rounded">Main</span>
                        )}
                        {index !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetPrimary(index)}
                            className="absolute bottom-1 left-1 bg-white/90 text-black text-xs font-subhead tracking-[0.01em] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Set main
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(index)}
                          className="absolute top-1 right-1 w-6 h-6 bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs hover:bg-black"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload controls */}
                {showQR ? (
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-2xl p-12 text-center">
                      <img src={qrDataUrl} alt="QR Code" className="mx-auto mb-4" />
                      <p className="font-subhead text-sm tracking-[0.01em] mb-2">Scan with your phone camera</p>
                      <p className="font-body text-xs text-gray-500">Waiting for photo...</p>
                    </div>
                    <button type="button" onClick={() => setShowQR(false)} className="w-full px-4 py-3 border-2 border-gray-300 font-subhead text-sm tracking-[0.01em] hover:border-gray-400 transition-colors">Cancel</button>
                  </div>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden md:block">
                      <div className="relative flex rounded-2xl overflow-hidden border-2 border-gray-300" style={{ minHeight: '160px' }}>
                        <label className="flex-1 cursor-pointer flex flex-col items-center justify-center p-6 hover:bg-gray-50 transition-colors border-r border-gray-300">
                          <div className="space-y-2 text-center">
                            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            <p className="font-subhead text-sm tracking-[0.01em]">{formData.images.length > 0 ? 'Add more from computer' : 'Upload from computer'}</p>
                            <p className="text-xs font-body text-gray-500">PNG, JPG up to 10MB</p>
                          </div>
                          <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                        </label>
                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex items-center justify-center z-10">
                          <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center"><span className="font-body text-xs text-gray-500">or</span></div>
                        </div>
                        <button type="button" onClick={handleShowQR} className="flex-1 flex flex-col items-center justify-center p-6 bg-black text-white hover:bg-gray-800 transition-colors gap-2">
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                          </div>
                          <div className="text-center">
                            <p className="font-subhead text-sm tracking-[0.01em]">Use Phone Camera</p>
                            <p className="text-xs text-white/60 mt-0.5">Scan QR Code</p>
                          </div>
                        </button>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="md:hidden space-y-3">
                      <label className="cursor-pointer flex flex-col items-center justify-center p-6 bg-black text-white rounded-2xl gap-2">
                        <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                        <p className="font-subhead text-sm tracking-[0.01em]">{formData.images.length > 0 ? 'Add another photo' : 'Take or choose photo'}</p>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                      <div className="relative flex items-center">
                        <div className="flex-1 border-t border-gray-300" />
                        <span className="px-4 font-body text-xs text-gray-500">or</span>
                        <div className="flex-1 border-t border-gray-300" />
                      </div>
                      <label className="cursor-pointer flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-300 rounded-2xl hover:border-gray-400 transition-colors">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        <span className="font-subhead text-sm tracking-[0.01em] text-gray-600">Upload from files</span>
                        <input type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
                      </label>
                    </div>
                  </>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={formData.images.length === 0}
                    className="px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-heading italic tracking-[0.05em] mb-6">Tell Us About This Item</h3>
                
                <div>
                  <label className="block text-sm font-subhead uppercase tracking-[0.01em] text-gray-500 mb-2">
                    Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/\b\w/g, c => c.toUpperCase()) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-body focus:outline-none focus:border-black"
                    placeholder="e.g., Grandmother's Wedding Ring"
                  />
                </div>

                <div>
                  <label className="block text-sm font-subhead uppercase tracking-[0.01em] text-gray-500 mb-2">
                    Collection Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-body focus:outline-none focus:border-black"
                    required
                  >
                    <option value="">Choose from list</option>
                    <option value="Jewelry">Jewelry</option>
                    <option value="Art & Photographs">Art & Photos</option>
                    <option value="Furniture">Furniture</option>
                    <option value="Clothing & Textiles">Clothing & Textiles</option>
                    <option value="Books & Documents">Books & Documents</option>
                    <option value="Decorative">Decorative</option>
                    <option value="Dinnerware">Dinnerware</option>
                    <option value="Tools & Equipment">Equipment</option>
                    <option value="Toys & Games">Toys & Games</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-8 py-3 border-2 border-black font-subhead text-sm tracking-[0.01em] hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!formData.name || !formData.category}
                    className="px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Who It's From */}
            {step === 3 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-heading italic tracking-[0.05em] mb-6">Who Is This From?</h3>
                
                <div>
                  <label className="block text-sm font-subhead uppercase tracking-[0.01em] text-gray-500 mb-2">
                    Select from List
                  </label>
                  <select
                    value={formData.ownerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, ownerId: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-body focus:outline-none focus:border-black"
                  >
                    <option value="">Select a person...</option>
          
                    {people.filter(p => p.name?.trim()).map(person => (
  <option key={person.id} value={person.id}>
    {person.relationship === 'Self' ? `${person.name} (Me)` : `${person.name} (${person.relationship})`}
  </option>
))}
                  </select>
                </div>

                <div className="text-center mt-4">
  <button
    type="button"
    onClick={() => setShowAddPersonForm(true)}
    className="text-sm text-[#669999] underline"
    style={{ fontFamily: 'Roboto, sans-serif' }}
  >
    + Add a new person
  </button>
</div>

              

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-8 py-3 border-2 border-black font-subhead text-sm tracking-[0.01em] hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(4)}
                    disabled={!formData.ownerId && !formData.ownerName}
                    className="px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            

            {/* Step 4: Tell the Story */}
            {step === 4 && (() => {
              const allPrompts = {
                'Jewelry': [
                  'Who wore this, and when did they wear it most?',
                  'How did this piece come into the family?',
                  'Is there a specific moment or occasion attached to this?',
                  'What do you want your family to know about this someday?',
                  'Was there ever a story told about where this came from?',
                ],
                'Art & Photographs': [
                  'Who is in this, or who made it?',
                  'Where did this hang or live in your home?',
                  'What feeling does this bring up when you look at it?',
                  'Is there a story behind when or why it was made?',
                  'What would be lost if no one wrote this down?',
                ],
                'Furniture': [
                  'Where did this piece come from originally?',
                  'What room did it live in, and who used it most?',
                  'Is there a memory tied to sitting at, around, or near this?',
                  'How did it end up in your family?',
                  'What should your family know about this someday?',
                ],
                'Clothing & Textiles': [
                  'Who made or wore this?',
                  'What occasion or moment is this connected to?',
                  'How did it end up being kept rather than given away?',
                  'What do you remember about seeing this as a child, or wearing it yourself?',
                  'What would be lost if no one wrote this down?',
                ],
                'Books & Documents': [
                  'Who owned this, and what does it tell us about them?',
                  'Is there anything written inside — an inscription, a note?',
                  'Why was this kept when so much else was not?',
                  'What do you want your family to understand about this?',
                  'Is there a story behind how this was found or passed down?',
                ],
                'Decorative': [
                  'Where did this come from, and who brought it into the family?',
                  'Where did it live in the house?',
                  'Does anyone have a strong memory connected to this object?',
                  'Why was it kept?',
                  'What should the next generation know about this?',
                ],
                'Dinnerware': [
                  'When was this used — everyday, or only for special occasions?',
                  'Who did this belong to originally?',
                  'Is there a holiday or gathering it reminds you of?',
                  'How did it come to you?',
                  'What do you want your family to know about this?',
                ],
                'Tools & Equipment': [
                  'Who used this, and what did they use it for?',
                  'What does this tell you about the person it belonged to?',
                  'Is there a skill or trade connected to this object?',
                  'How did it end up being kept?',
                  'What would be lost if no one wrote this down?',
                ],
                'Toys & Games': [
                  'Who played with this, and when?',
                  'Is there a memory of a specific day or moment connected to this?',
                  "How did it survive when so many things didn't?",
                  'What does this say about the child who owned it?',
                  'What do you want your family to know about this someday?',
                ],
                'Other': [
                  'How did this come into the family?',
                  'Who does this remind you of most?',
                  'Is there a specific moment or memory attached to this?',
                  "Why was this kept when other things weren't?",
                  'What would be lost if no one wrote this down?',
                ],
              };
              const prompts = allPrompts[formData.category] || allPrompts['Other'];
              const visiblePrompts = showMorePrompts ? prompts : prompts.slice(0, 3);
              const storyComplete =
                (formData.storyType === 'text' && formData.story.trim()) ||
                (formData.storyType === 'voice' && recordedBlob) ||
                (formData.storyType === 'video' && (recordedBlob || formData.story));

              return (
             <div className="space-y-6 pb-24">
                  <h3 className="text-2xl font-heading italic tracking-[0.05em]">Tell the Story</h3>

                  {/* Format selector — all three shown until one is picked */}
                  {!formData.storyType && (
                    <>
                      <p className="text-sm font-body text-gray-400 text-center">Choose how you'd like to tell this story.</p>
                      <div className="flex gap-2">
                        {[
                          { type: 'text', label: 'Write It' },
                          { type: 'voice', label: 'Voice Memo' },
                          { type: 'video', label: 'Video' },
                        ].map(({ type, label }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, storyType: type });
                              const seen = localStorage.getItem('keepseek_prompts_intro_seen');
                              if (!seen) setShowPromptsIntro(true);
                            }}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 font-subhead text-sm tracking-[0.01em] hover:border-gray-400 transition-colors"
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Once format is chosen — show chosen format label + input */}
                  {formData.storyType && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-black text-white font-subhead text-sm tracking-[0.01em] rounded">
                          {formData.storyType === 'text' ? 'Write It' : formData.storyType === 'voice' ? 'Voice Memo' : 'Video'}
                        </span>
                      </div>

                      {formData.storyType === 'text' && (
                        <textarea
                          value={formData.story}
                          onChange={(e) => setFormData({ ...formData, story: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg font-body focus:outline-none focus:border-black h-36"
                          placeholder="Write your story here..."
                          autoFocus
                        />
                      )}

                      {formData.storyType === 'voice' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'}`}>
                            <svg className={`w-8 h-8 ${isRecording ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                          </div>
                          {!recordedBlob ? (
                            <>
                              <p className="font-subhead text-sm tracking-[0.01em] text-gray-600 mb-4">{isRecording ? 'Recording...' : 'Ready when you are'}</p>
                              <button
                                type="button"
                                onClick={() => isRecording ? stopRecording() : startRecording('voice')}
                                className={`px-6 py-3 text-white font-subhead text-sm tracking-[0.01em] transition-colors rounded-full ${isRecording ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
                              >
                                {isRecording ? 'Stop Recording' : 'Start Recording'}
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="font-subhead text-sm tracking-[0.01em] text-green-600 mb-4">Recording saved!</p>
                              {recordedAudioUrl && <audio controls src={recordedAudioUrl} className="mx-auto mb-4 w-full max-w-md" />}
                              <button
                                type="button"
                                onClick={() => { if (recordedAudioUrl) { URL.revokeObjectURL(recordedAudioUrl); setRecordedAudioUrl(null); } setRecordedBlob(null); }}
                                className="text-sm font-body text-gray-500 hover:text-gray-700"
                              >
                                Record Again
                              </button>
                            </>
                          )}
                        </div>
                      )}

                      {formData.storyType === 'video' && (
                        <>
                          {showVideoQR ? (
                            <div className="bg-gray-50 rounded-2xl p-8 text-center">
                              <img src={videoQrDataUrl} alt="QR Code" className="mx-auto mb-4" />
                              <p className="font-subhead text-sm tracking-[0.01em] mb-2">Scan with your phone camera</p>
                              <p className="font-body text-xs text-gray-500 mb-4">Waiting for video...</p>
                              <button type="button" onClick={() => setShowVideoQR(false)} className="text-sm font-body text-gray-500 hover:text-gray-700">Cancel</button>
                            </div>
                          ) : recordedBlob ? (
                            <div className="border-2 border-green-200 bg-green-50 rounded-2xl p-8 text-center">
                              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                              <p className="font-subhead text-lg tracking-[0.01em] text-green-800 mb-2">Video recorded!</p>
                              <p className="text-xs font-body text-green-600 mb-6">Click "Save Item" below to upload your video</p>
                              <button
                                type="button"
                                onClick={() => { if (recordedVideoUrl) { URL.revokeObjectURL(recordedVideoUrl); setRecordedVideoUrl(null); } setRecordedBlob(null); }}
                                className="text-sm font-body text-green-700 hover:text-green-900 font-subhead tracking-[0.01em] underline"
                              >
                                Record again instead
                              </button>
                            </div>
                          ) : showVideoPreview || videoStream ? (
                            <div className="bg-black rounded-2xl p-6">
                              <div className="relative mb-4">
                                <video ref={videoPreviewRef} autoPlay playsInline muted className="w-full max-w-2xl mx-auto rounded-xl" style={{ transform: 'scaleX(-1)' }} />
                                {isRecording && (
                                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full shadow-lg">
                                    <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                                    <span className="text-white text-sm font-subhead tracking-[0.01em]">RECORDING</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-center space-y-3">
                                {!isRecording ? (
                                  <>
                                    <p className="text-white text-sm font-body mb-4">Ready to record? Make sure you're in frame!</p>
                                    <div className="flex gap-3 justify-center">
                                      <button type="button" onClick={cancelVideoPreview} className="px-6 py-3 bg-gray-700 text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-600 transition-colors rounded-full">Cancel</button>
                                      <button type="button" onClick={() => startRecording('video')} className="px-8 py-4 bg-red-600 text-white font-subhead text-sm tracking-[0.01em] hover:bg-red-700 transition-colors rounded-full">● Start Recording</button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-white text-sm font-body mb-4">Tell your story...</p>
                                    <button type="button" onClick={stopRecording} className="px-8 py-4 bg-white text-black font-subhead text-sm tracking-[0.01em] hover:bg-gray-100 transition-colors rounded-full">■ Stop Recording</button>
                                  </>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </div>
                                <p className="font-subhead text-sm tracking-[0.01em] text-gray-600 mb-2">Record on Computer</p>
                                <p className="text-xs font-body text-gray-500 mb-6">See yourself before recording</p>
                                <button type="button" onClick={startVideoPreview} className="px-6 py-3 bg-blue-600 text-white font-subhead text-sm tracking-[0.01em] hover:bg-blue-700 transition-colors rounded-full">Open Camera</button>
                              </div>
                              <div className="text-center">
                                <div className="relative">
                                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-300"></div></div>
                                  <div className="relative flex justify-center text-sm"><span className="px-4 bg-white font-body text-gray-500">or</span></div>
                                </div>
                                <button type="button" onClick={handleShowVideoQR} className="mt-4 w-full px-4 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                  </svg>
                                  Record on Phone (Scan QR Code)
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}

                  {/* Nav buttons */}
                  <div className="flex justify-between pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (formData.storyType) {
                          setFormData({ ...formData, storyType: '' });
                          setShowPromptsTab(false);
                          setRecordedBlob(null);
                        } else {
                          setStep(3);
                        }
                      }}
                      disabled={loading}
                      className="px-8 py-3 border-2 border-black font-subhead text-sm tracking-[0.01em] hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !storyComplete}
                      className="px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {loading ? (uploadProgress || 'Saving...') : 'Save Item'}
                    </button>
                  </div>

                  {/* Story Starters sliding tab */}
                  {formData.storyType && (
                    <div
                      className="fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-in-out"
                      style={{ transform: showPromptsTab ? 'translateY(0)' : 'translateY(calc(100% - 48px))' }}
                    >
                      <button
                        type="button"
                        onClick={() => setShowPromptsTab(prev => !prev)}
                        className="w-full h-12 bg-[#669999] text-white font-subhead text-sm tracking-[0.05em] flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${showPromptsTab ? 'rotate-180' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Story Starters
                      </button>
                      <div className="bg-white border-t border-gray-200 px-6 py-5 max-h-72 overflow-y-auto">
                        <ul className="space-y-3">
                          {prompts.map((prompt, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-[#669999] mt-0.5 flex-shrink-0">›</span>
                              <span className="font-body text-sm text-gray-700">{prompt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Prompts intro overlay */}
                  {showPromptsIntro && (
                    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-[60]">
                      <div className="bg-white rounded-t-2xl w-full max-w-lg p-8 space-y-5">
                        <h3 className="text-xl font-heading italic tracking-[0.05em]">Not sure where to start?</h3>
                        <p className="font-body text-sm text-gray-600 leading-relaxed">
                          In the tab below are suggestions to help get you going. Tap <span className="font-subhead text-[#669999]">Story Starters</span> at the bottom of the screen anytime to see them.
                        </p>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            onChange={(e) => {
                              if (e.target.checked) localStorage.setItem('keepseek_prompts_intro_seen', 'true');
                              else localStorage.removeItem('keepseek_prompts_intro_seen');
                            }}
                            className="w-4 h-4 accent-[#669999]"
                          />
                          <span className="font-body text-sm text-gray-600">Don't show this again</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPromptsIntro(false)}
                          className="w-full px-6 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] hover:bg-gray-800 transition-colors rounded-lg"
                        >
                          Got it
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </form>
        </div>
      </div>
    {showPhotoEditor && formData.images[0]?.previewUrl && (
  <PhotoEditor
    imageUrl={formData.images[0].previewUrl}
    onSave={(file, previewUrl, directUrl) => {
      const updated = [...formData.images];
      if (directUrl) {
        updated[0] = { file: null, previewUrl: directUrl, imageUrl: directUrl };
      } else {
        updated[0] = { file, previewUrl, imageUrl: null };
      }
      setFormData(prev => ({ ...prev, images: updated }));
      setShowPhotoEditor(false);
    }}
    onCancel={() => setShowPhotoEditor(false)}
  />
)}</div>
  );
};

export default AddItemForm;
