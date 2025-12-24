/**
 * WidgetDataManager
 * Purpose: Manage widget data access from SharedPreferences
 * Used by widget to read data shared by main app
 */

package com.raffay.finly.widget

import android.content.Context
import android.content.SharedPreferences

data class WidgetData(
    val balance: Float,
    val monthlyIncome: Float,
    val monthlyExpenses: Float,
    val currencyCode: String,
    val currencySymbol: String,
    val lastUpdated: String
)

class WidgetDataManager(private val context: Context) {
    companion object {
        private const val PREFS_NAME = "finly_widget_prefs"
        private const val KEY_BALANCE = "balance"
        private const val KEY_MONTHLY_INCOME = "monthlyIncome"
        private const val KEY_MONTHLY_EXPENSES = "monthlyExpenses"
        private const val KEY_CURRENCY_CODE = "currencyCode"
        private const val KEY_CURRENCY_SYMBOL = "currencySymbol"
        private const val KEY_LAST_UPDATED = "lastUpdated"
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Load widget data from SharedPreferences
     */
    fun loadWidgetData(): WidgetData {
        return WidgetData(
            balance = prefs.getFloat(KEY_BALANCE, 0f),
            monthlyIncome = prefs.getFloat(KEY_MONTHLY_INCOME, 0f),
            monthlyExpenses = prefs.getFloat(KEY_MONTHLY_EXPENSES, 0f),
            currencyCode = prefs.getString(KEY_CURRENCY_CODE, "USD") ?: "USD",
            currencySymbol = prefs.getString(KEY_CURRENCY_SYMBOL, "$") ?: "$",
            lastUpdated = prefs.getString(KEY_LAST_UPDATED, "") ?: ""
        )
    }

    /**
     * Format currency amount for display
     */
    fun formatCurrency(amount: Float, symbol: String = "$"): String {
        return "$symbol${String.format("%.2f", amount)}"
    }
}

