import { useState, useRef, useEffect, useCallback } from 'react';

export type CameraError = 
  | 'permission_denied'
  | 'no_camera'
  | 'not_supported'
  | 'stream_error'
  | 'capture_error';

export interface CameraState {
  isOpen: boolean;
  isLoading: boolean;
  isScanning: boolean;
  error: CameraError | null;
  errorMessage: string;
  capturedImage: string | null;
  receiptDetected: boolean;
  detectionConfidence: number;
}

export interface UseCameraCaptureReturn {
  // State
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
  
  // Actions
  openCamera: () => Promise<void>;
  closeCamera: () => void;
  captureImage: () => File | null;
  autoCapture: () => Promise<File | null>;
  retake: () => void;
  clearError: () => void;
}

const ERROR_MESSAGES: Record<CameraError, string> = {
  permission_denied: 'Camera access was denied. Please allow camera permissions in your browser settings.',
  no_camera: 'No camera found on this device.',
  not_supported: 'Camera is not supported on this browser.',
  stream_error: 'Failed to start camera stream. Please try again.',
  capture_error: 'Failed to capture image. Please try again.',
};

// Analyze frame to detect receipt-like rectangle
const analyzeFrameForReceipt = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement
): { detected: boolean; confidence: number } => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { detected: false, confidence: 0 };

  // Draw video frame to canvas
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Get center region of the frame (where receipt should be)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scanWidth = Math.min(canvas.width * 0.7, 800);
  const scanHeight = Math.min(canvas.height * 0.5, 600);
  
  const imageData = ctx.getImageData(
    centerX - scanWidth / 2,
    centerY - scanHeight / 2,
    scanWidth,
    scanHeight
  );
  
  const data = imageData.data;
  let edgePixels = 0;
  let totalBrightness = 0;
  let brightPixels = 0;
  const threshold = 30; // Edge detection threshold
  
  // Sample pixels for edges and brightness
  for (let y = 1; y < scanHeight - 1; y += 4) {
    for (let x = 1; x < scanWidth - 1; x += 4) {
      const idx = (y * scanWidth + x) * 4;
      const rightIdx = (y * scanWidth + (x + 1)) * 4;
      const bottomIdx = ((y + 1) * scanWidth + x) * 4;
      
      // Calculate brightness
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      totalBrightness += brightness;
      
      if (brightness > 100) {
        brightPixels++;
      }
      
      // Simple edge detection
      const rightBrightness = (data[rightIdx] + data[rightIdx + 1] + data[rightIdx + 2]) / 3;
      const bottomBrightness = (data[bottomIdx] + data[bottomIdx + 1] + data[bottomIdx + 2]) / 3;
      
      if (Math.abs(brightness - rightBrightness) > threshold || 
          Math.abs(brightness - bottomBrightness) > threshold) {
        edgePixels++;
      }
    }
  }
  
  const totalSamples = (scanWidth / 4) * (scanHeight / 4);
  const avgBrightness = totalBrightness / totalSamples;
  const edgeDensity = edgePixels / totalSamples;
  const brightnessRatio = brightPixels / totalSamples;
  
  // Receipt detection heuristics
  // Receipts typically have:
  // 1. Good lighting (not too dark)
  // 2. Visible edges/text (edge density)
  // 3. Paper-like brightness
  const hasGoodLighting = avgBrightness > 80 && avgBrightness < 240;
  const hasEdges = edgeDensity > 0.05 && edgeDensity < 0.4;
  const hasPaperBrightness = brightnessRatio > 0.3;
  
  let confidence = 0;
  if (hasGoodLighting) confidence += 0.4;
  if (hasEdges) confidence += 0.35;
  if (hasPaperBrightness) confidence += 0.25;
  
  // Detected if confidence is high enough
  const detected = confidence > 0.6;
  
  return { detected, confidence };
};

export const useCameraCapture = (): UseCameraCaptureReturn => {
  const [state, setState] = useState<CameraState>({
    isOpen: false,
    isLoading: false,
    isScanning: false,
    error: null,
    errorMessage: '',
    capturedImage: null,
    receiptDetected: false,
    detectionConfidence: 0,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const detectionStartTime = useRef<number | null>(null);

  // Track mount state for safe async operations
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Cleanup function to stop all tracks
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  // Detection loop
  const startDetection = useCallback(() => {
    const detect = () => {
      if (!isMountedRef.current || !videoRef.current || !canvasRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const result = analyzeFrameForReceipt(canvas, video);
        
        if (isMountedRef.current) {
          setState(prev => ({
            ...prev,
            receiptDetected: result.detected,
            detectionConfidence: result.confidence,
          }));
          
          // Track how long receipt has been detected
          if (result.detected && result.confidence > 0.75) {
            if (!detectionStartTime.current) {
              detectionStartTime.current = Date.now();
            }
          } else {
            detectionStartTime.current = null;
          }
        }
      }
      
      if (isMountedRef.current && !state.capturedImage) {
        animationFrameRef.current = requestAnimationFrame(detect);
      }
    };
    
    detect();
  }, [state.capturedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      
      // Revoke any object URLs to prevent memory leaks
      if (state.capturedImage && state.capturedImage.startsWith('blob:')) {
        URL.revokeObjectURL(state.capturedImage);
      }
    };
  }, [stopStream, state.capturedImage]);

  const setError = useCallback((errorType: CameraError) => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        error: errorType,
        errorMessage: ERROR_MESSAGES[errorType],
        isLoading: false,
        isScanning: false,
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        error: null,
        errorMessage: '',
      }));
    }
  }, []);

  const openCamera = useCallback(async () => {
    // Check if camera API is supported
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('not_supported');
      return;
    }

    // First set loading state, but don't wait for it
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        isOpen: true,
        isLoading: true,
        error: null,
        errorMessage: '',
        receiptDetected: false,
        detectionConfidence: 0,
      }));
    }

    // Allow React to render the video element first
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now check if video element is available
    if (!videoRef.current) {
      setError('stream_error');
      return;
    }

    try {
      // Try to get rear camera on mobile first, fallback to any camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (!isMountedRef.current) {
        // Component unmounted during async operation
        stream.getTracks().forEach(track => track.stop());
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const handleCanPlay = () => {
          videoRef.current?.removeEventListener('canplay', handleCanPlay);
          videoRef.current?.removeEventListener('error', handleError);
          resolve();
        };

        const handleError = (e: Event) => {
          videoRef.current?.removeEventListener('canplay', handleCanPlay);
          videoRef.current?.removeEventListener('error', handleError);
          reject(e);
        };

        videoRef.current!.addEventListener('canplay', handleCanPlay);
        videoRef.current!.addEventListener('error', handleError);
        
        // Set a timeout in case the video never loads
        setTimeout(() => {
          videoRef.current?.removeEventListener('canplay', handleCanPlay);
          videoRef.current?.removeEventListener('error', handleError);
          reject(new Error('Video load timeout'));
        }, 10000);
      });

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isScanning: true,
        }));
        
        // Start detection loop
        startDetection();
      }
    } catch (err) {
      // Handle specific error types
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError('permission_denied');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setError('no_camera');
        } else if (err.name === 'NotSupportedError') {
          setError('not_supported');
        } else {
          setError('stream_error');
        }
      } else {
        setError('stream_error');
      }
      
      // Stop any partial stream
      stopStream();
    }
  }, [setError, stopStream, startDetection]);

  const closeCamera = useCallback(() => {
    stopStream();
    detectionStartTime.current = null;
    
    if (state.capturedImage && state.capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(state.capturedImage);
    }
    
    if (isMountedRef.current) {
      setState({
        isOpen: false,
        isLoading: false,
        isScanning: false,
        error: null,
        errorMessage: '',
        capturedImage: null,
        receiptDetected: false,
        detectionConfidence: 0,
      });
    }
  }, [stopStream, state.capturedImage]);

  const captureImage = useCallback((): File | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      setError('capture_error');
      return null;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        setError('capture_error');
        return null;
      }

      // Draw the current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      // Stop the stream after capture
      stopStream();
      
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          capturedImage: dataUrl,
          isScanning: false,
        }));
      }

      // Convert data URL to File
      const byteString = atob(dataUrl.split(',')[1]);
      const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      
      const blob = new Blob([ab], { type: mimeString });
      const file = new File([blob], `receipt-capture-${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      return file;
    } catch {
      setError('capture_error');
      return null;
    }
  }, [setError, stopStream]);

  const autoCapture = useCallback(async (): Promise<File | null> => {
    return new Promise((resolve) => {
      const checkDetection = () => {
        if (!isMountedRef.current) {
          resolve(null);
          return;
        }

        // Check if receipt has been detected consistently for 1.5 seconds
        if (detectionStartTime.current && 
            state.receiptDetected && 
            state.detectionConfidence > 0.75) {
          const detectionDuration = Date.now() - detectionStartTime.current;
          
          if (detectionDuration > 1500) {
            // Auto capture!
            const file = captureImage();
            resolve(file);
            return;
          }
        }
        
        // Continue checking
        if (state.isScanning && !state.capturedImage) {
          setTimeout(checkDetection, 100);
        } else {
          resolve(null);
        }
      };
      
      checkDetection();
    });
  }, [captureImage, state.receiptDetected, state.detectionConfidence, state.isScanning, state.capturedImage]);

  const retake = useCallback(() => {
    if (state.capturedImage && state.capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(state.capturedImage);
    }
    
    detectionStartTime.current = null;
    
    if (isMountedRef.current) {
      setState(prev => ({
        ...prev,
        capturedImage: null,
        receiptDetected: false,
        detectionConfidence: 0,
        error: null,
        errorMessage: '',
      }));
    }
    
    // Reopen the camera
    void openCamera();
  }, [openCamera, state.capturedImage]);

  return {
    // State
    isOpen: state.isOpen,
    isLoading: state.isLoading,
    isScanning: state.isScanning,
    error: state.error,
    errorMessage: state.errorMessage,
    capturedImage: state.capturedImage,
    receiptDetected: state.receiptDetected,
    detectionConfidence: state.detectionConfidence,
    videoRef,
    canvasRef,
    
    // Actions
    openCamera,
    closeCamera,
    captureImage,
    autoCapture,
    retake,
    clearError,
  };
};

export default useCameraCapture;
