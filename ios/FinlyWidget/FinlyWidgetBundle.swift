/**
 * FinlyWidgetBundle
 * Purpose: Widget bundle entry point
 * Registers all widget types
 */

import WidgetKit
import SwiftUI

@main
struct FinlyWidgetBundle: WidgetBundle {
    var body: some Widget {
        FinlyWidget()
    }
}

