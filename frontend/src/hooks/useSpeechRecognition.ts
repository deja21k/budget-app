import { useState, useCallback, useRef, useEffect } from 'react';

export type SpeechRecognitionState = 
  | 'idle' 
  | 'listening' 
  | 'processing' 
  | 'error';

export interface VoiceTranscriptResult {
  transcript: string;
  isFinal: boolean;
}

export interface UseSpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (result: VoiceTranscriptResult) => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export interface UseSpeechRecognitionReturn {
  state: SpeechRecognitionState;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  reset: () => void;
}

interface SpeechRecognitionType {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventType) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionEventType {
  resultIndex: number;
  results: SpeechRecognitionResultsType;
}

interface SpeechRecognitionResultsType {
  length: number;
  item(index: number): SpeechRecognitionSingleResult;
  [index: number]: SpeechRecognitionSingleResult;
}

interface SpeechRecognitionSingleResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternativeResult;
  [index: number]: SpeechRecognitionAlternativeResult;
}

interface SpeechRecognitionAlternativeResult {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEventType {
  error: string;
  message: string;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

export function useSpeechRecognition({
  language = 'sr-RS',
  continuous = false,
  interimResults = true,
  onResult,
  onEnd,
  onError,
}: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [state, setState] = useState<SpeechRecognitionState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const isMountedRef = useRef(true);

  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const initializeRecognition = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition is not supported in this browser');
      setState('error');
      return null;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    
    recognition.lang = language;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      if (isMountedRef.current) {
        setState('listening');
        setError(null);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      if (!isMountedRef.current) return;

      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => {
          const newTranscript = prev ? `${prev} ${finalTranscript}` : finalTranscript;
          onResult?.({ transcript: newTranscript, isFinal: true });
          return newTranscript;
        });
        setInterimTranscript('');
      } else if (interim) {
        setInterimTranscript(interim);
        onResult?.({ transcript: interim, isFinal: false });
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      if (!isMountedRef.current) return;

      let errorMessage: string;

      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'No microphone found. Please check your microphone permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone permission denied. Please allow microphone access in your browser settings.';
          break;
        case 'network':
          errorMessage = 'Network error occurred. Please check your internet connection.';
          break;
        case 'aborted':
          errorMessage = 'Speech recognition was stopped.';
          break;
        default:
          errorMessage = `Speech recognition error: ${event.error}`;
      }

      setError(errorMessage);
      setState('error');
      onError?.(errorMessage);
    };

    recognition.onend = () => {
      if (isMountedRef.current && state === 'listening') {
        setState(prev => prev === 'listening' ? 'idle' : prev);
        onEnd?.();
      }
    };

    return recognition;
  }, [language, continuous, interimResults, onResult, onEnd, onError, isSupported, state]);

  const startListening = useCallback(() => {
    if (!isSupported || !isMountedRef.current) return;

    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const recognition = initializeRecognition();
    if (recognition) {
      recognitionRef.current = recognition;
      setTranscript('');
      setInterimTranscript('');
      setState('processing');
      
      try {
        recognition.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setError('Failed to start speech recognition');
        setState('error');
      }
    }
  }, [isSupported, initializeRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isMountedRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (isMountedRef.current) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      setState('idle');
    }
  }, []);

  return {
    state,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    reset,
  };
}
