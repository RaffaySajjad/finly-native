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
  private let appGroupIdentifier = "group.com.raffay.finly"
  private let widgetDataKey = "widgetData"
  
  // UserDefaults suite for App Group
  private var sharedDefaults: UserDefaults? {
    let defaults = UserDefaults(suiteName: appGroupIdentifier)
    if defaults == nil {
      print("[WidgetDebug] ⚠️ CRITICAL: Cannot create UserDefaults with suite name: \(appGroupIdentifier)")
      print("[WidgetDebug] This means App Group is NOT configured correctly!")
      return nil
    }
    
    // Verify we're accessing the App Group, not standard UserDefaults
    // Check if we see system keys (indicates wrong UserDefaults)
    let allKeys = defaults!.dictionaryRepresentation().keys
    let systemKeyCount = allKeys.filter { $0.hasPrefix("AK") || $0.hasPrefix("Apple") || $0.hasPrefix("com.apple") }.count
    
    if systemKeyCount > 10 {
      print("[WidgetDebug] ⚠️ CRITICAL: App Group UserDefaults contains \(systemKeyCount) system keys!")
      print("[WidgetDebug] This means App Group is NOT working - falling back to standard UserDefaults")
      print("[WidgetDebug] App Group ID: \(appGroupIdentifier)")
      print("[WidgetDebug] Total keys: \(allKeys.count)")
      return nil // Don't use this UserDefaults - it's wrong
    } else {
      print("[WidgetDebug] ✅ App Group UserDefaults is correctly isolated (system keys: \(systemKeyCount))")
    }
    
    return defaults
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
      print("[WidgetDebug] App Group suite name: \(appGroupIdentifier)")
      reject("APP_GROUP_ERROR", "Cannot access App Group storage", error)
      return
    }
    
    print("[WidgetDebug] ✅ App Group UserDefaults accessed successfully")
    
    // Log received data for debugging
    print("[WidgetDebug] Received data: balance=\(data["balance"] ?? "nil"), currencyCode=\(data["currencyCode"] ?? "nil"), currencySymbol=\(data["currencySymbol"] ?? "nil")")
    
    // Ensure numeric values are stored correctly
    var processedData: [String: Any] = [:]
    processedData["balance"] = data["balance"]
    processedData["monthlyIncome"] = data["monthlyIncome"]
    processedData["monthlyExpenses"] = data["monthlyExpenses"]
    processedData["currencyCode"] = data["currencyCode"] as? String ?? "USD"
    processedData["currencySymbol"] = data["currencySymbol"] as? String
    processedData["lastUpdated"] = data["lastUpdated"] as? String ?? ISO8601DateFormatter().string(from: Date())
    
    // Verify we're using the correct App Group
    print("[WidgetDebug] App Group ID: \(appGroupIdentifier)")
    print("[WidgetDebug] Storing data with key: \(widgetDataKey)")
    
    // Check what keys exist BEFORE storing
    let keysBefore = sharedDefaults.dictionaryRepresentation().keys
    print("[WidgetDebug] Keys BEFORE storing: \(Array(keysBefore).filter { $0.contains("widget") || $0.contains("data") }.joined(separator: ", "))")
    if Array(keysBefore).filter({ $0.contains("widget") || $0.contains("data") }).isEmpty {
      print("[WidgetDebug] No widget/data keys found before storing")
    }
    
    // Store widget data in App Group UserDefaults
    sharedDefaults.set(processedData, forKey: widgetDataKey)
    sharedDefaults.synchronize() // Force immediate write
    
    // Verify data was stored
    if let storedData = sharedDefaults.dictionary(forKey: widgetDataKey) {
      print("[WidgetDebug] ✅ Data stored successfully - Verified: balance=\(storedData["balance"] ?? "nil"), currencyCode=\(storedData["currencyCode"] ?? "nil")")
      
      // List all keys to verify App Group is correct
      let allKeys = sharedDefaults.dictionaryRepresentation().keys
      let widgetKeys = Array(allKeys).filter { $0.contains("widget") || $0.contains("data") }
      print("[WidgetDebug] Widget/data keys AFTER storing: \(widgetKeys.joined(separator: ", "))")
      print("[WidgetDebug] Total keys in App Group: \(allKeys.count)")
      
      // Verify the key exists
      if widgetKeys.contains(widgetDataKey) {
        print("[WidgetDebug] ✅ Key '\(widgetDataKey)' confirmed in App Group")
      } else {
        print("[WidgetDebug] ⚠️ WARNING: Key '\(widgetDataKey)' NOT found in App Group keys!")
      }
    } else {
      print("[WidgetDebug] ⚠️ WARNING: Data storage verification failed!")
      print("[WidgetDebug] App Group ID: \(appGroupIdentifier)")
      print("[WidgetDebug] Key: \(widgetDataKey)")
      
      // Check what keys ARE in the UserDefaults
      let allKeys = sharedDefaults.dictionaryRepresentation().keys
      print("[WidgetDebug] Available keys: \(Array(allKeys).sorted().joined(separator: ", "))")
    }
    
    // Trigger widget timeline reload for immediate update
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadTimelines(ofKind: "FinlyWidget")
      print("[WidgetDebug] Widget timeline reload triggered for kind: FinlyWidget")
      
      // Also try reloading all timelines as a fallback
      WidgetCenter.shared.reloadAllTimelines()
      print("[WidgetDebug] Reloaded all widget timelines")
    }
    
    resolve(nil)
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}

