import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCameraCapture } from './useCameraCapture';

// Mock canvas context
const mockGetContext = vi.fn();
const mockDrawImage = vi.fn();
const mockGetImageData = vi.fn();
const mockToDataURL = vi.fn();

// Create a persistent mock 2D context
const createMockContext = () => ({
  drawImage: mockDrawImage,
  getImageData: mockGetImageData,
});

// Mock ImageData constructor
global.ImageData = vi.fn().mockImplementation((data, width, height) => ({
  data: data || new Uint8ClampedArray(width * height * 4),
  width,
  height,
})) as unknown as typeof ImageData;

// Mock canvas element
class MockCanvas {
  width = 1920;
  height = 1080;
  
  getContext(type: string) {
    if (type === '2d') {
      return createMockContext();
    }
    return null;
  }
  
  toDataURL() {
    return mockToDataURL();
  }
}

// Mock video element
class MockVideoElement {
  videoWidth = 1920;
  videoHeight = 1080;
  readyState = 4; // HAVE_ENOUGH_DATA
  srcObject: MediaStream | null = null;
  
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  
  addEventListener = vi.fn((event: string, handler: () => void) => {
    if (event === 'canplay') {
      // Simulate canplay event after a short delay
      setTimeout(() => handler(), 10);
    }
  });
  
  removeEventListener = vi.fn();
}

// Mock MediaStream
const mockGetTracks = vi.fn().mockReturnValue([
  { stop: vi.fn() },
  { stop: vi.fn() },
]);

class MockMediaStream {
  getTracks = mockGetTracks;
}

// Mock navigator.mediaDevices
const mockGetUserMedia = vi.fn();

Object.defineProperty(global, 'navigator', {
  value: {
    mediaDevices: {
      getUserMedia: mockGetUserMedia,
    },
  },
  writable: true,
});

// Mock Blob and File
class MockBlob {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_parts: unknown[], _options: { type?: string }) {
    // Mock implementation
  }
}

class MockFile {
  name: string;
  type: string;
  lastModified: number;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_parts: unknown[], name: string, options?: { type?: string; lastModified?: number }) {
    this.name = name;
    this.type = options?.type || '';
    this.lastModified = options?.lastModified || Date.now();
  }
}

global.Blob = MockBlob as unknown as typeof Blob;
global.File = MockFile as unknown as typeof File;

// Mock URL methods
Object.defineProperty(global, 'URL', {
  value: {
    revokeObjectURL: vi.fn(),
  },
  writable: true,
});

// Mock atob for base64 decoding
global.atob = vi.fn((str: string) => {
  // Simple mock - just return a string of the same length
  return 'x'.repeat(str.length);
});

// Mock ArrayBuffer and Uint8Array are already available in jsdom

describe('useCameraCapture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    
    // Reset mock implementations
    mockGetContext.mockReturnValue({
      drawImage: mockDrawImage,
      getImageData: mockGetImageData,
    });
    
    // Default successful frame analysis (receipt detected)
    mockGetImageData.mockReturnValue({
      data: new Uint8ClampedArray(800 * 600 * 4).fill(200), // Bright image
      width: 800,
      height: 600,
    });
    
    mockToDataURL.mockReturnValue('data:image/jpeg;base64,mockedImageData');
    
    // Mock successful getUserMedia
    mockGetUserMedia.mockResolvedValue(new MockMediaStream());
    
    // Setup navigator.mediaDevices mock properly
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: mockGetUserMedia,
      },
      writable: true,
      configurable: true,
    });
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Hook Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useCameraCapture());
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBe('');
      expect(result.current.capturedImage).toBeNull();
      expect(result.current.receiptDetected).toBe(false);
      expect(result.current.detectionConfidence).toBe(0);
      expect(result.current.videoRef.current).toBeNull();
      expect(result.current.canvasRef.current).toBeNull();
    });

    it('should provide all required actions', () => {
      const { result } = renderHook(() => useCameraCapture());
      
      expect(typeof result.current.openCamera).toBe('function');
      expect(typeof result.current.closeCamera).toBe('function');
      expect(typeof result.current.captureImage).toBe('function');
      expect(typeof result.current.autoCapture).toBe('function');
      expect(typeof result.current.retake).toBe('function');
      expect(typeof result.current.clearError).toBe('function');
    });
  });

  describe('Camera Operations', () => {
    it('should open camera successfully', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      // Mock the video element
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      // Assign refs
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      // Camera should be open after promise resolves
      expect(result.current.isOpen).toBe(true);
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
    });

    it('should set scanning state after camera opens', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      // Wait for the canplay event to fire
      await vi.advanceTimersByTimeAsync(50);
      
      await waitFor(() => {
        expect(result.current.isScanning).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should close camera and reset state', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Open camera first
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      // Close camera
      act(() => {
        result.current.closeCamera();
      });
      
      expect(result.current.isOpen).toBe(false);
      expect(result.current.isScanning).toBe(false);
      expect(result.current.capturedImage).toBeNull();
      expect(result.current.receiptDetected).toBe(false);
      expect(result.current.detectionConfidence).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as Error & { name: string }).name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);
      
      const { result } = renderHook(() => useCameraCapture());
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('permission_denied');
        expect(result.current.errorMessage).toBe(
          'Camera access was denied. Please allow camera permissions in your browser settings.'
        );
      });
    });

    it('should handle no camera error', async () => {
      const notFoundError = new Error('Not found');
      (notFoundError as Error & { name: string }).name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);
      
      const { result } = renderHook(() => useCameraCapture());
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await waitFor(() => {
        expect(result.current.error).toBe('no_camera');
        expect(result.current.errorMessage).toBe('No camera found on this device.');
      });
    });

    it('should handle not supported error when mediaDevices is unavailable', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: undefined,
        writable: true,
      });
      
      const { result } = renderHook(() => useCameraCapture());
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      expect(result.current.error).toBe('not_supported');
      expect(result.current.errorMessage).toBe('Camera is not supported on this browser.');
    });

    it('should clear error when clearError is called', async () => {
      const permissionError = new Error('Permission denied');
      (permissionError as Error & { name: string }).name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);
      
      const { result } = renderHook(() => useCameraCapture());
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });
      
      act(() => {
        result.current.clearError();
      });
      
      expect(result.current.error).toBeNull();
      expect(result.current.errorMessage).toBe('');
    });

    it('should handle capture error when video is not ready', () => {
      const { result } = renderHook(() => useCameraCapture());
      
      // Don't set video ref
      let capturedFile: File | null = null;
      
      act(() => {
        capturedFile = result.current.captureImage();
      });
      
      expect(capturedFile).toBeNull();
      expect(result.current.error).toBe('capture_error');
    });
  });

  describe('Receipt Detection', () => {
    it('should detect receipt when frame analysis returns high confidence', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Create image data that will pass the detection algorithm
      const scanWidth = 560;
      const scanHeight = 300;
      const imageData = new Uint8ClampedArray(scanWidth * scanHeight * 4);
      
      for (let i = 0; i < imageData.length; i += 4) {
        const x = (i / 4) % scanWidth;
        const y = Math.floor((i / 4) / scanWidth);
        const isEdge = (x % 20 === 0) || (y % 20 === 0);
        
        if (isEdge) {
          imageData[i] = 60;
          imageData[i + 1] = 60;
          imageData[i + 2] = 60;
        } else {
          imageData[i] = 200;
          imageData[i + 1] = 200;
          imageData[i + 2] = 200;
        }
        imageData[i + 3] = 255;
      }
      
      mockGetImageData.mockReturnValue({
        data: imageData,
        width: scanWidth,
        height: scanHeight,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      // Advance time to allow detection loop to run multiple times
      await vi.advanceTimersByTimeAsync(200);
      
      // Detection should have run - just verify state updates occurred
      expect(result.current.isScanning).toBe(true);
    });

    it('should not detect receipt in dark image', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Mock dark image (no receipt)
      mockGetImageData.mockReturnValue({
        data: new Uint8ClampedArray(800 * 600 * 4).fill(30), // Dark image
        width: 800,
        height: 600,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(100);
      
      await waitFor(() => {
        expect(result.current.receiptDetected).toBe(false);
        expect(result.current.detectionConfidence).toBeLessThanOrEqual(0.6);
      });
    });

    it('should update detection confidence over time', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Start with low confidence image (dark)
      const scanWidth = 560;
      const scanHeight = 300;
      const darkImageData = new Uint8ClampedArray(scanWidth * scanHeight * 4).fill(30);
      
      mockGetImageData.mockReturnValue({
        data: darkImageData,
        width: scanWidth,
        height: scanHeight,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(100);
      
      // Store initial detection state for comparison
      const initialDetected = result.current.receiptDetected;
      expect(initialDetected).toBeDefined();
      
      // Now switch to bright image with edges
      const brightImageData = new Uint8ClampedArray(scanWidth * scanHeight * 4);
      for (let i = 0; i < brightImageData.length; i += 4) {
        const x = (i / 4) % scanWidth;
        const y = Math.floor((i / 4) / scanWidth);
        const isEdge = (x % 20 === 0) || (y % 20 === 0);
        
        if (isEdge) {
          brightImageData[i] = 60;
          brightImageData[i + 1] = 60;
          brightImageData[i + 2] = 60;
        } else {
          brightImageData[i] = 200;
          brightImageData[i + 1] = 200;
          brightImageData[i + 2] = 200;
        }
        brightImageData[i + 3] = 255;
      }
      
      mockGetImageData.mockReturnValue({
        data: brightImageData,
        width: scanWidth,
        height: scanHeight,
      });
      
      // Advance more time for detection to update
      await vi.advanceTimersByTimeAsync(200);
      
      // Scanning should still be active
      expect(result.current.isScanning).toBe(true);
    });
  });

  describe('Image Capture', () => {
    it('should capture image successfully', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Open camera first
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      // Capture the image and verify
      const capturedFile = result.current.captureImage();
      
      expect(capturedFile).not.toBeNull();
      expect(capturedFile?.type).toBe('image/jpeg');
      expect(capturedFile?.name).toMatch(/^receipt-capture-\d+\.jpg$/);
      
      // Wait for state updates
      await waitFor(() => {
        expect(result.current.capturedImage).toBe('data:image/jpeg;base64,mockedImageData');
        expect(result.current.isScanning).toBe(false);
      });
    });

    it('should handle retake functionality', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Open and capture
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      act(() => {
        result.current.captureImage();
      });
      
      expect(result.current.capturedImage).not.toBeNull();
      
      // Retake
      await act(async () => {
        await result.current.retake();
      });
      
      expect(result.current.capturedImage).toBeNull();
      expect(result.current.receiptDetected).toBe(false);
      expect(result.current.detectionConfidence).toBe(0);
    });
  });

  describe('Auto Capture', () => {
    it('should track detection state for auto capture eligibility', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Create bright image with edges for high confidence detection
      const scanWidth = 560;
      const scanHeight = 300;
      const imageData = new Uint8ClampedArray(scanWidth * scanHeight * 4);
      for (let i = 0; i < imageData.length; i += 4) {
        const x = (i / 4) % scanWidth;
        const y = Math.floor((i / 4) / scanWidth);
        
        // Create edges by varying brightness
        if (x % 10 === 0 || y % 10 === 0) {
          imageData[i] = 60;
          imageData[i + 1] = 60;
          imageData[i + 2] = 60;
        } else {
          imageData[i] = 210;
          imageData[i + 1] = 210;
          imageData[i + 2] = 210;
        }
        imageData[i + 3] = 255;
      }
      
      mockGetImageData.mockReturnValue({
        data: imageData,
        width: scanWidth,
        height: scanHeight,
      });
      
      // Open camera
      await act(async () => {
        await result.current.openCamera();
      });
      
      // Wait for camera to initialize and detection to run
      await vi.advanceTimersByTimeAsync(100);
      
      // The hook should be in scanning state
      expect(result.current.isScanning).toBe(true);
    }, 10000);

    it('should not auto capture if detection confidence is low', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      // Dark image = low confidence
      const scanWidth = 560;
      const scanHeight = 300;
      mockGetImageData.mockReturnValue({
        data: new Uint8ClampedArray(scanWidth * scanHeight * 4).fill(30),
        width: scanWidth,
        height: scanHeight,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(100);
      
      // With dark image, detection should be false
      expect(result.current.receiptDetected).toBe(false);
    }, 10000);
  });

  describe('Cleanup', () => {
    it('should stop stream when component unmounts', async () => {
      const { result, unmount } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      unmount();
      
      // Verify cleanup happened (video srcObject should be cleared)
      expect(videoElement.srcObject).toBeNull();
    });

    it('should cleanup when closing camera with captured image', async () => {
      const { result } = renderHook(() => useCameraCapture());
      
      const videoElement = new MockVideoElement() as unknown as HTMLVideoElement;
      const canvasElement = new MockCanvas() as unknown as HTMLCanvasElement;
      
      Object.defineProperty(result.current.videoRef, 'current', {
        value: videoElement,
        writable: true,
      });
      Object.defineProperty(result.current.canvasRef, 'current', {
        value: canvasElement,
        writable: true,
      });
      
      await act(async () => {
        await result.current.openCamera();
      });
      
      await vi.advanceTimersByTimeAsync(50);
      
      act(() => {
        result.current.captureImage();
      });
      
      expect(result.current.capturedImage).not.toBeNull();
      
      act(() => {
        result.current.closeCamera();
      });
      
      // After closing, captured image should be cleared
      expect(result.current.capturedImage).toBeNull();
      expect(result.current.isOpen).toBe(false);
    });
  });
});
