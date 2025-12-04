/**
 * FinlyWidget
 * Purpose: Main widget configuration
 * Defines widget families and configuration
 */

import WidgetKit
import SwiftUI

struct FinlyWidget: Widget {
    let kind: String = "FinlyWidget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: FinlyWidgetProvider()) { entry in
            FinlyWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("Finly Finance")
        .description("View your balance, income, and expenses at a glance.")
        .supportedFamilies([.systemSmall, .systemLarge])
    }
}

