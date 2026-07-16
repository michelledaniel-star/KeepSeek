import React, { useState, useRef, useEffect } from 'react';

/**
 * QuestionFlow — Stage 1
 *
 * One full-screen question per card, answered with Skip / Next (or Finish
 * on the last one) — no swipe or drag gesture, by design: this app is
 * built for older users, and a tap on a clearly labeled button is more
 * reliable than a gesture, especially alongside the tap-to-record mic
 * button already on the same screen. Buttons trigger the same kind of
 * slide-off animation a swipe would have, so the transition still feels
 * alive — it's just always started by a tap, never a drag.
 *
 * Mic recording is REAL (uses the same getUserMedia/MediaRecorder pattern
 * as the existing AddItemForm), and the recording is sent to
 * /api/transcribe (server-side, calls OpenAI Whisper) for a real
 * transcript. If transcription fails for any reason, the textarea stays
 * fully editable so the user can just type the answer instead — nothing
 * blocks them.
 *
 * Props:
 *   questions  — array of { id, field, prompt }
 *                e.g. { id: 'name', field: 'name', prompt: 'What is this?' }
 *   onComplete — (answers) => void   answers = { [field]: string }
 *   onCancel   — () => void
 */

const QuestionFlow = ({ questions, onComplete, onCancel }) => {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [exitX, setExitX] = useState(0);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const suppressTransitionRef = useRef(false);
  // Tracks whether the user typed/edited the textarea by hand since the
  // last recording started, so a transcript that resolves late never
  // clobbers something they've already typed.
  const userEditedRef = useRef(false);

  const current = questions[index];
  const isLast = index === questions.length - 1;

  // Reset per-question state whenever we move to a new card
  useEffect(() => {
    setTranscript(answers[current?.field] || '');
    setIsRecording(false);
    setIsTranscribing(false);
    setTranscribeError(null);
    setExitX(0);
    userEditedRef.current = false;
  }, [index]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Chrome/Firefox/Edge default to audio/webm, Safari defaults to
  // audio/mp4 — whichever the browser actually picks, we send that same
  // mimeType to the server so it labels the file correctly for Whisper.
  const PREFERRED_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];

  const pickSupportedMimeType = () => {
    if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
    return PREFERRED_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
  };

  const blobToBase64 = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // reader.result is a data URL like "data:audio/webm;base64,AAAA…" —
        // the server only wants the part after the comma.
        const dataUrl = reader.result;
        resolve(typeof dataUrl === 'string' ? dataUrl.split(',')[1] : '');
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = pickSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];
      userEditedRef.current = false;
      setTranscribeError(null);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        if (chunks.length === 0) {
          setTranscribeError("Didn't catch any audio — try recording again, or type your answer.");
          return;
        }

        setIsTranscribing(true);
        try {
          const actualMimeType = recorder.mimeType || mimeType || 'audio/webm';
          const audioBlob = new Blob(chunks, { type: actualMimeType });
          const base64Audio = await blobToBase64(audioBlob);

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64Audio, mimeType: actualMimeType }),
          });
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data?.error || 'Transcription failed');
          }

          if (userEditedRef.current) {
            // User already started typing while we were transcribing —
            // don't overwrite what they typed.
          } else if (data.text) {
            setTranscript(data.text);
          } else {
            setTranscribeError("Didn't catch that clearly — try again, or type your answer.");
          }
        } catch (err) {
          console.error('Transcription error:', err);
          setTranscribeError('Could not transcribe that recording — you can type your answer instead.');
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access the microphone. Please check permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const goToIndex = (nextIndex) => {
    if (nextIndex < 0) return;
    if (nextIndex >= questions.length) {
      onComplete?.(answers);
      return;
    }
    setIndex(nextIndex);
  };

  const confirmAndAdvance = () => {
    setAnswers((prev) => ({ ...prev, [current.field]: transcript.trim() }));
    goToIndex(index + 1);
  };

  const skipAndAdvance = () => {
    setAnswers((prev) => ({ ...prev, [current.field]: prev[current.field] || '' }));
    goToIndex(index + 1);
  };

  // How long the CSS transition below actually takes, so the code and the
  // visual animation stay in sync.
  const EXIT_ANIMATION_MS = 200;

  // Tapping Skip or Next slides the card the rest of the way off-screen
  // (using the actual window width so it clears on any device), then
  // swaps to the next question once it's actually gone — the same motion
  // a swipe would have produced, just always started by a tap.
  const animateExit = (direction) => {
    const exitTo = direction * (window.innerWidth || 600);
    setExitX(exitTo);

    setTimeout(() => {
      // The incoming question should just appear centered, with no slide
      // of its own — suppress the transition for this one swap so
      // resetting to 0 doesn't visibly animate the new content in.
      suppressTransitionRef.current = true;
      if (direction < 0) {
        skipAndAdvance();
      } else {
        confirmAndAdvance();
      }
      requestAnimationFrame(() => {
        suppressTransitionRef.current = false;
      });
    }, EXIT_ANIMATION_MS);
  };

  if (!current) return null;

  return (
    <div className="fixed inset-0 bg-white z-[70] flex flex-col">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 pt-6 pb-2">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="h-1.5 rounded-full transition-all duration-200"
            style={{
              width: i === index ? '20px' : '8px',
              backgroundColor: i <= index ? '#669999' : '#e5e5e5',
            }}
          />
        ))}
      </div>

      {/* Close */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-600"
        aria-label="Close"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-6 relative overflow-hidden">
        <div
          style={{
            transform: `translateX(${exitX}px)`,
            transition: suppressTransitionRef.current ? 'none' : 'transform 200ms ease-out',
          }}
          className="w-full max-w-md"
        >
          <h2 className="font-heading italic tracking-[0.02em] text-2xl md:text-3xl text-center mb-8 text-gray-900">
            {current.prompt}
          </h2>

          <div className="flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${
                isRecording ? 'bg-red-600' : 'bg-black hover:bg-gray-800'
              }`}
              aria-label={isRecording ? 'Stop recording' : 'Start recording'}
            >
              {isRecording ? (
                <div className="w-6 h-6 bg-white rounded-sm" />
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18.5a4 4 0 004-4V7a4 4 0 00-8 0v7.5a4 4 0 004 4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.5 11v1a4.5 4.5 0 009 0v-1M12 19.5v2.5" />
                </svg>
              )}
            </button>
            <p className="font-body text-sm text-gray-500">
              {isRecording
                ? 'Recording — tap to stop'
                : isTranscribing
                ? 'Listening to what you said…'
                : 'Tap to answer'}
            </p>

            <textarea
              value={transcript}
              onChange={(e) => {
                userEditedRef.current = true;
                setTranscript(e.target.value);
              }}
              placeholder="Or type your answer here"
              rows={3}
              className="w-full mt-2 p-4 border border-gray-200 rounded-xl font-body text-base text-gray-800 focus:outline-none focus:border-[#669999] resize-none"
            />
            {transcribeError && (
              <p className="font-body text-sm text-red-500 -mt-2 text-center">{transcribeError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom buttons */}
      <div className="flex justify-between items-center px-8 pb-8 pt-2">
        <button
          type="button"
          onClick={() => animateExit(-1)}
          className="px-6 py-3 font-subhead text-sm tracking-[0.01em] text-gray-500 hover:text-gray-700"
        >
          Skip
        </button>
        <button
          type="button"
          onClick={() => animateExit(1)}
          className="px-8 py-3 bg-black text-white font-subhead text-sm tracking-[0.01em] rounded-full hover:bg-gray-800 transition-colors"
        >
          {isLast ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default QuestionFlow;
