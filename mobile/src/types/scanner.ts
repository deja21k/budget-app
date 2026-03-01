export interface Point {
  x: number;
  y: number;
}

export interface DetectedDocument {
  corners: [Point, Point, Point, Point];
  confidence: number;
  isStable: boolean;
  stabilityDuration: number;
}

export interface ProcessedDocument {
  imageUri: string;
  corners: [Point, Point, Point, Point];
  originalWidth: number;
  originalHeight: number;
}

export interface ReceiptData {
  merchant: string;
  date: string;
  total: number;
  items?: ReceiptItem[];
  currency: string;
  confidence: number;
}

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ScanState {
  status: 'idle' | 'detecting' | 'locked' | 'capturing' | 'processing' | 'completed' | 'error';
  detectedDocument: DetectedDocument | null;
  processedDocument: ProcessedDocument | null;
  extractedData: ReceiptData | null;
  error: string | null;
}

export interface ScanConfig {
  stabilityThreshold: number;
  captureConfidence: number;
  enableHapticFeedback: boolean;
  enableSkeletonPreview: boolean;
}

export const DEFAULT_SCAN_CONFIG: ScanConfig = {
  stabilityThreshold: 500,
  captureConfidence: 0.85,
  enableHapticFeedback: true,
  enableSkeletonPreview: true,
};
