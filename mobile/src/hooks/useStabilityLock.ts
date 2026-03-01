import { useCallback, useRef, useState } from 'react';
import type { ScanConfig, DetectedDocument } from '../types/scanner';
import { DEFAULT_SCAN_CONFIG } from '../types/scanner';

interface StabilityState {
  isLocked: boolean;
  lockProgress: number;
  stabilityDuration: number;
}

export function useStabilityLock(config: ScanConfig = DEFAULT_SCAN_CONFIG) {
  const [state, setState] = useState<StabilityState>({
    isLocked: false,
    lockProgress: 0,
    stabilityDuration: 0,
  });
  
  const lastCornersRef = useRef<[[number, number], [number, number], [number, number], [number, number]] | null>(null);
  const stabilityStartRef = useRef<number | null>(null);
  const frameCountRef = useRef(0);
  
  const MOVEMENT_THRESHOLD = 15;
  const MIN_CONFIDENCE = config.captureConfidence;
  
  const checkStability = useCallback(
    (detected: DetectedDocument | null): StabilityState => {
      if (!detected || detected.confidence < MIN_CONFIDENCE) {
        lastCornersRef.current = null;
        stabilityStartRef.current = null;
        frameCountRef.current = 0;
        
        const resetState: StabilityState = {
          isLocked: false,
          lockProgress: 0,
          stabilityDuration: 0,
        };
        setState(resetState);
        return resetState;
      }
      
      const corners = detected.corners;
      const cornersArray: [[number, number], [number, number], [number, number], [number, number]] = [
        [corners[0].x, corners[0].y],
        [corners[1].x, corners[1].y],
        [corners[2].x, corners[2].y],
        [corners[3].x, corners[3].y],
      ];
      
      frameCountRef.current++;
      
      if (lastCornersRef.current) {
        let totalMovement = 0;
        
        for (let i = 0; i < 4; i++) {
          const dx = cornersArray[i][0] - lastCornersRef.current[i][0];
          const dy = cornersArray[i][1] - lastCornersRef.current[i][1];
          totalMovement += Math.sqrt(dx * dx + dy * dy);
        }
        
        const avgMovement = totalMovement / 4;
        
        if (avgMovement < MOVEMENT_THRESHOLD) {
          if (!stabilityStartRef.current) {
            stabilityStartRef.current = Date.now();
          }
          
          const stabilityDuration = Date.now() - stabilityStartRef.current;
          const progress = Math.min(stabilityDuration / config.stabilityThreshold, 1);
          const isLocked = stabilityDuration >= config.stabilityThreshold;
          
          const newState: StabilityState = {
            isLocked,
            lockProgress: progress,
            stabilityDuration,
          };
          
          setState(newState);
          lastCornersRef.current = cornersArray;
          
          return newState;
        } else {
          stabilityStartRef.current = Date.now();
          lastCornersRef.current = cornersArray;
          
          const newState: StabilityState = {
            isLocked: false,
            lockProgress: 0,
            stabilityDuration: 0,
          };
          
          setState(newState);
          return newState;
        }
      }
      
      lastCornersRef.current = cornersArray;
      stabilityStartRef.current = Date.now();
      
      const newState: StabilityState = {
        isLocked: false,
        lockProgress: 0,
        stabilityDuration: 0,
      };
      
      setState(newState);
      return newState;
    },
    [MIN_CONFIDENCE, config.stabilityThreshold]
  );
  
  const reset = useCallback(() => {
    lastCornersRef.current = null;
    stabilityStartRef.current = null;
    frameCountRef.current = 0;
    setState({
      isLocked: false,
      lockProgress: 0,
      stabilityDuration: 0,
    });
  }, []);
  
  return {
    ...state,
    checkStability,
    reset,
  };
}
