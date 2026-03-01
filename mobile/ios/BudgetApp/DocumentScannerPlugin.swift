import Foundation
import Vision
import VisionKit
import UIKit

@objc(DocumentScannerPlugin)
public class DocumentScannerPlugin: NSObject {
  
  static let shared = DocumentScannerPlugin()
  
  private var lastDetectedCorners: [[String: CGFloat]]?
  private var stabilityStartTime: Date?
  
  @objc
  public static func callback(_ frame: Frame, withArguments arguments: [Any]?) -> [String: Any]? {
    return shared.processFrame(frame, withArguments: arguments)
  }
  
  private func processFrame(_ frame: Frame, withArguments arguments: [Any]?) -> [String: Any]? {
    guard let pixelBuffer = frame.pixelBuffer else {
      return noDocumentResult()
    }
    
    let ciImage = CIImage(cvPixelBuffer: pixelBuffer)
    
    let request = VNDetectDocumentSegmentationRequest()
    let handler = VNImageRequestHandler(ciImage: ciImage, options: [:])
    
    do {
      try handler.perform([request])
      
      guard let observation = request.results?.first else {
        return noDocumentResult()
      }
      
      let confidence = observation.confidence
      let corners = extractCorners(from: observation)
      
      let isStable = checkStability(corners: corners)
      let stabilityDuration = getStabilityDuration(isStable: isStable)
      
      return [
        "detected": true,
        "corners": corners,
        "confidence": confidence,
        "isStable": isStable,
        "stabilityDuration": stabilityDuration
      ]
    } catch {
      return noDocumentResult()
    }
  }
  
  private func extractCorners(from observation: VNRectangleObservation) -> [[String: CGFloat]] {
    return [
      ["x": observation.topLeft.x, "y": observation.topLeft.y],
      ["x": observation.topRight.x, "y": observation.topRight.y],
      ["x": observation.bottomRight.x, "y": observation.bottomRight.y],
      ["x": observation.bottomLeft.x, "y": observation.bottomLeft.y]
    ]
  }
  
  private func checkStability(corners: [[String: CGFloat]]) -> Bool {
    let threshold: CGFloat = 0.02
    
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
    guard isStable, let startTime = stabilityStartTime else {
      stabilityStartTime = nil
      return 0
    }
    return Date().timeIntervalSince(startTime) * 1000
  }
  
  private func noDocumentResult() -> [String: Any] {
    lastDetectedCorners = nil
    stabilityStartTime = nil
    return ["detected": false, "corners": [], "confidence": 0, "isStable": false, "stabilityDuration": 0]
  }
}
