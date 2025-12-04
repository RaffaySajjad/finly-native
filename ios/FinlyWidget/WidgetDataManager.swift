/**
 * WidgetDataManager
 * Purpose: Manage widget data access from App Group storage
 * Used by widget extension to read data shared by main app
 */

import Foundation

struct WidgetData: Codable {
    let balance: Double
    let monthlyIncome: Double
    let monthlyExpenses: Double
    let currencyCode: String
    let currencySymbol: String?
    let lastUpdated: String
}

class WidgetDataManager {
    // App Group identifier - must match main app entitlements
    // NOTE: App Groups require a paid Apple Developer account ($99/year)
    private static let appGroupIdentifier = "group.com.raffay.finly"
    private static let widgetDataKey = "widgetData"
    
    // UserDefaults suite for App Group
    private static var sharedDefaults: UserDefaults? {
        return UserDefaults(suiteName: appGroupIdentifier)
    }
    
    /**
     * Load widget data from App Group storage
     */
    static func loadWidgetData() -> WidgetData? {
        print("[WidgetDataExtension] loadWidgetData() called")
        print("[WidgetDataExtension] App Group ID: \(appGroupIdentifier)")
        
        guard let sharedDefaults = sharedDefaults else {
            print("[WidgetDataExtension] ERROR: Failed to access App Group UserDefaults")
            print("[WidgetDataExtension] NOTE: App Groups require paid Apple Developer account ($99/year)")
            print("[WidgetDataExtension] App Group suite name: \(appGroupIdentifier)")
            return nil
        }
        
        print("[WidgetDataExtension] Successfully accessed App Group UserDefaults")
        
        // Try to read the data
        guard let dataDict = sharedDefaults.dictionary(forKey: widgetDataKey) else {
            print("[WidgetDataExtension] No widget data found in UserDefaults for key: \(widgetDataKey)")
            return nil
        }
        
        print("[WidgetDataExtension] Found data dictionary with keys: \(dataDict.keys.description)")
        
        // Convert dictionary to WidgetData
        // Handle both Double and NSNumber types (UserDefaults may store as NSNumber)
        let balance: Double
        if let balanceValue = dataDict["balance"] as? Double {
            balance = balanceValue
        } else if let balanceNumber = dataDict["balance"] as? NSNumber {
            balance = balanceNumber.doubleValue
        } else {
            print("[WidgetDataExtension] Invalid balance type: \(type(of: dataDict["balance"]))")
            return nil
        }
        
        let monthlyIncome: Double
        if let incomeValue = dataDict["monthlyIncome"] as? Double {
            monthlyIncome = incomeValue
        } else if let incomeNumber = dataDict["monthlyIncome"] as? NSNumber {
            monthlyIncome = incomeNumber.doubleValue
        } else {
            print("[WidgetDataExtension] Invalid monthlyIncome type")
            return nil
        }
        
        let monthlyExpenses: Double
        if let expensesValue = dataDict["monthlyExpenses"] as? Double {
            monthlyExpenses = expensesValue
        } else if let expensesNumber = dataDict["monthlyExpenses"] as? NSNumber {
            monthlyExpenses = expensesNumber.doubleValue
        } else {
            print("[WidgetDataExtension] Invalid monthlyExpenses type")
            return nil
        }
        
        guard let currencyCode = dataDict["currencyCode"] as? String,
              let lastUpdated = dataDict["lastUpdated"] as? String else {
            print("[WidgetDataExtension] Missing currencyCode or lastUpdated")
            return nil
        }
        
        let currencySymbol = dataDict["currencySymbol"] as? String
        
        print("[WidgetDataExtension] ✅ Loaded widget data - Balance: \(balance), Currency: \(currencyCode), Symbol: \(currencySymbol ?? "nil")")
        
        return WidgetData(
            balance: balance,
            monthlyIncome: monthlyIncome,
            monthlyExpenses: monthlyExpenses,
            currencyCode: currencyCode,
            currencySymbol: currencySymbol,
            lastUpdated: lastUpdated
        )
    }
    
    /**
     * Format currency amount for display
     */
    static func formatCurrency(_ amount: Double, symbol: String? = nil, code: String = "USD") -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = code
        formatter.currencySymbol = symbol ?? "$"
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        
        return formatter.string(from: NSNumber(value: amount)) ?? "$0.00"
    }
}

