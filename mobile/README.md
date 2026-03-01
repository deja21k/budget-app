# Budget App - React Native Mobile

Autonomous document scanner with real-time edge detection and GLM-5 OCR extraction.

## Features

- **Real-time Document Detection**: VisionKit (iOS) + ML Kit (Android)
- **Stability Lock**: 500ms threshold for blur-free captures
- **Perspective Transform**: Auto-crop and flatten receipts
- **Skia Overlay**: Dynamic guide frame with color transitions
- **Haptic Feedback**: Pulse on auto-capture
- **GLM-5 OCR**: Structured JSON extraction for merchant/date/total

## Prerequisites

- Node.js 20+
- Xcode 15+ (iOS)
- Android Studio with SDK 34 (Android)
- CocoaPods

## Setup

```bash
# Install dependencies
cd mobile
npm install

# iOS: Install pods
cd ios && pod install && cd ..

# Run on device
npm run ios      # or npm run android
```

## LSP Errors (Expected)

The following LSP errors in native files are **expected** and will resolve after `npm install` + `pod install`:

### iOS (`ios/BudgetApp/*.swift`, `*.mm`, `*.h`)
- `No such module 'UIKit'` - Resolves in Xcode
- `'VisionCamera/FrameProcessorPlugin.h' file not found` - Resolves after pod install

### Android (`android/**/*.java`)
- No expected LSP errors

## Architecture

```
mobile/
├── src/
│   ├── components/
│   │   └── InstaScanCamera.tsx    # Main scanner component
│   ├── hooks/
│   │   ├── useStabilityLock.ts    # 500ms stability detection
│   │   └── useOCRExtraction.ts    # GLM-5 structured output
│   ├── types/
│   │   ├── scanner.ts             # Core types
│   │   └── native-modules.d.ts    # Module declarations
│   └── utils/
│       └── frameProcessor.ts      # Vision Camera plugin
├── ios/
│   └── BudgetApp/
│       ├── DocumentScanner.swift       # VisionKit module
│       ├── DocumentScannerPlugin.swift # Frame processor
│       └── VisionCameraDocumentScanner.mm
└── android/
    └── app/src/main/java/com/budgetapp/scanner/
        ├── DocumentScannerModule.java   # ML Kit module
        └── DocumentScannerPackage.java
```

## Usage

```tsx
import { InstaScanCamera, ReceiptData } from './src';

export function ScannerScreen() {
  const handleCapture = (uri: string, data: ReceiptData | null) => {
    console.log('Scanned:', data?.merchant, data?.total);
  };

  return (
    <InstaScanCamera
      config={{
        stabilityThreshold: 500,  // ms
        captureConfidence: 0.85,
        enableHapticFeedback: true,
        enableSkeletonPreview: true,
      }}
      onCapture={handleCapture}
      onError={(e) => console.error(e)}
      onClose={() => {}}
    />
  );
}
```

## License

MIT
