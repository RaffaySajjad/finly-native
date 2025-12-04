/**
 * FinlyWidgetViews
 * Purpose: SwiftUI views for widget display
 * Supports both small and large widget families
 */

import WidgetKit
import SwiftUI

// Gradient colors matching DashboardScreen
// primary: #4A90E2, primaryDark: #357ABD, primaryLight: #6BA3E8
extension Color {
    static let widgetPrimary = Color(red: 0.29, green: 0.56, blue: 0.89) // #4A90E2
    static let widgetPrimaryDark = Color(red: 0.21, green: 0.48, blue: 0.74) // #357ABD
    static let widgetPrimaryLight = Color(red: 0.42, green: 0.64, blue: 0.91) // #6BA3E8
}

struct FinlyWidgetEntryView: View {
    var entry: FinlyWidgetProvider.Entry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(entry: entry)
        case .systemLarge:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    var entry: FinlyWidgetProvider.Entry
    
    var body: some View {
        VStack(spacing: 12) {
            // Balance
            VStack(spacing: 4) {
                Text("Balance")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.9))
                Text(WidgetDataManager.formatCurrency(entry.balance, symbol: entry.currencySymbol, code: entry.currencyCode))
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
            }
            
            Spacer()
            
            // Add button
            Link(destination: URL(string: "finly://add-transaction")!) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                    Text("Add Transaction")
                        .font(.caption)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.white.opacity(0.2))
                .cornerRadius(8)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.widgetPrimary,
                    Color.widgetPrimaryDark,
                    Color.widgetPrimaryLight
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

struct LargeWidgetView: View {
    var entry: FinlyWidgetProvider.Entry
    
    var body: some View {
        VStack(spacing: 16) {
            // Balance Section
            VStack(spacing: 8) {
                Text("Current Balance")
                    .font(.caption)
                    .foregroundColor(.white.opacity(0.9))
                Text(WidgetDataManager.formatCurrency(entry.balance, symbol: entry.currencySymbol, code: entry.currencyCode))
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.white)
            }
            .padding(.top, 8)
            
            Divider()
                .background(Color.white.opacity(0.3))
            
            // Income and Expenses
            HStack(spacing: 20) {
                // Income
                VStack(spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.down.circle.fill")
                            .foregroundColor(.white.opacity(0.9))
                            .font(.caption)
                        Text("Income")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                    }
                    Text(WidgetDataManager.formatCurrency(entry.monthlyIncome, symbol: entry.currencySymbol, code: entry.currencyCode))
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                
                Divider()
                    .background(Color.white.opacity(0.3))
                    .frame(height: 40)
                
                // Expenses
                VStack(spacing: 6) {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundColor(.white.opacity(0.9))
                            .font(.caption)
                        Text("Expenses")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.9))
                    }
                    Text(WidgetDataManager.formatCurrency(entry.monthlyExpenses, symbol: entry.currencySymbol, code: entry.currencyCode))
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
            }
            .padding(.vertical, 8)
            
            Spacer()
            
            // Add button
            Link(destination: URL(string: "finly://add-transaction")!) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                    Text("Add Transaction")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.2))
                .cornerRadius(10)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .containerBackground(for: .widget) {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.widgetPrimary,
                    Color.widgetPrimaryDark,
                    Color.widgetPrimaryLight
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
}

