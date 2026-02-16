import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react';
import { X, RefreshCw, Check, Scan, AlertCircle } from 'lucide-react';
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
  
  // Use refs to track state without triggering effect re-runs
  const detectionStartTimeRef = useRef<number | null>(null);
  const isOpenRef = useRef(isOpen);
  const isScanningRef = useRef(isScanning);
  const receiptDetectedRef = useRef(receiptDetected);
  const detectionConfidenceRef = useRef(detectionConfidence);
  const capturedImageRef = useRef(capturedImage);
  const countdownRef = useRef(countdown);

  // Update refs when props change
  useEffect(() => {
    isOpenRef.current = isOpen;
    isScanningRef.current = isScanning;
    receiptDetectedRef.current = receiptDetected;
    detectionConfidenceRef.current = detectionConfidence;
    capturedImageRef.current = capturedImage;
    countdownRef.current = countdown;
  });

  // Reset states when opening using a callback pattern
  const resetStates = useCallback(() => {
    setCountdown(null);
    setShowShutter(false);
    setHoldSteadyTimer(0);
    detectionStartTimeRef.current = null;
  }, []);

  useEffect(() => {
    if (isOpen) {
      // Use setTimeout to avoid synchronous setState
      const timeoutId = setTimeout(resetStates, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, resetStates]);

  // Auto-capture logic using requestAnimationFrame instead of useEffect
  useEffect(() => {
    if (!isOpen || !isScanning) return;

    let animationId: number;
    let lastCheck = 0;
    const checkInterval = 100; // Check every 100ms

    const checkForAutoCapture = (timestamp: number) => {
      if (!isOpenRef.current || !isScanningRef.current) return;
      
      if (timestamp - lastCheck >= checkInterval) {
        lastCheck = timestamp;
        
        // Check if receipt has been detected consistently
        if (receiptDetectedRef.current && 
            detectionConfidenceRef.current > 0.75 && 
            !capturedImageRef.current && 
            countdownRef.current === null) {
          
          if (!detectionStartTimeRef.current) {
            detectionStartTimeRef.current = Date.now();
          }
          
          const detectionDuration = Date.now() - detectionStartTimeRef.current;
          
          if (detectionDuration > 1500) {
            // Start countdown
            setCountdown(3);
            
            let count = 3;
            const countdownInterval = setInterval(() => {
              count -= 1;
              if (count > 0) {
                setCountdown(count);
              } else {
                clearInterval(countdownInterval);
                setCountdown(null);
                // Trigger capture
                setShowShutter(true);
                setTimeout(() => {
                  onCapture();
                  setShowShutter(false);
                }, 150);
              }
            }, 1000);
            
            return; // Stop checking once countdown starts
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

  // Track hold steady timing - use layout effect to avoid ESLint warning
  const holdSteadyTimerRef = useRef(0);
  
  useLayoutEffect(() => {
    if (!isOpen || !isScanning) {
      holdSteadyTimerRef.current = 0;
      // Use flushSync to batch the state update properly
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
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 bg-black/80 backdrop-blur-md z-10">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="text-center">
          <span className="text-white font-semibold text-lg">Scan Receipt</span>
          <p className="text-white/60 text-xs">Auto-detecting receipt...</p>
        </div>
        <div className="w-10" />
      </div>

      {/* Camera Preview */}
      <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center gap-4 px-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-white">Camera Error</h3>
            <p className="text-white/70 max-w-xs">{errorMessage}</p>
            <Button onClick={onClose} variant="secondary" className="mt-4">
              Close
            </Button>
          </div>
        ) : capturedImage ? (
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <img
              src={capturedImage}
              alt="Captured receipt"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>
        ) : (
          <>
            {/* Video element - always rendered when camera is open */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            />
            
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10">
                <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="text-white/70 mt-4">Starting camera...</span>
              </div>
            )}
            
            {/* Scanner Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Dark overlay with cutout */}
              <svg className="absolute inset-0 w-full h-full">
                <defs>
                  <mask id="scanner-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <rect
                      x="10%"
                      y="20%"
                      width="80%"
                      height="60%"
                      rx="16"
                      fill="black"
                    />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0,0,0,0.5)"
                  mask="url(#scanner-mask)"
                />
              </svg>

              {/* Corner Guides */}
              <div 
                className="absolute left-[10%] top-[20%] w-8 h-8 border-l-4 border-t-4 rounded-tl-lg transition-all duration-300"
                style={{
                  borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white',
                  boxShadow: receiptDetected && detectionConfidence > 0.75 ? '0 0 20px #22c55e' : 'none',
                }}
              />
              <div 
                className="absolute right-[10%] top-[20%] w-8 h-8 border-r-4 border-t-4 rounded-tr-lg transition-all duration-300"
                style={{
                  borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white',
                  boxShadow: receiptDetected && detectionConfidence > 0.75 ? '0 0 20px #22c55e' : 'none',
                }}
              />
              <div 
                className="absolute left-[10%] bottom-[20%] w-8 h-8 border-l-4 border-b-4 rounded-bl-lg transition-all duration-300"
                style={{
                  borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white',
                  boxShadow: receiptDetected && detectionConfidence > 0.75 ? '0 0 20px #22c55e' : 'none',
                }}
              />
              <div 
                className="absolute right-[10%] bottom-[20%] w-8 h-8 border-r-4 border-b-4 rounded-br-lg transition-all duration-300"
                style={{
                  borderColor: receiptDetected && detectionConfidence > 0.75 ? '#22c55e' : 'white',
                  boxShadow: receiptDetected && detectionConfidence > 0.75 ? '0 0 20px #22c55e' : 'none',
                }}
              />

              {/* Center frame line */}
              <div 
                className="absolute left-[10%] right-[10%] top-1/2 h-px transition-all duration-300"
                style={{
                  background: receiptDetected 
                    ? `linear-gradient(90deg, transparent, ${detectionConfidence > 0.75 ? '#22c55e' : '#eab308'}, transparent)`
                    : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                  opacity: receiptDetected ? 1 : 0.5,
                }}
              />

              {/* Detection Status */}
              <div className="absolute top-[12%] left-1/2 -translate-x-1/2">
                {countdown !== null ? (
                  <div className="flex flex-col items-center">
                    <div className="text-6xl font-bold text-white animate-pulse">
                      {countdown}
                    </div>
                    <span className="text-white/80 text-sm mt-2">Hold steady...</span>
                  </div>
                ) : receiptDetected ? (
                  <div 
                    className="px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300"
                    style={{
                      backgroundColor: detectionConfidence > 0.75 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(234, 179, 8, 0.9)',
                      transform: detectionConfidence > 0.75 ? 'scale(1.05)' : 'scale(1)',
                    }}
                  >
                    <Scan className="w-4 h-4 text-white" />
                    <span className="text-white font-medium text-sm">
                      {detectionConfidence > 0.75 ? 'Receipt detected!' : 'Position receipt...'}
                    </span>
                  </div>
                ) : (
                  <div className="px-4 py-2 rounded-full bg-white/20 flex items-center gap-2">
                    <Scan className="w-4 h-4 text-white/70" />
                    <span className="text-white/70 text-sm">Point camera at receipt</span>
                  </div>
                )}
              </div>

              {/* Progress bar for hold steady */}
              {receiptDetected && detectionConfidence > 0.6 && countdown === null && (
                <div className="absolute top-[82%] left-1/2 -translate-x-1/2 w-48">
                  <div className="h-1 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-100"
                      style={{
                        width: `${Math.min((holdSteadyTimer / 1500) * 100, 100)}%`,
                        backgroundColor: holdSteadyTimer >= 1500 ? '#22c55e' : '#eab308',
                      }}
                    />
                  </div>
                  <p className="text-center text-white/80 text-xs mt-2">
                    {holdSteadyTimer >= 1500 ? 'Capturing...' : 'Hold steady...'}
                  </p>
                </div>
              )}

              {/* Tips */}
              <div className="absolute bottom-[8%] left-1/2 -translate-x-1/2 text-center">
                <p className="text-white/60 text-xs">
                  {receiptDetected 
                    ? 'Great! Hold still for auto-capture' 
                    : 'Ensure good lighting and fit receipt in frame'}
                </p>
              </div>
            </div>

            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}

        {/* Shutter Flash Effect */}
        {showShutter && (
          <div className="absolute inset-0 bg-white animate-pulse z-50" />
        )}
      </div>

      {/* Bottom Controls */}
      <div className="px-6 py-6 bg-black/80 backdrop-blur-md">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              onClick={onRetake}
              className="text-white hover:text-white hover:bg-white/20"
            >
              <RefreshCw className="w-5 h-5 mr-2" />
              Retake
            </Button>
            <Button
              onClick={onClose}
              className="bg-white text-black hover:bg-white/90"
              size="lg"
            >
              <Check className="w-5 h-5 mr-2" />
              Use This Photo
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-8">
            <div className="w-14" />
            <button
              onClick={handleManualCapture}
              disabled={isLoading}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full bg-white" />
            </button>
            <button
              onClick={onClose}
              className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptScannerCamera;
