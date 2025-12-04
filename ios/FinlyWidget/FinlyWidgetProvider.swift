/**
 * FinlyWidgetProvider
 * Purpose: Timeline provider for WidgetKit widget
 * Provides widget data and update schedule
 */

import WidgetKit
import SwiftUI

struct FinlyWidgetProvider: TimelineProvider {
    typealias Entry = FinlyWidgetEntry
    
    func placeholder(in context: Context) -> FinlyWidgetEntry {
        FinlyWidgetEntry(
            date: Date(),
            balance: 0.0,
            monthlyIncome: 0.0,
            monthlyExpenses: 0.0,
            currencyCode: "USD",
            currencySymbol: "$"
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (FinlyWidgetEntry) -> Void) {
        print("[WidgetDataExtension] getSnapshot() called - isPreview: \(context.isPreview)")
        let entry = makeWidgetEntry()
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<FinlyWidgetEntry>) -> Void) {
        print("[WidgetDataExtension] getTimeline() called - isPreview: \(context.isPreview)")
        let entry = makeWidgetEntry()
        
        // Update every 15 minutes, but also allow immediate refresh
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        print("[WidgetDataExtension] Timeline created with next update at: \(nextUpdate.description)")
        completion(timeline)
    }
    
    private func makeWidgetEntry() -> FinlyWidgetEntry {
        print("[WidgetDataExtension] makeWidgetEntry() called at \(Date().description)")
        let widgetData = WidgetDataManager.loadWidgetData()
        
        if let data = widgetData {
            print("[WidgetDataExtension] ✅ Using loaded data - Balance: \(data.balance), Currency: \(data.currencyCode), Symbol: \(data.currencySymbol ?? "nil")")
            return FinlyWidgetEntry(
                date: Date(),
                balance: data.balance,
                monthlyIncome: data.monthlyIncome,
                monthlyExpenses: data.monthlyExpenses,
                currencyCode: data.currencyCode,
                currencySymbol: data.currencySymbol ?? "$"
            )
        } else {
            print("[WidgetDataExtension] ❌ No widget data found, using defaults")
            return FinlyWidgetEntry(
                date: Date(),
                balance: 0.0,
                monthlyIncome: 0.0,
                monthlyExpenses: 0.0,
                currencyCode: "USD",
                currencySymbol: "$"
            )
        }
    }
}

struct FinlyWidgetEntry: TimelineEntry {
    let date: Date
    let balance: Double
    let monthlyIncome: Double
    let monthlyExpenses: Double
    let currencyCode: String
    let currencySymbol: String
}

