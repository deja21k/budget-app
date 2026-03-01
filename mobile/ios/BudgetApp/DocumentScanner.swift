import Foundation
import Vision
import VisionKit
import UIKit
import CoreImage

@objc(DocumentScanner)
class DocumentScanner: NSObject {
  
  private var lastDetectedCorners: [[String: CGFloat]]?
  private var stabilityStartTime: Date?
  
  @objc
  func detectDocument(_ frameBase64: String,
                      resolver resolve: @escaping RCTPromiseResolveBlock,
                      rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    guard let data = Data(base64Encoded: frameBase64),
          let image = UIImage(data: data) else {
      reject("INVALID_IMAGE", "Could not decode image data", nil)
      return
    }
    
    guard let cgImage = image.cgImage else {
      reject("INVALID_CGIMAGE", "Could not create CGImage", nil)
      return
    }
    
    let request = VNDetectDocumentSegmentationRequest { [weak self] request, error in
      guard let self = self else { return }
      
      if let error = error {
        reject("DETECTION_FAILED", error.localizedDescription, error)
        return
      }
      
      guard let observations = request.results as? [VNRectangleObservation],
            let observation = observations.first else {
        resolve(self.noDocumentResult())
        return
      }
      
      let confidence = observation.confidence
      let corners = self.extractCorners(from: observation, in: cgImage)
      
      let isStable = self.checkStability(corners: corners)
      let stabilityDuration = self.getStabilityDuration(isStable: isStable)
      
      let result: [String: Any] = [
        "detected": true,
        "corners": corners,
        "confidence": confidence,
        "isStable": isStable,
        "stabilityDuration": stabilityDuration
      ]
      
      resolve(result)
    }
    
    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try handler.perform([request])
      } catch {
        reject("REQUEST_FAILED", error.localizedDescription, error)
      }
    }
  }
  
  @objc
  func perspectiveTransform(_ imageUri: String,
                            cornersJson: String,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    guard let cornersData = cornersJson.data(using: .utf8),
          let corners = try? JSONSerialization.jsonObject(with: cornersData) as? [[String: CGFloat]],
          corners.count == 4 else {
      reject("INVALID_CORNERS", "Could not parse corners", nil)
      return
    }
    
    DispatchQueue.global(qos: .userInitiated).async {
      guard let image = self.loadImage(from: imageUri),
            let ciImage = CIImage(image: image) else {
        reject("LOAD_FAILED", "Could not load image", nil)
        return
      }
      
      let topLeft = CGPoint(x: corners[0]["x"] ?? 0, y: corners[0]["y"] ?? 0)
      let topRight = CGPoint(x: corners[1]["x"] ?? 0, y: corners[1]["y"] ?? 0)
      let bottomRight = CGPoint(x: corners[2]["x"] ?? 0, y: corners[2]["y"] ?? 0)
      let bottomLeft = CGPoint(x: corners[3]["x"] ?? 0, y: corners[3]["y"] ?? 0)
      
      guard let filter = CIFilter(name: "CIPerspectiveCorrection") else {
        reject("FILTER_UNAVAILABLE", "Perspective filter not available", nil)
        return
      }
      
      filter.setValue(ciImage, forKey: kCIInputImageKey)
      filter.setValue(CIVector(cgPoint: topLeft), forKey: "inputTopLeft")
      filter.setValue(CIVector(cgPoint: topRight), forKey: "inputTopRight")
      filter.setValue(CIVector(cgPoint: bottomRight), forKey: "inputBottomRight")
      filter.setValue(CIVector(cgPoint: bottomLeft), forKey: "inputBottomLeft")
      
      guard let outputImage = filter.outputImage else {
        reject("FILTER_FAILED", "Could not apply perspective correction", nil)
        return
      }
      
      let context = CIContext()
      guard let cgImage = context.createCGImage(outputImage, from: outputImage.extent) else {
        reject("RENDER_FAILED", "Could not render corrected image", nil)
        return
      }
      
      let outputUri = self.saveImage(UIImage(cgImage: cgImage))
      resolve(["uri": outputUri, "width": cgImage.width, "height": cgImage.height])
    }
  }
  
  @objc
  func getSupportedResolutions(_ resolve: RCTPromiseResolveBlock,
                               rejecter reject: RCTPromiseRejectBlock) {
    resolve(["3840x2160", "1920x1080", "1280x720"])
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  private func extractCorners(from observation: VNRectangleObservation, in image: CGImage) -> [[String: CGFloat]] {
    let width = CGFloat(image.width)
    let height = CGFloat(image.height)
    
    return [
      ["x": observation.topLeft.x * width, "y": (1 - observation.topLeft.y) * height],
      ["x": observation.topRight.x * width, "y": (1 - observation.topRight.y) * height],
      ["x": observation.bottomRight.x * width, "y": (1 - observation.bottomRight.y) * height],
      ["x": observation.bottomLeft.x * width, "y": (1 - observation.bottomLeft.y) * height]
    ]
  }
  
  private func checkStability(corners: [[String: CGFloat]]) -> Bool {
    let threshold: CGFloat = 20.0
    
    if let lastCorners = lastDetectedCorners {
      var totalMovement: CGFloat = 0
      for i in 0..<4 {
        let dx = (corners[i]["x"] ?? 0) - (lastCorners[i]["x"] ?? 0)
        let dy = (corners[i]["y"] ?? 0) - (lastCorners[i]["y"] ?? 0)
        totalMovement += sqrt(dx * dx + dy * dy)
      }
      
      let avgMovement = totalMovement / 4
      lastDetectedCorners = corners
      
      if avgMovement < threshold {
        if stabilityStartTime == nil {
          stabilityStartTime = Date()
        }
        return true
      } else {
        stabilityStartTime = nil
        return false
      }
    }
    
    lastDetectedCorners = corners
    return false
  }
  
  private func getStabilityDuration(isStable: Bool) -> TimeInterval {
    guard isStable, let startTime = stabilityStartTime else { return 0 }
    return Date().timeIntervalSince(startTime) * 1000
  }
  
  private func noDocumentResult() -> [String: Any] {
    lastDetectedCorners = nil
    stabilityStartTime = nil
    return ["detected": false, "corners": [], "confidence": 0, "isStable": false, "stabilityDuration": 0]
  }
  
  private func loadImage(from uri: String) -> UIImage? {
    if uri.hasPrefix("file://") {
      let path = String(uri.dropFirst(7))
      return UIImage(contentsOfFile: path)
    } else if uri.hasPrefix("data:") {
      let base64 = uri.components(separatedBy: ",").last ?? ""
      guard let data = Data(base64Encoded: base64) else { return nil }
      return UIImage(data: data)
    }
    return UIImage(contentsOfFile: uri)
  }
  
  private func saveImage(_ image: UIImage) -> String {
    let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let filePath = documentsPath.appendingPathComponent("scanned_\(Date().timeIntervalSince1970).jpg")
    
    if let data = image.jpegData(compressionQuality: 0.92) {
      try? data.write(to: filePath)
    }
    
    return filePath.absoluteString
  }
}
