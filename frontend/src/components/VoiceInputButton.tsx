import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, AlertCircle, X } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { parseSerbianExpense, formatTranscriptForDisplay } from '../utils/serbianExpenseParser';
import type { Category } from '../types';

export interface VoiceExpenseData {
  item: string;
  amount: number | null;
  currency: string;
  category: string | null;
  transcript: string;
}

export interface VoiceInputButtonProps {
  onExpenseParsed: (data: VoiceExpenseData) => void;
  categories: Category[];
  disabled?: boolean;
}

type VoiceInputState = 'idle' | 'listening' | 'processing' | 'error' | 'success';

export function VoiceInputButton({ onExpenseParsed, categories, disabled }: VoiceInputButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [localState, setLocalState] = useState<VoiceInputState>('idle');
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');

  const handleResult = (result: { transcript: string; isFinal: boolean }) => {
    setTranscriptText(result.transcript);
    if (result.isFinal) {
      setLocalState('processing');
    }
  };

  const handleEnd = () => {
    if (!transcript || transcript.trim() === '') {
      setLocalState('idle');
    }
  };

  const handleError = (errorMessage: string) => {
    console.error('Speech recognition error:', errorMessage);
    setLocalState('error');
  };

  const {
    state: speechState,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    reset,
  } = useSpeechRecognition({
    language: 'sr-RS',
    onResult: handleResult,
    onEnd: handleEnd,
    onError: handleError,
  });

  useEffect(() => {
    if (speechState === 'listening') {
      setLocalState('listening');
    } else if (speechState === 'processing') {
      setLocalState('processing');
    } else if (speechState === 'error') {
      setLocalState('error');
    }
  }, [speechState]);

  useEffect(() => {
    if (transcript && localState === 'processing') {
      const parsed = parseSerbianExpense(transcript);
      
      if (parsed.success && parsed.data) {
        let categoryId: string | null = null;
        
        if (parsed.data.category && categories.length > 0) {
          const matchedCategory = categories.find(
            c => c.name.toLowerCase() === parsed.data!.category!.toLowerCase() && c.type === 'expense'
          );
          if (matchedCategory) {
            categoryId = matchedCategory.id.toString();
          }
        }

        onExpenseParsed({
          item: parsed.data.item,
          amount: parsed.data.amount,
          currency: parsed.data.currency,
          category: categoryId,
          transcript: transcript,
        });

        setLocalState('success');
        setTimeout(() => {
          setLocalState('idle');
          setTranscriptText('');
          setShowTranscript(false);
        }, 2000);
      } else if (parsed.needsClarification === 'amount') {
        onExpenseParsed({
          item: parsed.data?.item || '',
          amount: null,
          currency: parsed.data?.currency || 'RSD',
          category: parsed.data?.category || null,
          transcript: transcript,
        });
        setLocalState('success');
        setTimeout(() => {
          setLocalState('idle');
          setTranscriptText('');
          setShowTranscript(false);
        }, 2000);
      } else {
        setLocalState('error');
      }
    }
  }, [transcript, localState, categories]);

  const handleClick = () => {
    if (disabled) return;

    if (localState === 'listening') {
      stopListening();
    } else if (localState === 'idle' || localState === 'error' || localState === 'success') {
      reset();
      setTranscriptText('');
      setShowTranscript(true);
      startListening();
    }
  };

  const handleClose = () => {
    stopListening();
    reset();
    setLocalState('idle');
    setTranscriptText('');
    setShowTranscript(false);
  };

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="p-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
        title="Speech recognition is not supported in this browser"
      >
        <MicOff className="w-4 h-4" />
      </button>
    );
  }

  const getButtonContent = () => {
    switch (localState) {
      case 'listening':
        return <Mic className="w-4 h-4 animate-pulse" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'success':
        return <Mic className="w-4 h-4 text-success-500" />;
      default:
        return <Mic className="w-4 h-4" />;
    }
  };

  const getButtonClass = () => {
    const baseClass = 'p-2 rounded-lg border transition-all duration-200 flex items-center justify-center';
    
    switch (localState) {
      case 'listening':
        return `${baseClass} border-danger-300 bg-danger-50 text-danger-600 animate-pulse`;
      case 'processing':
        return `${baseClass} border-primary-300 bg-primary-50 text-primary-600`;
      case 'error':
        return `${baseClass} border-danger-300 bg-danger-50 text-danger-600`;
      case 'success':
        return `${baseClass} border-success-300 bg-success-50 text-success-600`;
      default:
        return `${baseClass} border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600`;
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`${getButtonClass()} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        title={
          localState === 'listening' 
            ? 'Click to stop recording' 
            : 'Voice input (Serbian)'
        }
      >
        {getButtonContent()}
      </button>

      {showTranscript && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              {localState === 'listening' ? 'Listening...' : 
               localState === 'processing' ? 'Processing...' :
               localState === 'error' ? 'Error' : 'Transcript'}
            </span>
            <button
              type="button"
              onClick={handleClose}
              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          
          <div className="p-3 min-h-[60px] max-h-[120px] overflow-y-auto">
            {localState === 'listening' && (
              <p className="text-sm text-slate-700">
                {interimTranscript || 'Speak now...'}
              </p>
            )}
            
            {localState === 'processing' && (
              <p className="text-sm text-slate-700 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing: {formatTranscriptForDisplay(transcriptText)}
              </p>
            )}
            
            {localState === 'error' && error && (
              <p className="text-sm text-danger-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                {error}
              </p>
            )}
            
            {localState === 'success' && transcriptText && (
              <p className="text-sm text-success-700">
                Parsed: {formatTranscriptForDisplay(transcriptText)}
              </p>
            )}
            
            {localState === 'idle' && transcriptText && (
              <p className="text-sm text-slate-600">
                {formatTranscriptForDisplay(transcriptText)}
              </p>
            )}
          </div>
          
          {localState === 'listening' && (
            <div className="px-3 pb-3">
              <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-danger-400 animate-pulse w-full" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
