export { InstaScanCamera, default } from './components/InstaScanCamera';
export { useStabilityLock } from './hooks/useStabilityLock';
export { useOCRExtraction } from './hooks/useOCRExtraction';
export { scanDocument } from './utils/frameProcessor';
export { DEFAULT_SCAN_CONFIG } from './types/scanner';
export type {
  DetectedDocument,
  ProcessedDocument,
  ReceiptData,
  ReceiptItem,
  ScanState,
  ScanConfig,
  Point,
} from './types/scanner';
