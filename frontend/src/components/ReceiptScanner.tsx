import { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  X, 
  Check, 
  Loader2,
  Edit3,
  Save,
  RefreshCw,
  ShoppingCart,
  Calendar,
  DollarSign,
  Store,
  AlertTriangle,
  Sparkles,
  ScanLine,
  FileImage,
  Camera,
  Aperture
} from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import ReceiptScannerCamera from './ReceiptScannerCamera';
import { receiptService, categoryService } from '../services/api';
import { useCameraCapture } from '../hooks/useCameraCapture';
import type { OCRResult, Category } from '../types';

interface ReceiptScannerProps {
  onSuccess?: () => void;
}

type ScanMode = 'upload' | 'camera' | null;

const ReceiptScanner = ({ onSuccess }: ReceiptScannerProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<OCRResult | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>(null);

  const [formData, setFormData] = useState({
    store_name: '',
    date: '',
    total: '',
    subtotal: '',
    tax: '',
    category_id: '',
    description: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isMountedRef = useRef(true);

  // Camera capture hook
  const {
    isOpen: isCameraOpen,
    isLoading: isCameraLoading,
    isScanning: isCameraScanning,
    error: cameraError,
    errorMessage: cameraErrorMessage,
    capturedImage,
    receiptDetected,
    detectionConfidence,
    videoRef,
    canvasRef,
    openCamera,
    closeCamera,
    captureImage,
    retake,
    clearError: clearCameraError,
  } = useCameraCapture();

  // Track mount state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    abortControllerRef.current = new AbortController();
    
    categoryService.getCategories()
      .then((data) => {
        if (isMountedRef.current) {
          setCategories(data);
        }
      })
      .catch((err) => {
        if (isMountedRef.current) {
          console.error('Failed to load categories:', err);
        }
      });

    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Sync camera error with component error state
  useEffect(() => {
    if (cameraError && cameraErrorMessage) {
      setError(cameraErrorMessage);
    }
  }, [cameraError, cameraErrorMessage]);

  // Handle captured image from camera
  useEffect(() => {
    if (capturedImage && isCameraOpen) {
      // Convert data URL to file
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `receipt-capture-${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          
          if (isMountedRef.current) {
            setError(null);
            setSelectedFile(file);
            const url = URL.createObjectURL(file);
            setPreviewUrl(prev => {
              // Revoke previous URL to prevent memory leak
              if (prev) {
                URL.revokeObjectURL(prev);
              }
              return url;
            });
            setScanResult(null);
            setScanMode('camera');
          }
        })
        .catch(err => {
          console.error('Failed to process captured image:', err);
          if (isMountedRef.current) {
            setError('Failed to process captured image');
          }
        });
    }
  }, [capturedImage, isCameraOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      // Clear all timeouts
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
      
      // Revoke object URL to prevent memory leak
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      // Close camera if open
      closeCamera();
    };
  }, [previewUrl, closeCamera]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      if (isMountedRef.current) setError('Please select a valid image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      if (isMountedRef.current) setError('File size must be less than 10MB');
      return;
    }

    // Revoke previous URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    if (isMountedRef.current) {
      setError(null);
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setScanResult(null);
      setScanMode('upload');
    }
  };

  const handleStartCamera = async () => {
    setError(null);
    clearCameraError();
    await openCamera();
  };

  const handleCloseCamera = () => {
    closeCamera();
    if (!capturedImage) {
      setScanMode(null);
    }
  };

  const handleRetake = () => {
    // Revoke current preview URL
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    retake();
  };

  const handleScan = async () => {
    if (!selectedFile || !isMountedRef.current) return;
    
    setIsScanning(true);
    setScanProgress(0);
    setError(null);

    // Clear any existing interval first
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    // Simulate progress
    progressIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        clearInterval(progressIntervalRef.current!);
        progressIntervalRef.current = null;
        return;
      }
      setScanProgress(prev => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      const result = await receiptService.scanReceipt(selectedFile);
      
      if (!isMountedRef.current) return;
      
      setScanResult(result);
      
      if (result.success && result.extracted_data) {
        setFormData({
          store_name: result.extracted_data.store_name || '',
          date: result.extracted_data.date || new Date().toISOString().split('T')[0],
          total: result.extracted_data.total?.toString() || '',
          subtotal: result.extracted_data.subtotal?.toString() || '',
          tax: result.extracted_data.tax?.toString() || '',
          category_id: '',
          description: `Receipt from ${result.extracted_data.store_name || 'Unknown'}`,
        });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to scan receipt');
      }
    } finally {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      
      if (isMountedRef.current) {
        setScanProgress(100);
        const timeoutId = setTimeout(() => {
          if (isMountedRef.current) {
            setIsScanning(false);
          }
        }, 300);
        timeoutRefs.current.push(timeoutId);
      }
    }
  };

  const handleSave = async () => {
    if (!scanResult?.receipt_id || !isMountedRef.current) return;

    setIsSaving(true);
    setError(null);

    try {
      await receiptService.confirmReceipt(scanResult.receipt_id, {
        type: 'expense',
        amount: parseFloat(formData.total) || 0,
        category_id: formData.category_id ? parseInt(formData.category_id) : undefined,
        description: formData.description,
        merchant: formData.store_name,
        date: formData.date,
      });

      if (!isMountedRef.current) return;

      setIsSuccess(true);
      
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          onSuccess?.();
        }
      }, 2000);
      timeoutRefs.current.push(timeoutId);
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to save transaction');
        setIsSaving(false);
      }
    }
  };

  const handleClear = () => {
    // Revoke object URL to prevent memory leak
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setError(null);
    setIsSuccess(false);
    setScanMode(null);
    setFormData({
      store_name: '',
      date: '',
      total: '',
      subtotal: '',
      tax: '',
      category_id: '',
      description: '',
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Close camera if open
    closeCamera();
  };

  const handleRescan = () => {
    setScanResult(null);
    setError(null);
    
    // Return to appropriate mode
    if (scanMode === 'camera') {
      handleRetake();
    } else if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8">
        <div className="w-24 h-24 rounded-full bg-success-100 flex items-center justify-center mb-6 shadow-lg">
          <Check className="w-12 h-12 text-success-600" strokeWidth={2.5} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-2">
          Receipt Saved!
        </h3>
        <p className="text-slate-500 text-center max-w-sm">
          Your transaction has been saved successfully. Redirecting...
        </p>
        <div className="mt-8 flex gap-3">
          <Button onClick={handleClear} variant="secondary" leftIcon={<RefreshCw className="w-4 h-4" />}>
            Scan Another
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Immersive Camera Scanner */}
      <ReceiptScannerCamera
        isOpen={isCameraOpen}
        isLoading={isCameraLoading}
        isScanning={isCameraScanning}
        error={cameraError}
        errorMessage={cameraErrorMessage}
        capturedImage={capturedImage}
        receiptDetected={receiptDetected}
        detectionConfidence={detectionConfidence}
        videoRef={videoRef}
        canvasRef={canvasRef}
        onClose={handleCloseCamera}
        onCapture={captureImage}
        onRetake={handleRetake}
      />

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-center gap-3 text-danger-700">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
          <p className="font-medium">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-danger-100 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload State */}
      {!scanResult && !isScanning && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Upload Area */}
          <div className="space-y-4">
            {/* Upload Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !previewUrl && fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer
                transition-all duration-200 min-h-[320px] flex flex-col items-center justify-center
                ${isDragging 
                  ? 'border-primary-500 bg-primary-50/50' 
                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }
                ${previewUrl ? 'border-solid border-primary-200 bg-slate-50/30' : ''}
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="relative w-full h-full flex flex-col items-center">
                  <div className="relative w-full max-w-sm">
                    <img
                      src={previewUrl}
                      alt="Receipt preview"
                      className="max-w-full max-h-[240px] mx-auto rounded-2xl object-contain shadow-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear();
                      }}
                      className="absolute -top-3 -right-3 p-2.5 bg-white rounded-full shadow-lg hover:bg-slate-50 transition-all border border-slate-100"
                    >
                      <X className="w-5 h-5 text-slate-600" />
                    </button>
                  </div>
                  <p className="mt-5 text-sm text-slate-500 font-medium">
                    Click to change image
                  </p>
                </div>
              ) : (
                <>
                  <div className={`
                    w-20 h-20 rounded-2xl flex items-center justify-center mb-6
                    transition-all duration-200
                    ${isDragging 
                      ? 'bg-primary-100' 
                      : 'bg-slate-100 border border-slate-200'
                    }
                  `}>
                    <ScanLine className={`w-10 h-10 ${isDragging ? 'text-primary-600' : 'text-slate-400'}`} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Drop your receipt here
                  </h3>
                  <p className="text-slate-500 mb-6 max-w-xs text-sm">
                    or click to browse from your device. Supports JPG, PNG up to 10MB
                  </p>
                  <Button 
                    variant="secondary" 
                    size="md"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                  >
                    Choose File
                  </Button>
                </>
              )}
            </div>

            {/* Camera Option */}
            {!previewUrl && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-slate-500">or</span>
                </div>
              </div>
            )}

            {!previewUrl && (
              <button
                onClick={handleStartCamera}
                className="w-full py-4 px-6 border-2 border-dashed border-slate-200 rounded-2xl 
                         hover:border-primary-300 hover:bg-primary-50/30
                         transition-all duration-200 group
                         flex items-center justify-center gap-3"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors">
                  <Camera className="w-6 h-6 text-primary-600" />
                </div>
                <div className="text-left">
                  <h4 className="font-semibold text-slate-900">Use Camera</h4>
                  <p className="text-sm text-slate-500">Auto-scan with AI detection</p>
                </div>
                <Aperture className="w-5 h-5 text-slate-400 ml-auto" />
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="flex flex-col justify-center space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-primary-500" />
                <span className="text-sm font-semibold text-primary-600 uppercase tracking-wider">How it works</span>
              </div>
              <div className="space-y-5">
                {[
                  { step: 1, title: 'Upload or Scan', desc: 'Drag & drop, select a file, or use auto-scan camera', icon: FileImage },
                  { step: 2, title: 'AI Scanning', desc: 'Our AI extracts store name, date, items, and total', icon: ScanLine },
                  { step: 3, title: 'Review & Save', desc: 'Edit any details and save to your transactions', icon: Check },
                ].map((item) => (
                  <div 
                    key={item.step} 
                    className="flex items-start gap-5 p-5 rounded-2xl bg-slate-50 border border-slate-100"
                  >
                    <div className="
                      w-12 h-12 rounded-xl 
                      bg-primary-600 text-white 
                      flex items-center justify-center font-bold text-lg flex-shrink-0
                    ">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 text-lg">{item.title}</h4>
                      <p className="text-slate-500 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedFile && (
              <div>
                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleScan}
                  leftIcon={<ScanLine className="w-5 h-5" />}
                >
                  Scan Receipt with AI
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scanning State */}
      {isScanning && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="relative w-40 h-40 mb-10">
            <div className="absolute inset-0 rounded-full border-4 border-primary-100 animate-pulse" />
            <div className="absolute inset-3 rounded-full border-4 border-primary-200 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <div className="absolute inset-6 rounded-full bg-primary-50 flex items-center justify-center shadow-lg">
              <Loader2 className="w-16 h-16 text-primary-600 animate-spin" />
            </div>
          </div>
          
          <h3 className="text-2xl font-bold text-slate-900 mb-3">
            Scanning Receipt...
          </h3>
          <p className="text-slate-500 mb-10 text-center max-w-md">
            Our AI is extracting text and analyzing your receipt details
          </p>

          {/* Progress bar */}
          <div className="w-80 h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full rounded-full bg-primary-500 transition-all duration-200"
              style={{ width: `${Math.min(scanProgress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-slate-400 mt-4 font-medium">{Math.round(Math.min(scanProgress, 100))}% complete</p>
        </div>
      )}

      {/* Result State */}
      {scanResult && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center">
                <Check className="w-7 h-7 text-success-600" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Receipt Scanned Successfully
                </h3>
                <p className="text-sm text-slate-500">
                  Confidence: <span className="font-semibold text-primary-600">{scanResult.confidence?.toFixed(0)}%</span> • 
                  Processing time: <span className="font-semibold">{scanResult.processing_time}ms</span>
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleRescan} leftIcon={<RefreshCw className="w-4 h-4" />}>
              Rescan
            </Button>
          </div>

          {/* Warnings */}
          {scanResult.warnings && scanResult.warnings.length > 0 && (
            <div className="p-5 bg-warning-50 border border-warning-200 rounded-2xl">
              <div className="flex items-center gap-2 text-warning-700 mb-3">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
                <span className="font-semibold">Please review these items:</span>
              </div>
              <ul className="list-disc list-inside text-sm text-warning-700 space-y-1.5">
                {scanResult.warnings.map((warning: string, i: number) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-lg">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Edit3 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-lg">Review & Edit Details</h4>
                <p className="text-sm text-slate-500">Verify and adjust the extracted information</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Store Name */}
              <div>
                <Input
                  label="Store Name"
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  leftIcon={<Store className="w-4 h-4" />}
                  placeholder="e.g., Whole Foods Market"
                />
              </div>

              {/* Date */}
              <div>
                <Input
                  label="Date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  leftIcon={<Calendar className="w-4 h-4" />}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <span className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    Category
                  </span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="
                    w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                    focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                    transition-all duration-200
                  "
                >
                  <option value="">Select a category</option>
                  {categories.filter(c => c.type === 'expense').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Total */}
              <div>
                <Input
                  label="Total Amount"
                  type="number"
                  step="0.01"
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  leftIcon={<DollarSign className="w-4 h-4" />}
                  placeholder="0.00"
                />
              </div>

              {/* Subtotal & Tax */}
              <div>
                <Input
                  label="Subtotal (optional)"
                  type="number"
                  step="0.01"
                  value={formData.subtotal}
                  onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Input
                  label="Tax (optional)"
                  type="number"
                  step="0.01"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="
                    w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900
                    focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500
                    transition-all duration-200 min-h-[100px] resize-none
                  "
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-10 pt-8 border-t border-slate-100">
              <Button 
                className="flex-1" 
                size="lg"
                onClick={handleSave}
                isLoading={isSaving}
                leftIcon={!isSaving ? <Save className="w-5 h-5" /> : undefined}
              >
                Save Transaction
              </Button>
              <Button 
                variant="secondary" 
                size="lg"
                onClick={handleClear}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReceiptScanner;
