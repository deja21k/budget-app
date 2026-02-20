import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { X, RefreshCw, Check, Scan, AlertCircle, Camera, Sparkles } from 'lucide-react';
import Button from './ui/Button';
import type { CameraError } from '../hooks/useCameraCapture';

interface ReceiptScannerCameraProps {
  isOpen: boolean;
  isLoading: boolean;
  isScanning: boolean;
  error: CameraError | null;
  errorMessage: string;
  capturedImage: string | null;
  receiptDetected: boolean;
  detectionConfidence: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onCapture: () => void;
  onRetake: () => void;
}

export const ReceiptScannerCamera = ({
  isOpen,
  isLoading,
  isScanning,
  error,
  errorMessage,
  capturedImage,
  receiptDetected,
  detectionConfidence,
  videoRef,
  canvasRef,
  onClose,
  onCapture,
  onRetake,
}: ReceiptScannerCameraProps) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showShutter, setShowShutter] = useState(false);
  const [holdSteadyTimer, setHoldSteadyTimer] = useState(0);
  
  const detectionStartTimeRef = useRef<number | null>(null);
  const isOpenRef = useRef(isOpen);
  const isScanningRef = useRef(isScanning);
  const receiptDetectedRef = useRef(receiptDetected);
  const detectionConfidenceRef = useRef(detectionConfidence);
  const capturedImageRef = useRef(capturedImage);
  const countdownRef = useRef(countdown);

  useEffect(() => {
    isOpenRef.current = isOpen;
    isScanningRef.current = isScanning;
    receiptDetectedRef.current = receiptDetected;
    detectionConfidenceRef.current = detectionConfidence;
    capturedImageRef.current = capturedImage;
    countdownRef.current = countdown;
  });

  const resetStates = useCallback(() => {
    setCountdown(null);
    setShowShutter(false);
    setHoldSteadyTimer(0);
    detectionStartTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(resetStates, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, resetStates]);

  useEffect(() => {
    if (!isOpen || !isScanning) return;

    let animationId: number;
    let lastCheck = 0;
    const checkInterval = 100;

    const checkForAutoCapture = (timestamp: number) => {
      if (!isOpenRef.current || !isScanningRef.current) return;
      
      if (timestamp - lastCheck >= checkInterval) {
        lastCheck = timestamp;
        
        if (receiptDetectedRef.current && 
            detectionConfidenceRef.current > 0.75 && 
            !capturedImageRef.current && 
            countdownRef.current === null) {
          
          if (!detectionStartTimeRef.current) {
            detectionStartTimeRef.current = Date.now();
          }
          
          const detectionDuration = Date.now() - detectionStartTimeRef.current;
          
          if (detectionDuration > 1500) {
            setCountdown(3);
            
            let count = 3;
            const countdownInterval = setInterval(() => {
              count -= 1;
              if (count > 0) {
                setCountdown(count);
              } else {
                clearInterval(countdownInterval);
                setCountdown(null);
                setShowShutter(true);
                setTimeout(() => {
                  onCapture();
                  setShowShutter(false);
                }, 150);
              }
            }, 1000);
            
            return;
          }
        } else {
          detectionStartTimeRef.current = null;
        }
      }
      
      animationId = requestAnimationFrame(checkForAutoCapture);
    };

    animationId = requestAnimationFrame(checkForAutoCapture);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isOpen, isScanning, onCapture]);

  const holdSteadyTimerRef = useRef(0);
  
  useLayoutEffect(() => {
    if (!isOpen || !isScanning) {
      holdSteadyTimerRef.current = 0;
      void Promise.resolve().then(() => {
        setHoldSteadyTimer(0);
      });
      return;
    }

    let intervalId: ReturnType<typeof setInterval>;
    
    if (receiptDetected && detectionConfidence > 0.6) {
      intervalId = setInterval(() => {
        holdSteadyTimerRef.current = Math.min(holdSteadyTimerRef.current + 100, 1500);
        setHoldSteadyTimer(holdSteadyTimerRef.current);
      }, 100);
    } else {
      holdSteadyTimerRef.current = 0;
      void Promise.resolve().then(() => {
        setHoldSteadyTimer(0);
      });
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isOpen, isScanning, receiptDetected, detectionConfidence]);

  if (!isOpen) return null;

  const handleManualCapture = () => {
    setShowShutter(true);
    setTimeout(() => {
      onCapture();
      setShowShutter(false);
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <button
            onClick={onClose}
            className="p-2 -ml-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-500" />
            <span className="font-semibold text-slate-900">Scan Receipt</span>
          </div>
          <div className="w-9" />
        </div>

        {/* Camera Preview */}
        <div className="relative aspect-[3/4] bg-slate-900">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-white">Camera Error</h3>
              <p className="text-white/70 text-sm max-w-xs">{errorMessage}</p>
              <Button onClick={onClose} variant="secondary" size="sm" className="mt-2">
                Close
              </Button>
            </div>
          ) : capturedImage ? (
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={capturedImage}
                alt="Captured receipt"
                className="max-w-full max-h-full object-contain rounded-xl"
              />
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`absolute inset-0 w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
              />
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900">
                  <div className="w-12 h-12 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-white/70 mt-3 text-sm">Starting camera...</span>
                </div>
              )}
              
              {/* Scanner Frame */}
              {!isLoading && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Frame outline */}
                  <div 
                    className="absolute inset-6 border-2 rounded-2xl transition-all duration-300"
                    style={{
                      borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'rgba(255,255,255,0.5)',
                      boxShadow: receiptDetected && detectionConfidence > 0.75 ? '0 0 0 4px rgba(34,197,94,0.2), inset 0 0 20px rgba(34,197,94,0.1)' : 'none',
                    }}
                  />
                  
                  {/* Corner accents */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-l-3 border-t-3 rounded-tl-xl" style={{ borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white' }} />
                  <div className="absolute top-6 right-6 w-8 h-8 border-r-3 border-t-3 rounded-tr-xl" style={{ borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white' }} />
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-l-3 border-b-3 rounded-bl-xl" style={{ borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white' }} />
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-r-3 border-b-3 rounded-br-xl" style={{ borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white' }} />
                  
                  {/* Status indicator */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2">
                    {countdown !== null ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <span className="text-4xl font-bold text-white">{countdown}</span>
                        </div>
                        <span className="text-white/80 text-xs mt-2 font-medium">Hold steady...</span>
                      </div>
                    ) : receiptDetected ? (
                      <div 
                        className="px-3 py-1.5 rounded-full flex items-center gap-1.5 text-sm font-medium"
                        style={{
                          backgroundColor: detectionConfidence > 0.75 ? 'rgba(34,197,94,0.9)' : 'rgba(234,179,8,0.9)',
                        }}
                      >
                        <Scan className="w-3.5 h-3.5 text-white" />
                        <span className="text-white">
                          {detectionConfidence > 0.75 ? 'Detected!' : 'Position...'}
                        </span>
                      </div>
                    ) : (
                      <div className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm flex items-center gap-1.5 text-sm">
                        <Scan className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-white/70">Point at receipt</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress bar */}
                  {receiptDetected && detectionConfidence > 0.6 && countdown === null && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40">
                      <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-100"
                          style={{
                            width: `${Math.min((holdSteadyTimer / 1500) * 100, 100)}%`,
                            backgroundColor: holdSteadyTimer >= 1500 ? '#22c55e' : '#eab308',
                          }}
                        />
                      </div>
                      <p className="text-center text-white/80 text-xs mt-2 font-medium">
                        {holdSteadyTimer >= 1500 ? 'Capturing...' : 'Hold steady'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <canvas ref={canvasRef} className="hidden" />
            </>
          )}

          {/* Shutter Flash */}
          {showShutter && (
            <div className="absolute inset-0 bg-white z-50" style={{ animation: 'flash 0.15s ease-out' }} />
          )}
        </div>

        {/* Bottom Controls */}
        <div className="px-5 py-5 bg-white border-t border-slate-100">
          {capturedImage ? (
            <div className="flex items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={onRetake}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Retake
              </Button>
              <Button
                onClick={onClose}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Use Photo
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Sparkles className="w-4 h-4 text-primary-400" />
                <span>Auto-detect enabled</span>
              </div>
              <button
                onClick={handleManualCapture}
                disabled={isLoading}
                className="w-14 h-14 rounded-full border-3 border-primary-500 flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform bg-white"
              >
                <div className="w-11 h-11 rounded-full bg-primary-500" />
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
      
      <style>{`
        @keyframes flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ReceiptScannerCamera;
