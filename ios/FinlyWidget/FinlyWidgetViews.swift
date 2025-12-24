/**
 * FinlyWidgetViews
 * Purpose: SwiftUI views for widget display
 * Supports both small and medium widget families
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
        case .systemMedium:
            LargeWidgetView(entry: entry)
        default:
            SmallWidgetView(entry: entry)
        }
    }
}

struct SmallWidgetView: View {
    var entry: FinlyWidgetProvider.Entry
    
    var body: some View {
        VStack {
            Spacer()
            
            // Quick Actions
            HStack(spacing: 6) {
                // Voice Entry
                Link(destination: URL(string: "finly://voice-transaction")!) {
                    VStack {
                        Image(systemName: "mic.fill")
                            .font(.system(size: 16))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
                
                // Scan Receipt
                Link(destination: URL(string: "finly://scan-receipt")!) {
                    VStack {
                        Image(systemName: "camera.fill")
                            .font(.system(size: 16))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
                
                // Manual Entry
                Link(destination: URL(string: "finly://add-transaction")!) {
                    VStack {
                        Image(systemName: "plus")
                            .font(.system(size: 18, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(8)
                }
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 12)
        }
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
            Spacer()
            
            // Quick Actions
            HStack(spacing: 12) {
                // Voice Entry
                Link(destination: URL(string: "finly://voice-transaction")!) {
                    VStack(spacing: 4) {
                        Image(systemName: "mic.fill")
                            .font(.title3)
                        Text("Voice")
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 60)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(10)
                }
                
                // Scan Receipt
                Link(destination: URL(string: "finly://scan-receipt")!) {
                    VStack(spacing: 4) {
                        Image(systemName: "camera.fill")
                            .font(.title3)
                        Text("Scan")
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 60)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(10)
                }
                
                // Manual Entry
                Link(destination: URL(string: "finly://add-transaction")!) {
                    VStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.title3)
                            .fontWeight(.bold)
                        Text("Add")
                            .font(.caption2)
                            .fontWeight(.medium)
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 60)
                    .background(Color.white.opacity(0.2))
                    .cornerRadius(10)
                }
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

