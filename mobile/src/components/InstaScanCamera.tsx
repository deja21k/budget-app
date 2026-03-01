import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {
  Canvas,
  Group,
  RoundedRect,
  Line,
  vec,
} from '@shopify/react-native-skia';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import type { DetectedDocument, ScanConfig, ReceiptData } from '../types/scanner';
import { scanDocument } from '../utils/frameProcessor';
import { useStabilityLock } from '../hooks/useStabilityLock';
import { useOCRExtraction } from '../hooks/useOCRExtraction';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface InstaScanCameraProps {
  config?: Partial<ScanConfig>;
  onCapture?: (imageUri: string, data: ReceiptData | null) => void;
  onError?: (error: string) => void;
  onClose?: () => void;
}

const DEFAULT_CONFIG: ScanConfig = {
  stabilityThreshold: 500,
  captureConfidence: 0.85,
  enableHapticFeedback: true,
  enableSkeletonPreview: true,
};

export const InstaScanCamera: React.FC<InstaScanCameraProps> = ({
  config = {},
  onCapture,
  onError,
  onClose,
}) => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectedDocument, setDetectedDocument] = useState<DetectedDocument | null>(null);
  const [showSkeleton, setShowSkeleton] = useState(false);
  
  const cameraRef = useRef<Camera>(null);
  const hasTriggeredCapture = useRef(false);
  
  const { isLocked, lockProgress, checkStability } = useStabilityLock(fullConfig);
  const { isProcessing, receiptData, extractFromImage } = useOCRExtraction();
  
  const overlayOpacity = useSharedValue(0.3);
  const frameScale = useSharedValue(1);
  const glowIntensity = useSharedValue(0);
  
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);
  
  useEffect(() => {
    overlayOpacity.value = withTiming(detectedDocument ? 0.5 : 0.3, { duration: 200 });
    glowIntensity.value = withTiming(isLocked ? 1 : detectedDocument ? 0.5 : 0, { duration: 300 });
    
    if (detectedDocument && !isLocked) {
      frameScale.value = withSpring(1.02, { damping: 10 });
      setTimeout(() => {
        frameScale.value = withSpring(1, { damping: 10 });
      }, 100);
    }
  }, [detectedDocument, isLocked, overlayOpacity, frameScale, glowIntensity]);
  
  const triggerCapture = useCallback(async () => {
    if (isCapturing || hasTriggeredCapture.current || !cameraRef.current) return;
    
    hasTriggeredCapture.current = true;
    setIsCapturing(true);
    
    if (fullConfig.enableHapticFeedback) {
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    }
    
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        qualityPrioritization: 'quality',
      });
      
      const imageUri = `file://${photo.path}`;
      setCapturedImage(imageUri);
      
      if (fullConfig.enableSkeletonPreview) {
        setShowSkeleton(true);
      }
      
      const data = await extractFromImage(imageUri);
      
      onCapture?.(imageUri, data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Capture failed';
      onError?.(errorMessage);
    } finally {
      setIsCapturing(false);
      hasTriggeredCapture.current = false;
    }
  }, [isCapturing, fullConfig, extractFromImage, onCapture, onError]);
  
  useEffect(() => {
    if (isLocked && !isCapturing && !capturedImage) {
      triggerCapture();
    }
  }, [isLocked, isCapturing, capturedImage, triggerCapture]);
  
  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      
      const result = scanDocument(frame);
      
      runOnJS(setDetectedDocument)(result);
      runOnJS(checkStability)(result);
    },
    [checkStability]
  );
  
  const animatedFrameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: frameScale.value }],
    opacity: overlayOpacity.value,
  }));
  
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission required</Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>No camera device found</Text>
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!capturedImage}
        photo
        video={false}
        audio={false}
        frameProcessor={frameProcessor}
        pixelFormat="yuv"
      />
      
      <Reanimated.View style={[styles.overlayContainer, animatedFrameStyle]}>
        <DocumentOverlay
          detected={detectedDocument}
          isLocked={isLocked}
          lockProgress={lockProgress}
          glowIntensity={glowIntensity}
        />
      </Reanimated.View>
      
      <View style={styles.statusBar}>
        <StatusIndicator
          detected={!!detectedDocument}
          isLocked={isLocked}
          isCapturing={isCapturing}
          confidence={detectedDocument?.confidence ?? 0}
        />
      </View>
      
      {detectedDocument && !isLocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${lockProgress * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>Hold steady</Text>
        </View>
      )}
      
      {showSkeleton && isProcessing && (
        <View style={styles.skeletonOverlay}>
          <ReceiptSkeleton />
        </View>
      )}
      
      <View style={styles.controls}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

interface DocumentOverlayProps {
  detected: DetectedDocument | null;
  isLocked: boolean;
  lockProgress: number;
  glowIntensity: Reanimated.SharedValue<number>;
}

const DocumentOverlay: React.FC<DocumentOverlayProps> = ({
  detected,
  isLocked,
  glowIntensity: _glowIntensity,
}) => {
  const frameWidth = SCREEN_WIDTH * 0.85;
  const frameHeight = SCREEN_HEIGHT * 0.65;
  const frameX = (SCREEN_WIDTH - frameWidth) / 2;
  const frameY = (SCREEN_HEIGHT - frameHeight) / 2;
  
  const cornerLength = 30;
  const cornerWidth = 4;
  const radius = 12;
  
  const frameColor = isLocked ? '#22c55e' : detected ? '#eab308' : 'rgba(255,255,255,0.5)';
  const glowColor = isLocked ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.2)';
  
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Group>
        {isLocked && (
          <RoundedRect
            x={frameX - 8}
            y={frameY - 8}
            width={frameWidth + 16}
            height={frameHeight + 16}
            r={radius + 4}
            color={glowColor}
          />
        )}
        
        <RoundedRect
          x={frameX}
          y={frameY}
          width={frameWidth}
          height={frameHeight}
          r={radius}
          color="transparent"
          style="stroke"
          strokeWidth={2}
        >
        </RoundedRect>
        
        <Line
          p1={vec(frameX, frameY + cornerLength)}
          p2={vec(frameX, frameY)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        <Line
          p1={vec(frameX, frameY)}
          p2={vec(frameX + cornerLength, frameY)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        
        <Line
          p1={vec(frameX + frameWidth - cornerLength, frameY)}
          p2={vec(frameX + frameWidth, frameY)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        <Line
          p1={vec(frameX + frameWidth, frameY)}
          p2={vec(frameX + frameWidth, frameY + cornerLength)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        
        <Line
          p1={vec(frameX + frameWidth, frameY + frameHeight - cornerLength)}
          p2={vec(frameX + frameWidth, frameY + frameHeight)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        <Line
          p1={vec(frameX + frameWidth, frameY + frameHeight)}
          p2={vec(frameX + frameWidth - cornerLength, frameY + frameHeight)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        
        <Line
          p1={vec(frameX + cornerLength, frameY + frameHeight)}
          p2={vec(frameX, frameY + frameHeight)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
        <Line
          p1={vec(frameX, frameY + frameHeight)}
          p2={vec(frameX, frameY + frameHeight - cornerLength)}
          color={frameColor}
          strokeWidth={cornerWidth}
        />
      </Group>
    </Canvas>
  );
};

interface StatusIndicatorProps {
  detected: boolean;
  isLocked: boolean;
  isCapturing: boolean;
  confidence: number;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  detected,
  isLocked,
  isCapturing,
  confidence,
}) => {
  let text = 'Point at receipt';
  let bgColor = 'rgba(0,0,0,0.5)';
  
  if (isCapturing) {
    text = 'Capturing...';
    bgColor = 'rgba(34, 197, 94, 0.9)';
  } else if (isLocked) {
    text = 'Locked!';
    bgColor = 'rgba(34, 197, 94, 0.9)';
  } else if (detected) {
    text = confidence > 0.8 ? 'Detected!' : 'Position...';
    bgColor = confidence > 0.8 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(234, 179, 8, 0.9)';
  }
  
  return (
    <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
      <Text style={styles.statusText}>{text}</Text>
    </View>
  );
};

const ReceiptSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    <View style={[styles.skeletonLine, { width: '60%', height: 20 }]} />
    <View style={[styles.skeletonLine, { width: '40%', height: 14, marginTop: 8 }]} />
    <View style={styles.skeletonDivider} />
    {[1, 2, 3, 4].map((i) => (
      <View key={i} style={styles.skeletonRow}>
        <View style={[styles.skeletonLine, { width: '50%', height: 12 }]} />
        <View style={[styles.skeletonLine, { width: '20%', height: 12 }]} />
      </View>
    ))}
    <View style={styles.skeletonDivider} />
    <View style={styles.skeletonRow}>
      <View style={[styles.skeletonLine, { width: '30%', height: 16 }]} />
      <View style={[styles.skeletonLine, { width: '25%', height: 16, backgroundColor: '#22c55e33' }]} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  statusBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 2,
  },
  progressText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
  controls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 30,
    right: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permissionText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skeletonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  skeletonContainer: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  skeletonLine: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
});

export default InstaScanCamera;
