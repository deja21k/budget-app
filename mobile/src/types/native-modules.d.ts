declare module 'react-native-vision-camera' {
  import { ComponentType, RefObject } from 'react';
  import { ViewStyle } from 'react-native';

  export interface CameraDevice {
    id: string;
    name: string;
    position: 'back' | 'front' | 'external';
    hasFlash: boolean;
    hasTorch: boolean;
  }

  export interface Photo {
    path: string;
    width: number;
    height: number;
    isRawPhoto: boolean;
  }

  export interface TakePhotoOptions {
    flash?: 'on' | 'off' | 'auto';
    qualityPrioritization?: 'speed' | 'balanced' | 'quality';
    enableShutterSound?: boolean;
  }

  export interface CameraProps {
    ref?: RefObject<Camera>;
    style?: ViewStyle;
    device: CameraDevice;
    isActive: boolean;
    photo?: boolean;
    video?: boolean;
    audio?: boolean;
    frameProcessor?: (frame: Frame) => void;
    pixelFormat?: 'yuv' | 'rgb';
  }

  export class Camera {
    static getCameraDevice(position: 'back' | 'front'): CameraDevice | undefined;
    takePhoto(options: TakePhotoOptions): Promise<Photo>;
  }

  export function useCameraDevice(position: 'back' | 'front' | 'external'): CameraDevice | undefined;
  export function useCameraPermission(): { hasPermission: boolean; requestPermission: () => Promise<boolean> };
  export function useFrameProcessor(callback: (frame: Frame) => void, deps: unknown[]): (frame: Frame) => void;

  export interface Frame {
    width: number;
    height: number;
    bytesPerRow: number;
    planesCount: number;
    pixelBuffer: unknown;
    timestamp: number;
    orientation: 'portrait' | 'landscape' | 'portrait-upside-down' | 'landscape-right';
    isValid: boolean;
  }

  export const VisionCameraProxy: {
    getFrameProcessorPlugin(name: string): {
      call(frame: Frame, options?: Record<string, unknown>): unknown;
    } | null;
  };
}

declare module 'react-native-haptic-feedback' {
  export interface HapticFeedbackOptions {
    enableVibrateFallback?: boolean;
    ignoreAndroidSystemSettings?: boolean;
  }

  export default function trigger(
    type: 'selection' | 'impactLight' | 'impactMedium' | 'impactHeavy' | 'notificationSuccess' | 'notificationWarning' | 'notificationError',
    options?: HapticFeedbackOptions
  ): void;
}

declare module '@shopify/react-native-skia' {
  import { ComponentType } from 'react';

  export interface SkiaProps {
    style?: unknown;
  }

  export const Canvas: ComponentType<SkiaProps & { children?: React.ReactNode }>;

  export interface Point {
    x: number;
    y: number;
  }

  export function vec(x: number, y: number): Point;

  export interface GroupProps {
    children?: React.ReactNode;
  }

  export const Group: ComponentType<GroupProps>;

  export interface RoundedRectProps {
    x: number;
    y: number;
    width: number;
    height: number;
    r: number;
    color: string;
    style?: 'fill' | 'stroke';
    strokeWidth?: number;
  }

  export const RoundedRect: ComponentType<RoundedRectProps>;

  export interface LineProps {
    p1: Point;
    p2: Point;
    color: string;
    strokeWidth: number;
  }

  export const Line: ComponentType<LineProps>;

  export function useFont(source: number, size?: number): unknown;
}
