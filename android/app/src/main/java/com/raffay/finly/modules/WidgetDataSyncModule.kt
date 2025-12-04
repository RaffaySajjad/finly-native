/**
 * WidgetDataSync Native Module
 * Purpose: Sync widget data from React Native to SharedPreferences for Android App Widgets
 * Uses SharedPreferences to share data between main app and widget
 */

package com.raffay.finly.modules

import android.content.Context
import android.content.SharedPreferences
import android.appwidget.AppWidgetManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReadableMap
import com.raffay.finly.widget.FinlyWidgetProvider

class WidgetDataSyncModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val PREFS_NAME = "finly_widget_prefs"
        private const val WIDGET_DATA_KEY = "widgetData"
    }

    override fun getName(): String {
        return "WidgetDataSync"
    }

    /**
     * Sync widget data to SharedPreferences
     * Called from React Native when financial data changes
     */
    @ReactMethod
    fun syncWidgetData(data: ReadableMap, promise: Promise) {
        try {
            val context = reactApplicationContext
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val editor = prefs.edit()

            // Extract data from ReadableMap
            val balance = if (data.hasKey("balance")) data.getDouble("balance") else 0.0
            val monthlyIncome = if (data.hasKey("monthlyIncome")) data.getDouble("monthlyIncome") else 0.0
            val monthlyExpenses = if (data.hasKey("monthlyExpenses")) data.getDouble("monthlyExpenses") else 0.0
            val currencyCode = if (data.hasKey("currencyCode")) data.getString("currencyCode") else "USD"
            val currencySymbol = if (data.hasKey("currencySymbol")) data.getString("currencySymbol") else "$"
            val lastUpdated = if (data.hasKey("lastUpdated")) data.getString("lastUpdated") else ""

            // Store widget data in SharedPreferences
            editor.putFloat("balance", balance.toFloat())
            editor.putFloat("monthlyIncome", monthlyIncome.toFloat())
            editor.putFloat("monthlyExpenses", monthlyExpenses.toFloat())
            editor.putString("currencyCode", currencyCode)
            editor.putString("currencySymbol", currencySymbol)
            editor.putString("lastUpdated", lastUpdated)
            editor.apply()

            // Trigger widget update
            val appWidgetManager = AppWidgetManager.getInstance(context)
            val widgetIds = appWidgetManager.getAppWidgetIds(
                android.content.ComponentName(context, FinlyWidgetProvider::class.java)
            )
            if (widgetIds.isNotEmpty()) {
                FinlyWidgetProvider.updateAppWidgets(context, appWidgetManager, widgetIds)
            }

            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("WIDGET_SYNC_ERROR", "Failed to sync widget data: ${e.message}", e)
        }
    }
}

