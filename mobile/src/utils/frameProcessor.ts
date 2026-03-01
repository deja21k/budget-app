import { VisionCameraProxy, Frame } from 'react-native-vision-camera';

interface Point {
  x: number;
  y: number;
}

interface DetectedDocument {
  corners: [Point, Point, Point, Point];
  confidence: number;
  isStable: boolean;
  stabilityDuration: number;
}

const plugin = VisionCameraProxy.getFrameProcessorPlugin('documentScanner');

export function scanDocument(frame: Frame): DetectedDocument | null {
  'worklet';
  
  if (!plugin) {
    return null;
  }
  
  const result = plugin.call(frame) as Record<string, unknown> | null;
  
  if (!result || !result.detected) {
    return null;
  }
  
  return {
    corners: result.corners as [Point, Point, Point, Point],
    confidence: result.confidence as number,
    isStable: result.isStable as boolean,
    stabilityDuration: result.stabilityDuration as number,
  };
}
