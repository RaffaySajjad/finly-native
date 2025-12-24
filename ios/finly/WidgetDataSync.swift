/**
 * WidgetDataSync Native Module
 * Purpose: Sync widget data from React Native to App Group storage for iOS WidgetKit
 * Uses App Groups to share data between main app and widget extension
 */

import Foundation
import WidgetKit

@objc(WidgetDataSync)
class WidgetDataSync: NSObject {
  
  // App Group identifier - must match widget extension entitlements
  // NOTE: App Groups require a paid Apple Developer account ($99/year)
  private let appGroupIdentifier = "group.com.raffay.finly"
  private let widgetDataKey = "widgetData"
  
  // UserDefaults suite for App Group
  private var sharedDefaults: UserDefaults? {
    return UserDefaults(suiteName: appGroupIdentifier)
  }
  
  /**
   * Sync widget data to App Group storage
   * Called from React Native when financial data changes
   */
  @objc
  func syncWidgetData(_ data: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("[WidgetDebug] ===== syncWidgetData() called =====")
    print("[WidgetDebug] App Group ID: \(appGroupIdentifier)")
    
    guard let sharedDefaults = sharedDefaults else {
      let error = NSError(domain: "WidgetDataSync", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to access App Group"])
      print("[WidgetDebug] ❌ ERROR: Cannot access App Group storage")
      print("[WidgetDebug] NOTE: App Groups require paid Apple Developer account ($99/year)")
      reject("APP_GROUP_ERROR", "Cannot access App Group storage", error)
      return
    }
    
    // Log received data for debugging
    print("[WidgetDebug] Received data: balance=\(data["balance"] ?? "nil"), currencyCode=\(data["currencyCode"] ?? "nil"), currencySymbol=\(data["currencySymbol"] ?? "nil")")
    
    // Store widget data in App Group UserDefaults
    sharedDefaults.set(data, forKey: widgetDataKey)
    
    // Verify data was stored
    if let storedData = sharedDefaults.dictionary(forKey: widgetDataKey) {
      print("[WidgetDebug] ✅ Data stored successfully - Verified: balance=\(storedData["balance"] ?? "nil"), currencyCode=\(storedData["currencyCode"] ?? "nil")")
    } else {
      print("[WidgetDebug] ⚠️ WARNING: Data storage verification failed!")
    }
    
    // Trigger widget timeline reload for immediate update
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "FinlyWidget")
      print("[WidgetDebug] Widget timeline reload triggered for kind: FinlyWidget")
    }
    
    resolve(nil)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
